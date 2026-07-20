// Verificador headless do spike ADR-002.
// Não afirma nada por inspeção visual: executa os gestos com mouse real no
// Chromium e lê o modelo interno (window.__spike.modelo) depois de cada um.
// Saída: resultados/veredito.json + capturas de tela.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const saida = resolve(raiz, 'resultados')
const URL_BASE = 'http://localhost:5199/'

mkdirSync(saida, { recursive: true })

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const resultados = []

function registrar(gesto, ok, detalhe, atritos = [], callbacks = null) {
  resultados.push({ gesto, ok, detalhe, callbacksDaLib: callbacks, atritos })
  console.log(`${ok ? '  OK ' : ' FALHA'} · ${gesto} — ${detalhe}`)
  if (callbacks) console.log(`        lib: ${callbacks}`)
}

async function subirServidor() {
  const p = spawn('npx', ['vite', 'preview', '--port', '5199', '--strictPort'], {
    cwd: raiz,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('servidor não subiu em 30s')), 30000)
    p.stdout.on('data', (d) => {
      if (String(d).includes('5199')) {
        clearTimeout(t)
        ok()
      }
    })
    p.stderr.on('data', (d) => process.stderr.write(d))
  })
  await espera(600)
  return p
}

const modelo = (page) => page.evaluate(() => window.__spike.modelo)
const ordem = (page) => page.evaluate(() => window.__spike.ordem)
const diario = async (page) => {
  const d = await page.evaluate(() => {
    const d = window.__spike.diario ?? []
    window.__spike.diario = []
    return d
  })
  return d.map((e) => `${e.evento}(${e.detalhe})`).join(' · ') || 'nenhum callback da lib disparou'
}

async function caixa(page, sel) {
  const b = await page.locator(sel).first().boundingBox()
  if (!b) throw new Error(`sem boundingBox: ${sel}`)
  return { ...b, x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

async function arrastar(page, de, para, passos = 30) {
  await page.mouse.move(de.x, de.y)
  await espera(60)
  await page.mouse.down()
  for (let i = 1; i <= passos; i++) {
    await page.mouse.move(
      de.x + ((para.x - de.x) * i) / passos,
      de.y + ((para.y - de.y) * i) / passos,
    )
    await espera(8)
  }
  await espera(80)
  await page.mouse.up()
  await espera(250)
}

const servidor = await subirServidor()
const navegador = await chromium.launch()
const page = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.error('ERRO NA PÁGINA:', e.message))
page.on('console', (m) => m.type() === 'error' && console.error('CONSOLE:', m.text()))

try {
  await page.goto(URL_BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('.react-flow__node')
  await espera(700)

  // ---------- 1. RENDERIZAR ----------
  await page.screenshot({ path: `${saida}/01-render-inicial.png`, fullPage: false })
  const render = await page.evaluate(() => ({
    participantes: document.querySelectorAll('.participante-caixa').length,
    lifelines: document.querySelectorAll('.lifeline').length,
    mensagens: document.querySelectorAll('.rotulo').length,
    ativacoes: document.querySelectorAll('.ativacao').length,
    fragmentos: document.querySelectorAll('.fragmento').length,
    arestas: document.querySelectorAll('.react-flow__edge').length,
  }))
  const okRender =
    render.participantes === 4 &&
    render.lifelines === 4 &&
    render.mensagens === 6 &&
    render.ativacoes === 3 &&
    render.fragmentos === 2
  registrar(
    'renderizar — participante+lifeline, mensagem ordenada, ativação, fragmento alt/loop',
    okRender,
    JSON.stringify(render),
    okRender
      ? [
          'ponta de seta desenhada à mão: markerEnd da lib não acompanha caminho customizado',
          'auto-mensagem (from==to) exige caminho próprio: a lib degenera source==target no mesmo handle',
          'fragmento alt/loop não é primitiva: virou nó decorativo com zIndex negativo e pointer-events none',
        ]
      : ['contagem de elementos não bateu'],
  )

  // ---------- 2. CRIAR MENSAGEM ----------
  const antesCriar = (await modelo(page)).messages.length
  const ancora = await caixa(page, '.react-flow__node[data-id="p1"] [data-handleid="linha-2"]')
  const alvoP4 = await caixa(page, '.react-flow__node[data-id="p4"] [data-handleid="linha-2"]')
  await arrastar(page, ancora, alvoP4)
  const depoisCriar = await modelo(page)
  const criada = depoisCriar.messages[2]
  const okCriar =
    depoisCriar.messages.length === antesCriar + 1 &&
    criada?.from === 'p1' &&
    criada?.to === 'p4' &&
    criada?.label === 'nova mensagem'
  await page.screenshot({ path: `${saida}/02-criar-mensagem.png` })
  registrar(
    'criar mensagem — arrastar da âncora de instante para outro participante',
    okCriar,
    `${antesCriar} -> ${depoisCriar.messages.length} mensagens; instante 3 = ${criada?.from}->${criada?.to}`,
    okCriar
      ? [
          'a lib entrega o gesto (onConnect) e a validação; o instante teve que ser codificado no id do handle (linha-N)',
          'um handle por instante por participante: N participantes x M mensagens de handles no DOM',
        ]
      : ['onConnect não produziu a mensagem esperada'],
    await diario(page),
  )

  // ---------- 3. REORDENAR NO TEMPO ----------
  const antesOrdem = await ordem(page)
  const rotulo = await caixa(page, '[data-testid="mensagem-m5"]')
  const zoom = await page.evaluate(
    () => +getComputedStyle(document.querySelector('.react-flow__viewport')).transform.split(',')[0].replace('matrix(', ''),
  )
  const quemRecebe = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y)
    return el ? `${el.tagName}.${el.getAttribute('class')}` : 'nada'
  }, [rotulo.x, rotulo.y])
  await arrastar(page, rotulo, { x: rotulo.x, y: rotulo.y - 64 * 2 * zoom })
  const depoisOrdem = await ordem(page)
  const idxM5 = (await modelo(page)).messages.findIndex((m) => m.id === 'm5')
  const okOrdem = idxM5 >= 0 && idxM5 < antesOrdem.findIndex((s) => s.includes('render(modelo)'))
  await page.screenshot({ path: `${saida}/03-reordenar-tempo.png` })
  registrar(
    'reordenar no tempo — arrastar o rótulo da mensagem na vertical',
    okOrdem,
    `m5 -> instante ${idxM5 + 1}; ponteiro no centro do rótulo atinge ${quemRecebe}; ordem: ${depoisOrdem.join(' | ')}`,
    [
      'GESTO NÃO NATIVO: no vocabulário da lib aresta não tem posição, então não há drag de aresta',
      'implementado à mão sobre EdgeLabelRenderer: pointer capture, delta de tela / zoom, snap ao passo de linha',
      'reordenar mensagem obriga a remapear índices de ativação e fragmento — a engine não sabe da existência deles',
    ],
    await diario(page),
  )

  // ---------- 4. RECONECTAR DESTINO ----------
  const antesRec = (await modelo(page)).messages.find((m) => m.id === 'm1')
  const arestaM1 = page.locator('.react-flow__edge[data-id="m1"]')
  await arestaM1.hover({ position: { x: 2, y: 2 } }).catch(() => {})
  const anchor = await caixa(page, '.react-flow__edge[data-id="m1"] .react-flow__edgeupdater-target')
  const idxM1 = (await modelo(page)).messages.findIndex((m) => m.id === 'm1')
  const destino = await caixa(page, `.react-flow__node[data-id="p3"] [data-handleid="linha-${idxM1}"]`)
  await arrastar(page, anchor, destino)
  const depoisRec = (await modelo(page)).messages.find((m) => m.id === 'm1')
  const okRec = depoisRec?.to === 'p3' && antesRec?.to === 'p2'
  await page.screenshot({ path: `${saida}/04-reconectar-destino.png` })
  registrar(
    'reconectar destino — arrastar a ponta da seta para outro participante',
    okRec,
    `m1.to: ${antesRec?.to} -> ${depoisRec?.to}`,
    okRec
      ? ['gesto nativo da lib (onReconnect + reconnectable); só o mapeamento para o modelo é código próprio']
      : ['onReconnect não alterou o destino'],
    await diario(page),
  )

  // ---------- 5. TROCAR COLUNA DO PARTICIPANTE ----------
  const antesCols = (await modelo(page)).participants.map((p) => p.id).join(',')
  const p4 = await caixa(page, '.react-flow__node[data-id="p4"] .participante-caixa')
  const p2 = await caixa(page, '.react-flow__node[data-id="p2"] .participante-caixa')
  await arrastar(page, p4, { x: p2.x, y: p2.y })
  const depoisCols = (await modelo(page)).participants.map((p) => p.id).join(',')
  const posAntes = antesCols.split(',').indexOf('p4')
  const posDepois = depoisCols.split(',').indexOf('p4')
  const okCols = posDepois === antesCols.split(',').indexOf('p2') && posDepois !== posAntes
  await page.screenshot({ path: `${saida}/05-trocar-coluna.png` })
  registrar(
    'trocar coluna do participante — arrastar a caixa na horizontal',
    okCols,
    `${antesCols} -> ${depoisCols}`,
    [
      'drag de nó é nativo, mas em 2D: travar o eixo Y exigiu filtrar os changes na mão',
      'a lib move o nó livremente; virar índice de coluna é snap próprio no onNodeDragStop',
    ],
    await diario(page),
  )

  // ---------- fecho ----------
  const modeloFinal = await modelo(page)
  const semCoordenada =
    !JSON.stringify(modeloFinal).includes('"x"') && !JSON.stringify(modeloFinal).includes('"y"')
  registrar(
    'modelo interno sem coordenada — a verdade continua sendo ordem, não posição',
    semCoordenada,
    semCoordenada
      ? 'nenhum campo x/y vazou para o modelo depois de 4 gestos'
      : 'coordenada vazou para o modelo',
    ['a coordenada vive só na derivação; a engine nunca é fonte da verdade'],
  )

  const veredito = {
    pergunta:
      'O tipo Sequence cabe no vocabulário nó/aresta do React Flow — renderizando (participante com lifeline, mensagem ordenada, ativação, fragmento alt/loop) e editando (criar mensagem, reordenar no tempo, reconectar destino)?',
    lib: '@xyflow/react 12.11.2',
    executadoEm: 'chromium headless (playwright 1.61.1), 1440x900',
    gestos: resultados,
    aprovados: resultados.filter((r) => r.ok).length,
    total: resultados.length,
  }
  writeFileSync(`${saida}/veredito.json`, JSON.stringify(veredito, null, 2))
  console.log(`\n${veredito.aprovados}/${veredito.total} verificações passaram`)
  process.exitCode = veredito.aprovados === veredito.total ? 0 : 1
} catch (e) {
  console.error('\nQUEBROU:', e.message)
  await page.screenshot({ path: `${saida}/erro.png` }).catch(() => {})
  writeFileSync(
    `${saida}/veredito.json`,
    JSON.stringify({ erro: e.message, gestos: resultados }, null, 2),
  )
  process.exitCode = 1
} finally {
  await navegador.close()
  servidor.kill('SIGTERM')
}
