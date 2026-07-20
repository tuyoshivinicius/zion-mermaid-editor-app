// A metade da verificação que precisa de DOM.
//
// Três perguntas, nesta ordem de importância:
//   B1-B3  o mermaid **de verdade** aceita o que sai do modelo, e desenha o
//          mesmo diagrama? (sem isso, o round-trip é o meu parser julgando o meu
//          serializador — circular)
//   B4     durante a digitação, quantos estados intermediários o mermaid recusa
//          e quantos o modelo próprio ainda entrega? (o braço de controle da
//          promessa "a prévia não quebra")
//   B5     a tecla **dentro do editor de código** cabe no envelope do ADR-004?
//          É o buraco que o ADR-004 e o ADR-005 registraram por escrito.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
const PORTA = 5401
const BASE = `http://127.0.0.1:${PORTA}`

const checagens = []
const registrar = (id, alvo, passou, detalhe) => {
  checagens.push({ id, alvo, passou, detalhe })
  console.log(`${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(26)} ${String(alvo).padEnd(24)} ${detalhe ?? ''}`)
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

const relatorio = { maquina: 'Linux WSL2 · AMD Ryzen 7 5800H · 8 vCPU · sem GPU', oraculo: {}, latencia: {} }

await esperarServidor()
const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
const pagina = await contexto.newPage()
pagina.on('pageerror', (e) => console.log('  [erro de página]', e.message))

await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => window.__oraculo && window.__oraculo.pronto && window.__spike)
const versaoMermaid = JSON.parse(readFileSync(join(RAIZ, 'node_modules/mermaid/package.json'), 'utf8')).version
relatorio.mermaid = versaoMermaid
console.log(`oráculo: mermaid ${versaoMermaid}\n`)

// ─── B1/B2/B3 · o oráculo externo ────────────────────────────────────────────
const oraculo = await pagina.evaluate(async () => {
  const saida = []
  for (const { nome, texto } of window.__oraculo.corpus) {
    const { analisar, serializar } = window.__oraculo
    const meu = serializar(analisar(texto).modelo)

    const validaOriginal = await window.__oraculo.valida(texto)
    const validaMeu = await window.__oraculo.valida(meu)
    const desenhoOriginal = await window.__oraculo.desenha(texto)
    const desenhoMeu = await window.__oraculo.desenha(meu)

    saida.push({ nome, meu, validaOriginal, validaMeu, desenhoOriginal, desenhoMeu })
  }
  return saida
})

for (const r of oraculo) {
  registrar('B1-corpus-valido', r.nome, r.validaOriginal.ok, r.validaOriginal.erro || '')
}
for (const r of oraculo) {
  registrar('B2-saida-valida', r.nome, r.validaMeu.ok, r.validaMeu.erro || 'mermaid.parse aceitou')
}
for (const r of oraculo) {
  const a = r.desenhoOriginal
  const b = r.desenhoMeu
  if (!a.ok || !b.ok) {
    registrar('B3-mesmo-diagrama', r.nome, false, `render falhou: ${a.erro || b.erro}`)
    continue
  }
  const mesmosNos = JSON.stringify(a.rotulosNo) === JSON.stringify(b.rotulosNo)
  const mesmasArestas = a.arestas === b.arestas
  const mesmosRotulos = JSON.stringify(a.rotulosAresta) === JSON.stringify(b.rotulosAresta)
  const ok = mesmosNos && mesmasArestas && mesmosRotulos
  registrar(
    'B3-mesmo-diagrama',
    r.nome,
    ok,
    ok
      ? `${a.rotulosNo.length} nós · ${a.arestas} arestas · ${a.rotulosAresta.length} rótulos de aresta`
      : [
          mesmosNos ? '' : `nós: ${JSON.stringify(dif(a.rotulosNo, b.rotulosNo))}`,
          mesmasArestas ? '' : `arestas ${a.arestas} -> ${b.arestas}`,
          mesmosRotulos ? '' : `rótulos: ${JSON.stringify(dif(a.rotulosAresta, b.rotulosAresta))}`,
        ]
          .filter(Boolean)
          .join(' · '),
  )
}
relatorio.oraculo.corpus = oraculo.map((r) => ({
  nome: r.nome,
  originalValido: r.validaOriginal.ok,
  saidaValida: r.validaMeu.ok,
  erroSaida: r.validaMeu.erro,
  desenhoOriginal: r.desenhoOriginal.ok ? { nos: r.desenhoOriginal.rotulosNo.length, arestas: r.desenhoOriginal.arestas } : null,
  desenhoMeu: r.desenhoMeu.ok ? { nos: r.desenhoMeu.rotulosNo.length, arestas: r.desenhoMeu.arestas } : null,
  saida: r.meu,
}))

function dif(a, b) {
  const so = (x, y) => x.filter((v) => !y.includes(v))
  return { soNoOriginal: so(a, b), soNaMinha: so(b, a) }
}

// ─── B4 · digitação caractere a caractere: quem sobrevive ao estado intermediário
console.log('')
// A propriedade honesta não é "o prefixo tem nós" — no começo do documento ele
// legitimamente não tem. É **regressão**: digitar uma tecla nunca pode fazer a
// prévia perder um nó que ela já mostrava. É a leitura literal de "sem que a
// prévia quebre ou se perca".
const recuperacao = await pagina.evaluate(async () => {
  const saida = []
  for (const { nome, texto } of window.__oraculo.corpus) {
    let mermaidOk = 0
    // Nem toda regressão é perda de trabalho. Digitar a palavra `subgraph` passa
    // por `s`, `su`, `sub`... que um parser de linha lê como um nó chamado `s`;
    // quando a palavra fecha, esse nó **fantasma** some. Some porque nunca
    // deveria ter existido. O que o discovery proíbe é perder um nó **real** —
    // um que está no documento final. Os dois são contados separadamente.
    const finais = new Set(window.__oraculo.analisar(texto).modelo.nos.map((n) => n.id))
    const novo = () => ({ regressoesReais: 0, regressoesBrutas: 0, piorQueda: 0, fantasmas: 0, antR: 0, antB: 0 })
    const arm = { tolerante: novo(), estrito: novo() }

    // Antes de a primeira linha fechar não existe diagrama nenhum: a palavra
    // `flowchart` passa por `f`, e num corpus onde `f` também é id de nó isso
    // contaria como perda real sem ser. A contagem começa no fim do cabeçalho.
    const inicio = texto.indexOf('\n') + 1

    for (let i = inicio; i <= texto.length; i++) {
      const prefixo = texto.slice(0, i)
      for (const [qual, opcoes] of [
        ['tolerante', { tolerante: true }],
        ['estrito', { tolerante: false }],
      ]) {
        const ids = window.__oraculo.analisar(prefixo, opcoes).modelo.nos.map((n) => n.id)
        const reais = ids.filter((id) => finais.has(id)).length
        const a = arm[qual]
        if (ids.some((id) => !finais.has(id))) a.fantasmas++
        if (reais < a.antR) {
          a.regressoesReais++
          a.piorQueda = Math.max(a.piorQueda, a.antR - reais)
        }
        if (ids.length < a.antB) a.regressoesBrutas++
        a.antR = reais
        a.antB = ids.length
      }
      const v = await window.__oraculo.valida(prefixo)
      if (v.ok) mermaidOk++
    }
    const limpar = (a) => ({
      regressoesReais: a.regressoesReais,
      regressoesBrutas: a.regressoesBrutas,
      piorQueda: a.piorQueda,
      fantasmas: a.fantasmas,
    })
    saida.push({ nome, total: texto.length, mermaidOk, tolerante: limpar(arm.tolerante), estrito: limpar(arm.estrito) })
  }
  return saida
})

for (const r of recuperacao) {
  registrar(
    'B4-sem-perda-real',
    r.nome,
    r.tolerante.regressoesReais === 0,
    `perda real: tolerante ${r.tolerante.regressoesReais} · estrito ${r.estrito.regressoesReais} (pior queda ${r.estrito.piorQueda}) · fantasma: ${r.tolerante.fantasmas} prefixos · mermaid aceita ${Math.round((r.mermaidOk / r.total) * 100)}% dos ${r.total}`,
  )
}
relatorio.oraculo.recuperacao = recuperacao

// ─── B6 · divergências deliberadas entre o parser próprio e o mermaid ────────
console.log('')
const SONDAS = [
  ['comentário no fim do statement', 'flowchart TD\n  a[A] --> b[B] %% nota'],
  ['shape v11 @{}', 'flowchart TD\n  a@{ shape: rect, label: "A" }\n  a --> b[B]'],
  ['rótulo markdown (crase)', 'flowchart TD\n  a["`**negrito**`"] --> b[B]'],
  ['linkStyle default', 'flowchart TD\n  a --> b\n  linkStyle default stroke:#f00'],
  ['nó sem definição', 'flowchart TD\n  a --> b'],
  ['aspas dentro de aspas', 'flowchart TD\n  a["diz #quot;oi#quot;"] --> b[B]'],
  ['subgraph sem end', 'flowchart TD\n  subgraph s\n  a --> b'],
  ['seta sem destino', 'flowchart TD\n  a[A] -->'],
]
const divergencias = await pagina.evaluate(async (sondas) => {
  const saida = []
  for (const [nome, texto] of sondas) {
    const v = await window.__oraculo.valida(texto)
    const r = window.__oraculo.analisar(texto)
    saida.push({
      nome,
      texto,
      mermaidAceita: v.ok,
      mermaidErro: v.erro,
      meuErros: r.erros.length,
      meuAvisos: r.avisos.length,
      meuNos: r.modelo.nos.length,
    })
  }
  return saida
}, SONDAS)

for (const d of divergencias) {
  const meuOk = d.meuErros === 0
  const concordam = d.mermaidAceita === meuOk
  registrar(
    'B6-divergencia',
    d.nome,
    true, // caracterização, não aprovação: a linha existe para ser lida
    `mermaid ${d.mermaidAceita ? 'aceita' : 'recusa'} · próprio ${meuOk ? 'aceita' : 'recusa'}${d.meuAvisos ? ` (${d.meuAvisos} aviso)` : ''} · ${concordam ? 'concordam' : 'DIVERGEM'} · ${d.meuNos} nós`,
  )
}
relatorio.oraculo.divergencias = divergencias

// ─── B7 · as duas vistas, no app rodando, sobre o mesmo modelo ───────────────
// B2/B3 comparam textos fora do app. Aqui o documento entra pelo editor de
// código de verdade e a pergunta é a do discovery: o que a Marina **vê** no
// canvas é o que o código que ela **copia** desenha?
console.log('')
await pagina.goto(`${BASE}/?n=0`, { waitUntil: 'load' })
await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)

for (const { nome } of await pagina.evaluate(() => window.__oraculo.corpus.map((c) => ({ nome: c.nome })))) {
  const r = await pagina.evaluate(async (alvo) => {
    const doc = window.__oraculo.corpus.find((c) => c.nome === alvo)
    const ta = document.getElementById('codigo')
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    set.call(ta, doc.texto)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 250))

    const noCanvas = document.querySelectorAll('.react-flow__node').length
    const noModelo = window.__spike.contarNos()
    const desenho = await window.__oraculo.desenha(window.__spike.canonico())
    return { noCanvas, noModelo, noCodigo: desenho.ok ? desenho.rotulosNo.length : -1, erro: desenho.erro }
  }, nome)

  const ok = r.noCanvas === r.noModelo && r.noModelo === r.noCodigo
  registrar(
    'B7-duas-vistas-um-modelo',
    nome,
    ok,
    ok ? `${r.noModelo} nós no modelo, no canvas e no código` : `canvas ${r.noCanvas} · modelo ${r.noModelo} · código ${r.noCodigo} ${r.erro || ''}`,
  )
}

// ─── B5 · a tecla dentro do editor de código ─────────────────────────────────
console.log('')
const CENARIOS = [
  { rotulo: 'vazio (3 nós)', q: 'n=0' },
  { rotulo: 'médio (100/120)', q: 'n=100&arestas=120' },
  { rotulo: 'envelope ADR-004 (400/500)', q: 'n=400&arestas=500' },
  { rotulo: 'envelope · sem reuso (memo=0)', q: 'n=400&arestas=500&memo=0' },
  { rotulo: 'envelope · só código (canvas=0)', q: 'n=400&arestas=500&canvas=0' },
  { rotulo: 'denso 800/1000', q: 'n=800&arestas=1000' },
]

const TEXTO_DIGITADO = 'documentacao'

for (const cen of CENARIOS) {
  await pagina.goto(`${BASE}/?${cen.q}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.waitForTimeout(600)

  const antes = await pagina.evaluate(() => ({
    nos: window.__spike.contarNos(),
    conexoes: window.__spike.contarConexoes(),
    texto: window.__spike.texto().length,
  }))

  // Cursor no meio do documento, dentro de um rótulo — não no fim do arquivo,
  // que seria o caso mais fácil para qualquer estratégia incremental futura.
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
    await pagina.waitForTimeout(30)
  }

  const depois = await pagina.evaluate(() => ({
    nos: window.__spike.contarNos(),
    conexoes: window.__spike.contarConexoes(),
    texto: window.__spike.texto().length,
    erros: window.__spike.erros().length,
  }))

  // Guarda do ADR-004: cada cenário valida que mediu alguma coisa.
  const chegou = depois.texto === antes.texto + TEXTO_DIGITADO.length
  const totais = amostras.map((a) => a.total)
  const parses = amostras.map((a) => a.parse)
  const projecoes = amostras.map((a) => a.projecao)

  const linha = {
    cenario: cen.rotulo,
    query: cen.q,
    nos: depois.nos,
    conexoes: depois.conexoes,
    teclas: amostras.length,
    edicaoChegou: chegou,
    total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
    parse: { mediana: arred(mediana(parses)), p95: arred(p95(parses)) },
    projecao: { mediana: arred(mediana(projecoes)), p95: arred(p95(projecoes)) },
    errosAoFinal: depois.erros,
  }
  relatorio.latencia[cen.rotulo] = linha

  registrar(
    'B5-edicao-chegou',
    cen.rotulo,
    chegou,
    `${depois.nos} nós · ${depois.conexoes} conexões · ${amostras.length} teclas`,
  )
  registrar(
    'B5-tecla-na-barra-50ms',
    cen.rotulo,
    linha.total.mediana <= 50,
    `total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · parse ${linha.parse.mediana}ms · projeção ${linha.projecao.mediana}ms`,
  )

  await pagina.screenshot({ path: join(RESULTADOS, `lat-${cen.q.replace(/[=&]/g, '-')}.png`) })
}

// ─── Captura do caso hostil, com a marca visível ─────────────────────────────
await pagina.goto(`${BASE}/?n=0`, { waitUntil: 'load' })
await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
await pagina.evaluate(() => {
  const ta = document.getElementById('codigo')
  const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  set.call(ta, window.__oraculo.corpus.find((c) => c.nome.startsWith('09')).texto)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
})
await pagina.waitForTimeout(800)
await pagina.screenshot({ path: join(RESULTADOS, 'rotulos-hostis.png') })

// Estado **em digitação**: rótulo aberto e seta sem destino. O mermaid recusa os
// dois; aqui os nós continuam na prévia e o rodapé sinaliza. É a captura do
// achado principal.
await pagina.evaluate(() => {
  const ta = document.getElementById('codigo')
  const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  set.call(
    ta,
    ['flowchart TD', '  pedido["Pedido recebido"] --> revisao{"Revisar', '  revisao -->'].join('\n'),
  )
  ta.dispatchEvent(new Event('input', { bubbles: true }))
})
await pagina.waitForTimeout(800)
const emDigitacao = await pagina.evaluate(async () => ({
  nos: window.__spike.contarNos(),
  avisos: window.__spike.avisos().length,
  erros: window.__spike.erros().length,
  mermaid: await window.__oraculo.valida(window.__spike.texto()),
}))
registrar(
  'B8-em-digitacao',
  'rótulo aberto + seta sem destino',
  // `pedido` e `revisao` — `revisao` reaparece na linha seguinte, não é nó novo.
  emDigitacao.nos === 2 && emDigitacao.avisos > 0 && emDigitacao.erros === 0,
  `${emDigitacao.nos} nós na prévia · ${emDigitacao.avisos} aviso · ${emDigitacao.erros} erro · mermaid ${emDigitacao.mermaid.ok ? 'aceita' : 'recusa'}`,
)
relatorio.emDigitacao = emDigitacao
await pagina.screenshot({ path: join(RESULTADOS, 'em-digitacao.png') })

const passaram = checagens.filter((c) => c.passou).length
console.log(`\n${passaram}/${checagens.length} verificações de navegador passaram`)

relatorio.placar = { passaram, total: checagens.length }
relatorio.checagens = checagens
writeFileSync(join(RESULTADOS, 'veredito.json'), JSON.stringify(relatorio, null, 2))
console.log('-> resultados/veredito.json')

await navegador.close()
servidor.kill()
process.exit(passaram === checagens.length ? 0 : 1)
