// Verificador headless do spike ADR-004.
// Varre a densidade e cronometra o caminho completo da propagação
// (gesto -> modelo -> canvas + código, até depois do paint) com o relógio do
// próprio navegador. Nada aqui é afirmado por inspeção visual.
//
// Saída: resultados/veredito.json + capturas dos cenários-chave.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import os from 'node:os'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const saida = resolve(raiz, 'resultados')
const PORTA = 5299
const BASE = `http://localhost:${PORTA}/`

mkdirSync(saida, { recursive: true })

// --- as barras, declaradas antes de medir -----------------------------------
// Vêm do modelo RAIL e do limiar clássico de Nielsen: resposta a um gesto
// acima de ~100ms deixa de ser sentida como instantânea, e um gesto contínuo
// precisa caber no orçamento de frame. São premissa deste spike, não achado.
const LIMIARES = {
  edicaoMedianaMs: 100,
  edicaoP95Ms: 200,
  teclaMedianaMs: 50,
  fpsMinimo: 50,
}

const CENARIOS = [
  { rotulo: 'flowchart n=25', q: 'tipo=flowchart&n=25' },
  { rotulo: 'flowchart n=50', q: 'tipo=flowchart&n=50' },
  { rotulo: 'flowchart n=100', q: 'tipo=flowchart&n=100', captura: true },
  { rotulo: 'flowchart n=200', q: 'tipo=flowchart&n=200' },
  { rotulo: 'flowchart n=400', q: 'tipo=flowchart&n=400' },
  { rotulo: 'flowchart n=800', q: 'tipo=flowchart&n=800', captura: true },
  { rotulo: 'flowchart n=1600', q: 'tipo=flowchart&n=1600' },
  { rotulo: 'flowchart n=3200', q: 'tipo=flowchart&n=3200', captura: true },
  { rotulo: 'flowchart n=100 SEM memo da projeção', q: 'tipo=flowchart&n=100&memo=0' },
  { rotulo: 'flowchart n=400 SEM memo da projeção', q: 'tipo=flowchart&n=400&memo=0' },
  { rotulo: 'flowchart n=800 SEM memo da projeção', q: 'tipo=flowchart&n=800&memo=0' },
  { rotulo: 'flowchart n=800 + virtualização', q: 'tipo=flowchart&n=800&virt=1', captura: true },
  { rotulo: 'flowchart n=3200 + virtualização', q: 'tipo=flowchart&n=3200&virt=1' },
  { rotulo: 'sequence 4x8 (36 handles)', q: 'tipo=sequence&p=4&m=8' },
  { rotulo: 'sequence 8x25 (208 handles)', q: 'tipo=sequence&p=8&m=25' },
  { rotulo: 'sequence 12x50 (612 handles)', q: 'tipo=sequence&p=12&m=50', captura: true },
  { rotulo: 'sequence 20x100 (2020 handles)', q: 'tipo=sequence&p=20&m=100', captura: true },
]

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

const est = (amostras) => {
  const s = amostras.slice().sort((a, b) => a - b)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return { n: s.length, mediana: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), pior: +s[s.length - 1].toFixed(1) }
}

async function subirServidor() {
  const p = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], {
    cwd: raiz,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('servidor não subiu em 30s')), 30000)
    p.stdout.on('data', (d) => {
      if (String(d).includes(String(PORTA))) {
        clearTimeout(t)
        ok()
      }
    })
    p.stderr.on('data', (d) => process.stderr.write(d))
  })
  await espera(600)
  return p
}

/** Arrasta um elemento por ~800ms, contando frames no próprio navegador. */
async function fpsDeArrasto(page, seletor) {
  const b = await page.locator(seletor).first().boundingBox()
  if (!b) return { fps: 0, erro: `sem boundingBox: ${seletor}` }
  const de = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  await page.mouse.move(de.x, de.y)
  await page.mouse.down()
  await page.evaluate(() => window.__spike.iniciarFps())
  for (let i = 1; i <= 40; i++) {
    await page.mouse.move(de.x + Math.sin(i / 4) * 90, de.y + i * 2)
    await espera(14)
  }
  const r = await page.evaluate(() => window.__spike.pararFps())
  await page.mouse.up()
  await espera(150)
  return r
}

/** Zoom por roda sobre o canvas — o gesto contínuo do bloco "Área de trabalho". */
async function fpsDeZoom(page) {
  await page.mouse.move(700, 450)
  await page.evaluate(() => window.__spike.iniciarFps())
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, i % 2 === 0 ? -120 : 120)
    await espera(16)
  }
  const r = await page.evaluate(() => window.__spike.pararFps())
  await page.evaluate(() => window.__spike.zoomDeTrabalho())
  await espera(150)
  return r
}

async function rodarCenario(page, cenario) {
  await page.goto(`${BASE}?${cenario.q}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.react-flow__node')
  await page.waitForFunction(() => window.__spike?.pronto === true)
  await espera(500)

  const cfg = await page.evaluate(() => window.__spike.cfg)
  const dom = await page.evaluate(() => window.__spike.dom())

  // aquecimento: as 3 primeiras propagações pagam JIT e primeiro layout
  await page.evaluate(async () => {
    for (let k = 0; k < 3; k++) await window.__spike.editar(0)
  })

  const edicao = await page.evaluate(async () => {
    const a = []
    for (let k = 0; k < 12; k++) a.push(await window.__spike.editar(k))
    return a
  })

  // o mesmo gesto sem a espera pelo frame: separa custo de CPU do piso do instrumento
  const sincrono = await page.evaluate(() => {
    const a = []
    for (let k = 0; k < 12; k++) a.push(window.__spike.editarSincrono(k))
    return a
  })

  const criar = await page.evaluate(async () => {
    const a = []
    for (let k = 0; k < 8; k++) a.push(await window.__spike.criar())
    return a
  })

  const teclas = await page.evaluate(() => window.__spike.digitar(1, 20))
  const serializacao = await page.evaluate(() => window.__spike.serializacao())

  const seletorArrasto = cfg.tipo === 'flowchart' ? '.caixa' : '.participante-caixa'
  const fpsArrasto = await fpsDeArrasto(page, seletorArrasto)
  const fpsZoom = await fpsDeZoom(page)

  // pior caso de pintura: "ajustar o diagrama à tela"
  const ajustarATela = await page.evaluate(() => window.__spike.ajustarATela())
  await page.evaluate(() => window.__spike.zoomDeTrabalho())
  await espera(200)

  // sanidade: a medição mediu mesmo? O texto editado tem que estar no DOM E no
  // código projetado — senão o número acima não vale nada.
  const sanidade = await page.evaluate(async () => {
    const marca = `sonda-${Math.round(performance.now())}`
    await window.__spike.editar(0)
    const dom = document.body.textContent.includes('editado 0-')
    const codigo = window.__spike.codigoContem('editado 0-')
    return { marca, chegouNoCanvas: dom, chegouNoCodigo: codigo, posicaoVazou: window.__spike.posicaoVazou() }
  })

  const longas = await page.evaluate(() => window.__spike.tarefasLongas.slice())

  if (cenario.captura) {
    await page.screenshot({ path: `${saida}/${cenario.q.replace(/[=&]/g, '-')}.png` })
  }

  const e = est(edicao)
  const t = est(teclas)
  const c = est(criar)
  const motivos = []
  if (e.mediana > LIMIARES.edicaoMedianaMs) motivos.push(`edição mediana ${e.mediana}ms > ${LIMIARES.edicaoMedianaMs}ms`)
  if (e.p95 > LIMIARES.edicaoP95Ms) motivos.push(`edição p95 ${e.p95}ms > ${LIMIARES.edicaoP95Ms}ms`)
  if (t.mediana > LIMIARES.teclaMedianaMs) motivos.push(`tecla mediana ${t.mediana}ms > ${LIMIARES.teclaMedianaMs}ms`)
  if (fpsArrasto.fps < LIMIARES.fpsMinimo) motivos.push(`arrasto ${fpsArrasto.fps}fps < ${LIMIARES.fpsMinimo}fps`)
  if (!sanidade.chegouNoCanvas || !sanidade.chegouNoCodigo) motivos.push('MEDIÇÃO INVÁLIDA: a edição não chegou às duas vistas')

  const r = {
    rotulo: cenario.rotulo,
    cfg,
    dom,
    edicao: e,
    edicaoSincronaMs: {
      js: est(sincrono.map((s) => s.js)),
      layout: est(sincrono.map((s) => s.layout)),
      total: est(sincrono.map((s) => s.total)),
    },
    criarElemento: c,
    tecla: t,
    serializacaoMs: est(serializacao),
    fpsArrasto,
    fpsZoom,
    ajustarATelaMs: +ajustarATela.toFixed(1),
    tarefasLongasMs: longas,
    sanidade,
    passa: motivos.length === 0,
    motivos,
  }

  console.log(
    `${r.passa ? '  OK ' : 'REPROVA'} · ${cenario.rotulo}\n` +
      `        dom: ${dom.nos} nós, ${dom.arestas} arestas, ${dom.handles} handles, ${dom.elementos} elementos\n` +
      `        edição até o paint: mediana ${e.mediana}ms · p95 ${e.p95}ms · pior ${e.pior}ms\n` +
      `        edição, só trabalho: ${r.edicaoSincronaMs.total.mediana}ms (js ${r.edicaoSincronaMs.js.mediana} + layout ${r.edicaoSincronaMs.layout.mediana})\n` +
      `        tecla: mediana ${t.mediana}ms · criar: mediana ${c.mediana}ms · fitView: ${r.ajustarATelaMs}ms\n` +
      `        arrasto: ${fpsArrasto.fps}fps (pior frame ${fpsArrasto.piorFrame}ms) · zoom: ${fpsZoom.fps}fps\n` +
      `        serializar: mediana ${r.serializacaoMs.mediana}ms` +
      (motivos.length ? `\n        motivos: ${motivos.join(' · ')}` : ''),
  )
  return r
}

const servidor = await subirServidor()
const navegador = await chromium.launch()
const page = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.error('ERRO NA PÁGINA:', e.message))
page.on('console', (m) => m.type() === 'error' && console.error('CONSOLE:', m.text()))

const cenarios = []
try {
  for (const c of CENARIOS) cenarios.push(await rodarCenario(page, c))

  const flowchart = cenarios.filter((c) => c.cfg.tipo === 'flowchart' && c.cfg.memo && !c.cfg.virt)
  const teto = flowchart.filter((c) => c.passa).map((c) => c.cfg.n)

  const veredito = {
    pergunta:
      'O desenho modelo-como-fonte sobre React Flow sustenta a promessa do discovery — "a mudança aparece no diagrama e no código sem espera perceptível" e "diagrama grande continua fluido" — na densidade de uma sessão da Marina? Onde fica o teto?',
    lib: '@xyflow/react 12.11.2',
    limiares: LIMIARES,
    ambiente: {
      navegador: navegador.version(),
      plataforma: `${os.type()} ${os.release()}`,
      cpus: os.cpus().length,
      modeloCpu: os.cpus()[0]?.model,
      memoriaGb: +(os.totalmem() / 1024 ** 3).toFixed(1),
      viewport: '1440x900',
      observacao:
        'Chromium headless em WSL2, sem aceleração de GPU. Números absolutos são desta máquina; o que o spike lê é a CURVA contra a densidade e a ordem de grandeza.',
    },
    tetoQuePassa: teto.length ? Math.max(...teto) : null,
    cenarios,
  }
  writeFileSync(`${saida}/veredito.json`, JSON.stringify(veredito, null, 2))
  console.log(
    `\n${cenarios.filter((c) => c.passa).length}/${cenarios.length} cenários dentro das barras` +
      `\nteto do flowchart (memo, sem virtualização): ${veredito.tetoQuePassa ?? 'nenhuma densidade passou'} nós`,
  )
} catch (e) {
  console.error('\nQUEBROU:', e.message)
  await page.screenshot({ path: `${saida}/erro.png` }).catch(() => {})
  writeFileSync(`${saida}/veredito.json`, JSON.stringify({ erro: e.message, cenarios }, null, 2))
  process.exitCode = 1
} finally {
  await navegador.close()
  servidor.kill('SIGTERM')
}
