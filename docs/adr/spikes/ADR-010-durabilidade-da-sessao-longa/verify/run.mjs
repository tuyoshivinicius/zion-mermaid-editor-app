// A metade da verificação que precisa de navegador — e é aqui que mora a prova
// central deste spike: **fechar e reabrir a aba de verdade**, com `reload()`, e
// ver o que volta.
//
// As barras são as do ADR-004, declaradas antes de medir: edição pontual ≤100ms
// na mediana, tecla ≤50ms.
//
// Perguntas, em ordem de importância para a decisão do ADR-010:
//   B1  gravar a cada ato cabe no gesto, no envelope 400/500? (e fora dele?)
//   B2  a sessão longa **pelo app inteiro** degrada?
//   B3  o que o heap segura depois dela — e o histórico ilimitado é o vazamento?
//   B4  depois de reabrir a aba, o rascunho volta — estrutura, estilo e posição?
//   B5  o que **não** volta, dito em número em vez de suposto.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
const PORTA = 5801
const BASE = `http://127.0.0.1:${PORTA}`

const BARRA_EDICAO = 100
const ATOS_DA_SESSAO = 600

const checagens = []
const registrar = (id, familia, alvo, passou, detalhe) => {
  checagens.push({ id, familia, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(24)} ${String(familia).padEnd(9)} ${String(alvo).padEnd(30)} ${detalhe ?? ''}`,
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

mkdirSync(RESULTADOS, { recursive: true })

const servidor = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], { cwd: RAIZ, stdio: 'ignore' })
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
  barras: { edicaoMs: BARRA_EDICAO },
  atosDaSessao: ATOS_DA_SESSAO,
  gravacao: {},
}

await esperarServidor()
const navegador = await chromium.launch({ args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] })
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
const pagina = await contexto.newPage()
pagina.on('pageerror', (e) => console.log('  [erro de página]', e.message))

relatorio.mermaid = JSON.parse(readFileSync(join(RAIZ, 'node_modules/mermaid/package.json'), 'utf8')).version
console.log(`oráculo: mermaid ${relatorio.mermaid}\n`)

const abrir = async (q, { limpar = true } = {}) => {
  await pagina.goto(`${BASE}/?${q}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto && window.__oraculo && window.__oraculo.pronto)
  if (limpar) {
    await pagina.evaluate(() => localStorage.clear())
    await pagina.goto(`${BASE}/?${q}`, { waitUntil: 'load' })
    await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  }
  await pagina.waitForTimeout(500)
  await pagina.evaluate(() => window.__spike.zerar())
}

async function medirAtos(repeticoes, corpo) {
  const amostras = []
  for (let i = 0; i < repeticoes; i++) {
    const espera = pagina.evaluate(() => window.__spike.proximaAmostra())
    await pagina.evaluate(corpo, { i })
    amostras.push(await espera)
    await pagina.waitForTimeout(40)
  }
  return amostras
}

// ─── B1 · o custo de gravar, e onde ele cai ──────────────────────────────────
// Três políticas × dois armazéns, sempre no envelope e sempre no formato caro
// (modelo + posições, ~110 KiB). É o pior caso honesto.
const POLITICAS = [
  { quando: 'ato', armazem: 'sync', rotulo: 'a cada ato · localStorage' },
  { quando: 'ato', armazem: 'async', rotulo: 'a cada ato · IndexedDB' },
  { quando: 'ocioso', armazem: 'sync', rotulo: 'quando a mão para · localStorage' },
  { quando: 'nunca', armazem: 'sync', rotulo: 'controle: sem gravar' },
]
for (const pol of POLITICAS) {
  await abrir(`n=400&ligacoes=500&formato=modelo&quando=${pol.quando}&armazem=${pol.armazem}&restaurar=0`)
  const amostras = await medirAtos(7, ({ i }) => window.__spike.atoEmBloco(10, `Gravando ${i}`))
  await pagina.waitForTimeout(1400) // deixa o `ocioso` disparar
  const p = await pagina.evaluate(() => window.__spike.persistencia())

  const totais = amostras.map((a) => a.total)
  const linha = {
    politica: pol.rotulo,
    total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
    gravacaoDentroDoGesto: arred(mediana(amostras.map((a) => a.gravacao))),
    gravacoes: p.gravacoes,
    bytes: p.bytes,
  }
  relatorio.gravacao[pol.rotulo] = linha
  const dentro = linha.total.mediana <= BARRA_EDICAO
  // O que o número da gravação significa muda com o armazém, e confundir os dois
  // levaria à decisão errada: o síncrono **bloqueia a main thread** por aquele
  // tempo; o assíncrono só demora aquilo para confirmar, fora dela.
  const legenda =
    pol.armazem === 'async'
      ? `${linha.gravacaoDentroDoGesto}ms até confirmar (fora da main thread)`
      : `${linha.gravacaoDentroDoGesto}ms de bloqueio da main thread`
  registrar(
    pol.quando === 'nunca' ? 'B1c-controle-sem-gravar' : 'B1-custo-de-gravar',
    'flowchart',
    pol.rotulo,
    dentro,
    `total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · gravação: ${legenda} · ${p.gravacoes} gravações de ${(p.bytes / 1024).toFixed(0)} KiB`,
  )
}

// O mesmo, no documento pequeno: é onde a Marina passa a maior parte do tempo.
await abrir(`formato=modelo&quando=ato&armazem=sync&restaurar=0`)
{
  const amostras = await medirAtos(7, ({ i }) => window.__spike.atoEmBloco(2, `Pequeno ${i}`))
  const p = await pagina.evaluate(() => window.__spike.persistencia())
  const totais = amostras.map((a) => a.total)
  relatorio.gravacao['documento pequeno · a cada ato'] = {
    total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
    gravacaoDentroDoGesto: arred(mediana(amostras.map((a) => a.gravacao))),
    bytes: p.bytes,
  }
  registrar(
    'B1-custo-de-gravar',
    'flowchart',
    'documento pequeno · a cada ato',
    mediana(totais) <= BARRA_EDICAO,
    `total ${arred(mediana(totais))}ms · gravação ${arred(mediana(amostras.map((a) => a.gravacao)))}ms de ${p.bytes} bytes`,
  )
}

// ─── B2/B3 · a sessão longa pelo app, e o que o heap segura ──────────────────
console.log('')
for (const limite of [0, 200]) {
  await abrir(`n=400&ligacoes=500&formato=modelo&quando=ocioso&restaurar=0&limite=${limite}`)
  const r = await pagina.evaluate(async (atos) => {
    const longas = []
    const obs = new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) longas.push(Math.round(e.duration))
    })
    obs.observe({ entryTypes: ['longtask'] })

    const limpar = async () => {
      for (let i = 0; i < 3; i++) {
        window.gc()
        await new Promise((res) => setTimeout(res, 60))
      }
    }
    // A linha de base é tomada **depois de um aquecimento**, não logo após a
    // carga: medir contra o heap recém-carregado dá retenção negativa (a página
    // ainda está soltando o lixo da montagem) e não diz nada sobre vazamento.
    await window.__spike.sessaoLonga(50)
    await limpar()
    const heapAntes = performance.memory.usedJSHeapSize
    const t0 = performance.now()
    const tempos = await window.__spike.sessaoLonga(atos)
    const duracaoMs = performance.now() - t0
    await limpar()
    const heapDepois = performance.memory.usedJSHeapSize
    obs.disconnect()

    const t1 = window.__spike.codigo()
    const t2 = window.__oraculo.serializar(window.__oraculo.analisar(t1).modelo)
    return {
      tempos,
      duracaoMs: Math.round(duracaoMs),
      heapAntesKiB: Math.round(heapAntes / 1024),
      heapDepoisKiB: Math.round(heapDepois / 1024),
      longas: longas.length,
      piorLonga: longas.length ? Math.max(...longas) : 0,
      pontoFixo: t1 === t2,
      nos: window.__spike.contarNos(),
      noCanvas: window.__spike.contarNoCanvas(),
      historico: window.__spike.historico(),
      valida: await window.__oraculo.valida(t1),
    }
  }, ATOS_DA_SESSAO)

  const MARCO = 50
  const inicio = mediana(r.tempos.slice(0, MARCO))
  const fim = mediana(r.tempos.slice(-MARCO))
  const razao = fim / inicio
  const linha = {
    limite: limite || '∞',
    atos: r.tempos.length,
    duracaoMs: r.duracaoMs,
    medianaInicioMs: arred(inicio),
    medianaFimMs: arred(fim),
    razao: Math.round(razao * 100) / 100,
    p95Ms: arred(p95(r.tempos)),
    heapAntesKiB: r.heapAntesKiB,
    heapDepoisKiB: r.heapDepoisKiB,
    retidoKiB: r.heapDepoisKiB - r.heapAntesKiB,
    tarefasLongas: r.longas,
    piorTarefaLongaMs: r.piorLonga,
    entradasNoHistorico: r.historico.tamanho,
  }
  relatorio[`sessaoLonga_limite_${limite || 'infinito'}`] = linha

  registrar(
    limite === 0 ? 'B2-sessao-nao-degrada' : 'B2c-controle-com-teto',
    'flowchart',
    `${r.tempos.length} atos · limite ${limite || '∞'}`,
    razao < 2 && r.tempos.length === ATOS_DA_SESSAO,
    `mediana dos ${MARCO} primeiros ${arred(inicio)}ms · dos ${MARCO} últimos ${arred(fim)}ms · razão ${linha.razao}× · p95 ${linha.p95Ms}ms · ${r.duracaoMs}ms de relógio`,
  )
  registrar(
    'B3-heap-depois-da-sessao',
    'flowchart',
    `limite ${limite || '∞'}`,
    // A barra: o que a sessão retém tem que ser da ordem do histórico que ela
    // criou, não um múltiplo dele. 8 MiB para 600 atos já seria 13 KiB por ato,
    // trinta vezes o que o ADR-009 mediu por entrada.
    linha.retidoKiB < 8 * 1024,
    `${r.heapAntesKiB} -> ${r.heapDepoisKiB} KiB (retido ${linha.retidoKiB} KiB · ${Math.round((linha.retidoKiB * 1024) / r.tempos.length)} bytes por ato) · ${r.historico.tamanho} entradas · ${r.longas} tarefas longas (pior ${r.piorLonga}ms)`,
  )
  registrar(
    'B3-ponto-fixo-no-fim',
    'flowchart',
    `limite ${limite || '∞'}`,
    r.pontoFixo && r.valida.ok && r.nos === r.noCanvas,
    `ponto fixo ${r.pontoFixo ? 'mantido' : 'PERDIDO'} · mermaid ${r.valida.ok ? 'aceita' : 'recusa: ' + r.valida.erro} · ${r.nos} nós no modelo e ${r.noCanvas} no canvas`,
  )
}

// ─── B4 · fechar e reabrir a aba, de verdade ─────────────────────────────────
// A prova central. Não é "o rascunho está no localStorage": é `reload()`, e o
// que a pessoa encontra na tela depois.
console.log('')
// Nas três famílias: o ADR-008 mostrou que em Sequence a **ordem** do agregado é
// condição de validade, e o corpo é uma árvore temporal. Um rascunho que passe
// por JSON e volte tem que devolver isso intacto, ou o mermaid recusa o código.
for (const [familia, formato] of [
  ['flowchart', 'modelo'],
  ['flowchart', 'texto'],
  ['classe', 'modelo'],
  ['classe', 'texto'],
  ['sequencia', 'modelo'],
  ['sequencia', 'texto'],
]) {
  const q = `tipo=${familia}&n=100&ligacoes=120&formato=${formato}&quando=ato&restaurar=1`
  await abrir(q)

  const antes = await pagina.evaluate(async () => {
    // Uma sessão com as três coisas dentro: estrutura (um nó novo), estilo/rótulo
    // (um ato em bloco) e posição (três arrastos).
    window.__spike.criar('novo1', 'Caixa criada na sessão')
    window.__spike.atoEmBloco(5, 'Rotulado na sessão')
    const ids = window.__spike.ids()
    for (let i = 0; i < 3; i++) window.__spike.mover(ids[i], { x: 300 + i * 40, y: 700 })
    await new Promise((r) => setTimeout(r, 400))
    return {
      codigo: window.__spike.codigo(),
      nos: window.__spike.contarNos(),
      posicoes: Object.keys(window.__spike.posicoes()).length,
      rascunhoBytes: (window.__spike.lerRascunho() || '').length,
      historico: window.__spike.historico(),
    }
  })

  await pagina.reload({ waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.waitForTimeout(400)

  const depois = await pagina.evaluate(async (f) => ({
    abertura: window.__spike.abertura(),
    codigo: window.__spike.codigo(),
    nos: window.__spike.contarNos(),
    noCanvas: window.__spike.contarNoCanvas(),
    posicoes: Object.keys(window.__spike.posicoes()).length,
    historico: window.__spike.historico(),
    valida: await window.__oraculo.valida(window.__spike.codigo()),
    desenha: await window.__oraculo.desenha(window.__spike.codigo(), f),
  }), familia)

  const estruturaVoltou = depois.codigo === antes.codigo && depois.nos === antes.nos
  const posicaoVoltou = depois.posicoes === antes.posicoes
  relatorio[`reabrirAba_${familia}_${formato}`] = { antes, depois, estruturaVoltou, posicaoVoltou }

  registrar(
    'B4-reabrir-a-aba',
    familia,
    `formato ${formato}`,
    // O esperado é declarado por formato: o `texto` **deve** voltar sem posição.
    depois.abertura.restaurado && estruturaVoltou && depois.valida.ok && depois.desenha.ok && posicaoVoltou === (formato === 'modelo'),
    `restaurado · código ${estruturaVoltou ? 'byte a byte' : 'DIFERENTE'} · ${depois.nos} nós no modelo e ${depois.noCanvas} no canvas · posições ${depois.posicoes}/${antes.posicoes} · mermaid ${depois.valida.ok ? 'aceita e desenha' : 'recusa: ' + (depois.valida.erro || depois.desenha.erro)} · rascunho de ${(antes.rascunhoBytes / 1024).toFixed(1)} KiB`,
  )
  registrar(
    'B5-o-que-nao-volta',
    familia,
    `formato ${formato}`,
    depois.historico.tamanho === 0 && !depois.historico.podeDesfazer,
    `histórico: ${antes.historico.tamanho} entradas antes, ${depois.historico.tamanho} depois — o desfazer da sessão anterior não existe mais`,
  )
  await pagina.screenshot({ path: join(RESULTADOS, `reabriu-a-aba-${familia}-${formato}.png`) })
}

// ─── B4b · a aba reabre com rascunho ilegível ────────────────────────────────
// A rede de segurança falhando: o que a pessoa encontra quando o que estava
// gravado não presta. Tem que ser uma sessão nova, não uma tela quebrada.
console.log('')
for (const [nome, cru] of [
  ['JSON truncado', '{"versao":1,"modelo":{"nos":[{"id":"a"'],
  ['versão futura', '{"versao":99,"modelo":{"nos":[]},"posicoes":{}}'],
  ['lixo', 'não é nada disso'],
]) {
  await abrir(`formato=modelo&quando=nunca&restaurar=1`)
  await pagina.evaluate((c) => localStorage.setItem('zion.rascunho', c), cru)
  await pagina.reload({ waitUntil: 'load' })
  const caiu = await pagina
    .waitForFunction(() => window.__spike && window.__spike.pronto, { timeout: 5000 })
    .then(() => false)
    .catch(() => true)
  const r = caiu ? null : await pagina.evaluate(() => ({ abertura: window.__spike.abertura(), nos: window.__spike.contarNos() }))
  registrar(
    'B4b-rascunho-ilegivel',
    'flowchart',
    nome,
    !caiu && r && !r.abertura.restaurado && r.nos > 0,
    caiu ? 'a aba NÃO montou' : `sessão nova com ${r.nos} nós · aviso: "${r.abertura.aviso}"`,
  )
}

const passaram = checagens.filter((c) => c.passou).length
console.log(`\n${passaram}/${checagens.length} verificações de navegador passaram`)

relatorio.placar = { passaram, total: checagens.length }
relatorio.checagens = checagens
writeFileSync(join(RESULTADOS, 'veredito.json'), JSON.stringify(relatorio, null, 2))
console.log('-> resultados/veredito.json')

await navegador.close()
servidor.kill()
process.exit(passaram === checagens.length ? 0 : 1)
