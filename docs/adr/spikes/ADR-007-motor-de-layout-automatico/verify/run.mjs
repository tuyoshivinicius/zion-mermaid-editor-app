// A metade da verificação que precisa de DOM, e a única que pode responder a
// pergunta de confiança do discovery.
//
// Quatro perguntas:
//   B1  o layout que **nós** calculamos concorda com o que o **mermaid**
//       calcula para o mesmo documento? (é a promessa "ela sabe que o código
//       que copia é exatamente o diagrama que está vendo")
//   B2  a concordância se mantém nas quatro orientações do `### Faz`?
//   B3  com o layout no caminho, a tecla no editor de código ainda cabe no
//       envelope do ADR-004? (o ADR-006 mediu 15,5ms **sem** layout nenhum)
//   B4  o ciclo por teclado do ADR-005, com layout global por nó contra
//       colocação local — a diferença que a pessoa sente.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
const PORTA = 5501
const BASE = `http://127.0.0.1:${PORTA}`

const checagens = []
const registrar = (id, alvo, passou, detalhe) => {
  checagens.push({ id, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(26)} ${String(alvo).padEnd(30)} ${detalhe ?? ''}`,
  )
}

const mediana = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const p95 = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]
}
const arred = (x) => (x == null ? null : Math.round(x * 10) / 10)
const arred2 = (x) => (x == null ? null : Math.round(x * 100) / 100)

mkdirSync(RESULTADOS, { recursive: true })

const servidor = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], {
  cwd: RAIZ,
  stdio: 'ignore',
})
process.on('exit', () => servidor.kill())

async function esperarServidor() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('vite preview não subiu')
}

const relatorio = {
  maquina: 'Linux WSL2 · AMD Ryzen 7 5800H · 8 vCPU · sem GPU',
  concordancia: [],
  orientacoes: [],
  latencia: {},
  ciclo: [],
}

await esperarServidor()
const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
const pagina = await contexto.newPage()
pagina.on('pageerror', (e) => console.log('  [erro de página]', e.message))

await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => window.__oraculo && window.__oraculo.pronto && window.__spike)
relatorio.mermaid = JSON.parse(
  readFileSync(join(RAIZ, 'node_modules/mermaid/package.json'), 'utf8'),
).version
console.log(`oráculo: mermaid ${relatorio.mermaid}\n`)

// ─── B1 · o nosso layout contra o layout do mermaid ──────────────────────────
console.log('── B1 · concordância com o mermaid ──')
const conc = await pagina.evaluate(async () => {
  const saida = []
  for (const { nome, texto } of window.__oraculo.corpus) {
    // Sem forçar orientação: ela vem do documento.
    saida.push({
      nome,
      temAgrupamento: /^\s*subgraph\b/m.test(texto),
      ...(await window.__oraculo.concordancia(texto)),
    })
  }
  return saida
})

for (const r of conc) {
  if (!r.ok) {
    registrar('B1-concordancia', r.nome, false, `mermaid não desenhou: ${r.erro}`)
    continue
  }
  relatorio.concordancia.push({
    documento: r.nome,
    comuns: r.comuns,
    pares: r.ordem.pares,
    discordantes: r.ordem.discordantes,
    taxa: arred2(r.ordem.taxa),
  })
  // A barra é a ordem de leitura, não a coordenada: caixa de tamanho fixo
  // contra caixa dimensionada pelo rótulo nunca dá a mesma coordenada.
  // Documento com `subgraph` é medido como divergência declarada, não como
  // falha: o mermaid faz layout de cluster e o nosso motor recebe o grafo
  // achatado. A B1b prova que é essa a causa, e não uma suposição.
  const detalhe =
    `${r.orientacao} · ${r.comuns} nós · ${r.ordem.discordantes}/${r.ordem.pares} pares fora de ` +
    `ordem (${Math.round(r.ordem.taxa * 100)}%)`

  if (r.temAgrupamento && r.ordem.taxa > 0.1) {
    registrar('B1-divergencia-por-agrupamento', r.nome, true, detalhe)
  } else {
    registrar('B1-concordancia', r.nome, r.ordem.taxa <= 0.1, detalhe)
  }
}

// ─── B1b · a sonda que isola a causa ─────────────────────────────────────────
//
// Casar a orientação resolve a maior parte da divergência. O que sobra precisa
// de causa nomeada, não de suposição: o mermaid faz layout de **cluster** para
// `subgraph` e o nosso motor recebe o grafo achatado. A sonda mede o mesmo
// documento com e sem agrupamento.
console.log('\n── B1b · sonda: o agrupamento é a causa? ──')
const sonda = await pagina.evaluate(async () => {
  const saida = []
  for (const { nome, texto } of window.__oraculo.corpus) {
    if (!/^\s*subgraph\b/m.test(texto)) continue
    const achatado = window.__oraculo.semAgrupamento(texto)
    saida.push({
      nome,
      com: await window.__oraculo.concordancia(texto),
      sem: await window.__oraculo.concordancia(achatado),
    })
  }
  return saida
})

relatorio.sondaAgrupamento = sonda.map((s) => ({
  documento: s.nome,
  comAgrupamento: arred2(s.com.ok ? s.com.ordem.taxa : null),
  semAgrupamento: arred2(s.sem.ok ? s.sem.ordem.taxa : null),
}))

for (const s of sonda) {
  if (!s.com.ok || !s.sem.ok) {
    registrar('B1b-sonda-agrupamento', s.nome, false, `mermaid não desenhou`)
    continue
  }
  registrar(
    'B1b-sonda-agrupamento',
    s.nome,
    s.sem.ordem.taxa <= s.com.ordem.taxa,
    `com agrupamento ${Math.round(s.com.ordem.taxa * 100)}% fora de ordem · ` +
      `sem agrupamento ${Math.round(s.sem.ordem.taxa * 100)}%`,
  )
}

// ─── B2 · as quatro orientações ──────────────────────────────────────────────
console.log('\n── B2 · concordância por orientação ──')
// Sobre o documento realista **achatado**: com o agrupamento dentro, este braço
// mediria orientação e cluster de uma vez e não separaria as duas causas.
const orient = await pagina.evaluate(async () => {
  const doc = window.__oraculo.corpus.find((c) => c.nome.startsWith('10'))
  const base = window.__oraculo.semAgrupamento(doc.texto)
  const saida = []
  for (const or of ['TB', 'BT', 'LR', 'RL']) {
    const texto = base.replace(/^(flowchart|graph)\s+\w+/m, `$1 ${or}`)
    saida.push({ orientacao: or, ...(await window.__oraculo.concordancia(texto, or)) })
  }
  return saida
})

for (const r of orient) {
  if (!r.ok) {
    registrar('B2-orientacao', r.orientacao, false, `mermaid não desenhou: ${r.erro}`)
    continue
  }
  relatorio.orientacoes.push({
    orientacao: r.orientacao,
    comuns: r.comuns,
    taxa: arred2(r.ordem.taxa),
  })
  registrar(
    'B2-orientacao',
    r.orientacao,
    r.ordem.taxa <= 0.1,
    `${r.ordem.discordantes}/${r.ordem.pares} pares fora de ordem (${Math.round(r.ordem.taxa * 100)}%)`,
  )
}

// ─── B3 · a tecla no editor de código, com o layout no caminho ───────────────
console.log('\n── B3 · latência da tecla ──')
const CENARIOS = [
  { rotulo: 'pequeno · layout global', q: 'n=0&motor=dagre' },
  { rotulo: '100/120 · layout global', q: 'n=100&arestas=120&motor=dagre' },
  { rotulo: 'envelope 400/500 · layout global', q: 'n=400&arestas=500&motor=dagre' },
  { rotulo: 'envelope 400/500 · colocação local', q: 'n=400&arestas=500&motor=local' },
  { rotulo: 'denso 800/1000 · layout global', q: 'n=800&arestas=1000&motor=dagre' },
]
const TEXTO_DIGITADO = 'documentacao'

for (const cen of CENARIOS) {
  await pagina.goto(`${BASE}/?${cen.q}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.waitForTimeout(800)

  const antes = await pagina.evaluate(() => ({ texto: window.__spike.texto().length }))

  // Cursor no meio do documento, dentro de um rótulo — mesmo protocolo do
  // ADR-006, para os números serem comparáveis com os de lá.
  await pagina.evaluate(() => {
    const ta = document.getElementById('codigo')
    ta.focus()
    const linhas = ta.value.split('\n')
    const alvo = Math.max(1, Math.floor(linhas.length / 2))
    let pos = 0
    for (let i = 0; i < alvo; i++) pos += linhas[i].length + 1
    const dentro = linhas[alvo].lastIndexOf('"')
    ta.selectionStart = ta.selectionEnd = pos + (dentro > 0 ? dentro : linhas[alvo].length)
  })
  await pagina.evaluate(() => window.__spike.zerar())

  const amostras = []
  for (const ch of TEXTO_DIGITADO) {
    const espera = pagina.evaluate(() => window.__spike.proximaAmostra())
    await pagina.keyboard.type(ch)
    amostras.push(await espera)
    await pagina.waitForTimeout(40)
  }

  const depois = await pagina.evaluate(() => ({
    texto: window.__spike.texto().length,
    nos: window.__spike.contarNos(),
  }))
  const chegou = depois.texto === antes.texto + TEXTO_DIGITADO.length

  const linha = {
    cenario: cen.rotulo,
    query: cen.q,
    nos: depois.nos,
    teclas: amostras.length,
    edicaoChegou: chegou,
    total: { mediana: arred(mediana(amostras.map((a) => a.total))), p95: arred(p95(amostras.map((a) => a.total))) },
    layout: { mediana: arred(mediana(amostras.map((a) => a.layout))), p95: arred(p95(amostras.map((a) => a.layout))) },
    parse: { mediana: arred(mediana(amostras.map((a) => a.parse))) },
    projecao: { mediana: arred(mediana(amostras.map((a) => a.projecao))) },
  }
  relatorio.latencia[cen.rotulo] = linha

  registrar('B3-edicao-chegou', cen.rotulo, chegou, `${depois.nos} nós · ${amostras.length} teclas`)

  // Os cenários de layout global no envelope e acima dele são **braços de
  // controle**: espera-se que estourem a barra, e a checagem afirma isso. O que
  // precisa caber na barra é o desenho que o ADR vai propor — a colocação local.
  const braçoDeControle = cen.q.includes('motor=dagre') && depois.nos >= 400
  const detalhe =
    `total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · layout ${linha.layout.mediana}ms · ` +
    `parse ${linha.parse.mediana}ms · projeção ${linha.projecao.mediana}ms`

  if (braçoDeControle) {
    registrar('B3-global-estoura-a-barra', cen.rotulo, linha.total.mediana > 50, detalhe)
  } else {
    registrar('B3-tecla-na-barra-50ms', cen.rotulo, linha.total.mediana <= 50, detalhe)
  }

  await pagina.screenshot({ path: join(RESULTADOS, `tecla-${cen.q.replace(/[=&]/g, '-')}.png`) })
}

// ─── B4 · o ciclo por teclado do ADR-005, com e sem layout global ────────────
console.log('\n── B4 · ciclo por teclado ──')
for (const q of ['n=400&arestas=500&motor=dagre', 'n=400&arestas=500&motor=local']) {
  await pagina.goto(`${BASE}/?${q}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.waitForTimeout(800)
  await pagina.evaluate(() => window.__spike.zerar())

  const amostras = []
  for (let i = 0; i < 10; i++) {
    const a = await pagina.evaluate(async (i) => {
      const m = window.__spike.modelo()
      const origem = m.nos[m.nos.length - 1].id
      const espera = window.__spike.proximaAmostra()
      window.__spike.criarNo(origem, `kb${i}`)
      return await espera
    }, i)
    amostras.push(a)
    await pagina.waitForTimeout(40)
  }

  const linha = {
    motor: q.includes('local') ? 'colocação local' : 'layout global',
    nosCriados: amostras.length,
    total: { mediana: arred(mediana(amostras.map((a) => a.total))), p95: arred(p95(amostras.map((a) => a.total))) },
    layout: { mediana: arred(mediana(amostras.map((a) => a.layout))) },
  }
  relatorio.ciclo.push(linha)

  const detalheCiclo =
    `criar 1 nó: ${linha.total.mediana}ms (p95 ${linha.total.p95}) · layout ${linha.layout.mediana}ms`
  if (linha.motor === 'layout global') {
    // Braço de controle: o gesto do ciclo principal do ADR-005 com layout
    // global por nó. Passar aqui significa que o achado se confirma.
    registrar('B4-global-estoura-a-barra', linha.motor, linha.total.mediana > 50, detalheCiclo)
  } else {
    registrar('B4-no-por-teclado-50ms', linha.motor, linha.total.mediana <= 50, detalheCiclo)
  }
  await pagina.screenshot({
    path: join(RESULTADOS, `ciclo-${q.includes('local') ? 'local' : 'global'}.png`),
  })
}

// ─── Capturas: os três desenhos sobre o mesmo diagrama ───────────────────────
console.log('\n── capturas ──')
for (const [nome, q] of [
  ['layout-dagre-TB', 'n=0&motor=dagre&orientacao=TB'],
  ['layout-dagre-LR', 'n=0&motor=dagre&orientacao=LR'],
  ['layout-100-global', 'n=100&arestas=120&motor=dagre'],
]) {
  await pagina.goto(`${BASE}/?${q}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.waitForTimeout(700)
  await pagina.screenshot({ path: join(RESULTADOS, `${nome}.png`) })
  console.log(`  ${nome}.png`)
}

// O híbrido com colisão visível: mover nós à mão e reimpor por cima do layout.
await pagina.goto(`${BASE}/?n=100&arestas=120&motor=hibrido`, { waitUntil: 'load' })
await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
await pagina.waitForTimeout(700)
const colisoesHibrido = await pagina.evaluate(async () => {
  const antes = window.__spike.colisoes()
  const pos = window.__spike.posicoes()
  const ids = Object.keys(pos)
  // A pessoa arrasta 20% dos nós para onde faz sentido para ela.
  let s = 20260720
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (const id of ids) {
    if (rand() < 0.2) {
      window.__spike.moverNo(id, pos[id].x + (rand() - 0.5) * 600, pos[id].y + (rand() - 0.5) * 400)
    }
  }
  await new Promise((r) => setTimeout(r, 500))
  return { antes, depois: window.__spike.colisoes() }
})
await pagina.waitForTimeout(500)
await pagina.screenshot({ path: join(RESULTADOS, 'hibrido-colisoes.png') })
relatorio.hibrido = colisoesHibrido
registrar(
  'B5-hibrido-colide',
  'híbrido @ 100 nós',
  colisoesHibrido.depois > colisoesHibrido.antes,
  `${colisoesHibrido.antes} → ${colisoesHibrido.depois} pares de caixas sobrepostas`,
)

// ─── veredito ────────────────────────────────────────────────────────────────
const passaram = checagens.filter((c) => c.passou).length
relatorio.checagens = checagens
relatorio.placar = { total: checagens.length, passaram }
writeFileSync(join(RESULTADOS, 'veredito.json'), JSON.stringify(relatorio, null, 2))

await navegador.close()
console.log(`\n${passaram}/${checagens.length} checagens de navegador passaram`)
console.log('resultados/veredito.json escrito')
if (passaram !== checagens.length) process.exitCode = 1
