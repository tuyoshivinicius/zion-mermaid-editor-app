// A metade da verificação que precisa de DOM, sobre as três famílias.
//
// Perguntas, em ordem de importância para a decisão do ADR-008:
//   B1-B3  o mermaid **de verdade** aceita o que sai do modelo único, e desenha
//          o mesmo diagrama — nas três famílias?
//   B7     permutar o agregado muda o **desenho**? É a pergunta que decide se o
//          núcleo pode ter uma normalização só. O juiz é o renderer, não eu.
//   B4     durante a digitação, o parser próprio ainda entrega o que o mermaid
//          recusa — nas três famílias?
//   B5     a tecla no editor de código cabe no envelope do ADR-004 quando o
//          documento é Class ou Sequence, e não Flowchart?
//   B6     canvas, modelo e código concordam no app rodando?

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
const PORTA = 5601
const BASE = `http://127.0.0.1:${PORTA}`

const FAMILIAS = ['flowchart', 'classe', 'sequencia']
// Amostragem declarada: a digitação caractere a caractere é O(n) chamadas ao
// mermaid por documento, e o corpus tem 30. B4 roda sobre estes quatro por
// família — não sobre os dez. O que fica de fora está dito, não escondido.
const AMOSTRA_DIGITACAO = ['01', '05', '09', '10']

const checagens = []
const registrar = (id, familia, alvo, passou, detalhe) => {
  checagens.push({ id, familia, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(22)} ${String(familia).padEnd(10)} ${String(alvo).padEnd(24)} ${detalhe ?? ''}`,
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
  amostraDigitacao: AMOSTRA_DIGITACAO,
  oraculo: {},
  latencia: {},
}

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

// ─── B1/B2/B3 · o oráculo externo, nas três famílias ─────────────────────────
const oraculo = await pagina.evaluate(async () => {
  const saida = []
  for (const { familia, nome, texto } of window.__oraculo.corpus) {
    const t = window.__oraculo.TIPOS[familia]
    const meu = t.serializar(t.analisar(texto).modelo)
    saida.push({
      familia,
      nome,
      meu,
      validaOriginal: await window.__oraculo.valida(texto),
      validaMeu: await window.__oraculo.valida(meu),
      desenhoOriginal: await window.__oraculo.desenha(texto, familia),
      desenhoMeu: await window.__oraculo.desenha(meu, familia),
    })
  }
  return saida
})

for (const r of oraculo) registrar('B1-corpus-valido', r.familia, r.nome, r.validaOriginal.ok, r.validaOriginal.erro || '')
console.log('')
for (const r of oraculo) registrar('B2-saida-valida', r.familia, r.nome, r.validaMeu.ok, r.validaMeu.erro || 'mermaid.parse aceitou')
console.log('')
for (const r of oraculo) {
  const a = r.desenhoOriginal
  const b = r.desenhoMeu
  if (!a.ok || !b.ok) {
    registrar('B3-mesmo-diagrama', r.familia, r.nome, false, `render falhou: ${a.erro || b.erro}`)
    continue
  }
  const mesmosNos = JSON.stringify(a.rotulosNo) === JSON.stringify(b.rotulosNo)
  const mesmasArestas = a.arestas === b.arestas
  const mesmosRotulos = JSON.stringify(a.rotulosAresta) === JSON.stringify(b.rotulosAresta)
  const ok = mesmosNos && mesmasArestas && mesmosRotulos
  registrar(
    'B3-mesmo-diagrama',
    r.familia,
    r.nome,
    ok,
    ok
      ? `${a.rotulosNo.length} nós · ${a.arestas} ligações · ${a.rotulosAresta.length} rótulos${a.ordenado ? ' (em ordem)' : ''}`
      : [
          mesmosNos ? '' : `nós: ${JSON.stringify(dif(a.rotulosNo, b.rotulosNo))}`,
          mesmasArestas ? '' : `ligações ${a.arestas} -> ${b.arestas}`,
          mesmosRotulos ? '' : `rótulos: ${JSON.stringify(dif(a.rotulosAresta, b.rotulosAresta))}`,
        ]
          .filter(Boolean)
          .join(' · '),
  )
}
relatorio.oraculo.corpus = oraculo.map((r) => ({
  familia: r.familia,
  nome: r.nome,
  originalValido: r.validaOriginal.ok,
  saidaValida: r.validaMeu.ok,
  erroSaida: r.validaMeu.erro,
  saida: r.meu,
}))

function dif(a, b) {
  const so = (x, y) => x.filter((v) => !y.includes(v))
  return { soNoOriginal: so(a, b), soNaMinha: so(b, a) }
}

// ─── B7 · permutar o agregado muda o desenho? ────────────────────────────────
// O núcleo do ADR-003 tem um `normalizar` só. Se em alguma família a ordem do
// agregado for semântica, esse campo não pode ser único — e o juiz aqui é o
// renderer do mermaid, não a minha função de comparação.
console.log('')
const ALVOS_PERMUTACAO = [
  ['flowchart', '10'],
  ['classe', '10'],
  // Duas linhas para Sequence de propósito: `02` não tem ativação e permuta para
  // um documento válido (dá para comparar desenho com desenho); `10` tem, e a
  // permutação nem chega a ser desenhável.
  ['sequencia', '02'],
  ['sequencia', '10'],
]
const permutacao = await pagina.evaluate(async (alvos) => {
  const saida = []
  for (const [familia, prefixo] of alvos) {
    const doc = window.__oraculo.corpus.find((c) => c.familia === familia && c.nome.startsWith(prefixo))
    const a = await window.__oraculo.desenha(doc.texto, familia)
    const b = await window.__oraculo.desenha(window.__oraculo.permutado(familia, doc.texto), familia)
    saida.push({
      familia,
      nome: doc.nome,
      originalDesenha: a.ok,
      permutadoDesenha: b.ok,
      mesmoSignificado: a.ok && b.ok ? a.significado === b.significado : null,
      mesmaGeometria: a.ok && b.ok ? a.geometria === b.geometria : null,
      erro: b.erro || a.erro,
    })
  }
  return saida
}, ALVOS_PERMUTACAO)
for (const p of permutacao) {
  registrar(
    'B7-ordem-do-agregado',
    p.familia,
    p.nome,
    // Caracterização, não aprovação: a linha existe para ser lida. Um dos
    // desfechos possíveis é justamente o documento permutado não ser desenhável.
    true,
    !p.originalDesenha
      ? `o próprio corpus não desenha: ${p.erro}`
      : !p.permutadoDesenha
        ? `permutar produz documento que o mermaid RECUSA (${p.erro}) — a ordem é condição de validade`
        : `significado ${p.mesmoSignificado ? 'IGUAL — a ordem é ruído' : 'DIFERENTE — a ordem é semântica'} · layout ${p.mesmaGeometria ? 'igual' : 'muda'}`,
  )
}
relatorio.oraculo.permutacao = permutacao

// ─── B4 · digitação caractere a caractere ────────────────────────────────────
console.log('')
const recuperacao = await pagina.evaluate(async (amostra) => {
  const saida = []
  for (const { familia, nome, texto } of window.__oraculo.corpus) {
    if (!amostra.some((p) => nome.startsWith(p))) continue
    const t = window.__oraculo.TIPOS[familia]
    const nosDe = (m) =>
      familia === 'flowchart'
        ? m.nos.map((n) => n.id)
        : familia === 'classe'
          ? m.classes.map((c) => c.id)
          : m.participantes.map((p) => p.id)

    const finais = new Set(nosDe(t.analisar(texto).modelo))
    const novo = () => ({ regressoesReais: 0, piorQueda: 0, fantasmas: 0, ant: 0 })
    const arm = { tolerante: novo(), estrito: novo() }
    let mermaidOk = 0

    const inicio = texto.indexOf('\n') + 1
    for (let i = inicio; i <= texto.length; i++) {
      const prefixo = texto.slice(0, i)
      for (const [qual, opcoes] of [
        ['tolerante', { tolerante: true }],
        ['estrito', { tolerante: false }],
      ]) {
        const ids = nosDe(t.analisar(prefixo, opcoes).modelo)
        const reais = ids.filter((id) => finais.has(id)).length
        const a = arm[qual]
        if (ids.some((id) => !finais.has(id))) a.fantasmas++
        if (reais < a.ant) {
          a.regressoesReais++
          a.piorQueda = Math.max(a.piorQueda, a.ant - reais)
        }
        a.ant = reais
      }
      const v = await window.__oraculo.valida(prefixo)
      if (v.ok) mermaidOk++
    }
    saida.push({
      familia,
      nome,
      total: texto.length - inicio + 1,
      mermaidOk,
      tolerante: arm.tolerante,
      estrito: arm.estrito,
    })
  }
  return saida
}, AMOSTRA_DIGITACAO)

for (const r of recuperacao) {
  registrar(
    'B4-sem-perda-real',
    r.familia,
    r.nome,
    r.tolerante.regressoesReais === 0,
    `perda real: tolerante ${r.tolerante.regressoesReais} · estrito ${r.estrito.regressoesReais} (pior queda ${r.estrito.piorQueda}) · fantasma ${r.tolerante.fantasmas} · mermaid aceita ${Math.round((r.mermaidOk / r.total) * 100)}% dos ${r.total}`,
  )
}
relatorio.oraculo.recuperacao = recuperacao

// ─── B4b · e quando o nó nasce na própria ligação? ───────────────────────────
// O B4 acima mostrou o parser estrito de Class e Sequence sem perder nada, ao
// contrário do Flowchart. A suspeita é que isso não é mérito da família: é o
// corpus, que declara `class X` e `participant X` em linha própria antes de
// ligá-los. No Flowchart o nó nasce **dentro** da ligação (`a[A] --> b[B]`), e é
// aí que o estrito derruba o nó junto com o statement.
//
// Estes três documentos declaram os nós só pela ligação, que é a forma mais
// curta e a que o teclado produz. É a sonda que separa "a família é mais
// tolerante" de "o meu corpus era mais fácil".
console.log('')
const SEM_DECLARACAO = [
  ['flowchart', 'flowchart TD\n  pedido[Pedido] --> revisao[Revisar]\n  revisao --> fim[Fim]'],
  ['classe', 'classDiagram\n  Cliente --> Pedido : faz\n  Pedido *-- Item : contem'],
  ['sequencia', 'sequenceDiagram\n  Alice->>Bob: pedir\n  Bob-->>Carol: repassar'],
]
const semDeclaracao = await pagina.evaluate(async (casos) => {
  const saida = []
  for (const [familia, texto] of casos) {
    const t = window.__oraculo.TIPOS[familia]
    const nosDe = (m) =>
      familia === 'flowchart'
        ? m.nos.map((n) => n.id)
        : familia === 'classe'
          ? m.classes.map((c) => c.id)
          : m.participantes.map((p) => p.id)
    const finais = new Set(nosDe(t.analisar(texto).modelo))
    const arm = { tolerante: { perda: 0, pior: 0, ant: 0 }, estrito: { perda: 0, pior: 0, ant: 0 } }
    const inicio = texto.indexOf('\n') + 1
    for (let i = inicio; i <= texto.length; i++) {
      for (const [qual, opcoes] of [
        ['tolerante', { tolerante: true }],
        ['estrito', { tolerante: false }],
      ]) {
        const reais = nosDe(t.analisar(texto.slice(0, i), opcoes).modelo).filter((id) => finais.has(id)).length
        const a = arm[qual]
        if (reais < a.ant) {
          a.perda++
          a.pior = Math.max(a.pior, a.ant - reais)
        }
        a.ant = reais
      }
    }
    saida.push({ familia, nos: finais.size, ...arm })
  }
  return saida
}, SEM_DECLARACAO)

for (const r of semDeclaracao) {
  registrar(
    'B4b-no-nasce-na-ligacao',
    r.familia,
    'sem declaração prévia',
    r.tolerante.perda === 0,
    `perda real: tolerante ${r.tolerante.perda} · estrito ${r.estrito.perda} (pior queda ${r.estrito.pior}) · ${r.nos} nós finais`,
  )
}
relatorio.oraculo.semDeclaracao = semDeclaracao

// ─── B4c · o alias do participante, com e sem a correção ─────────────────────
// O defeito que este spike achou digitando, e o braço que mede o que ele custa.
// `participant Codigo as Painel` passa, tecla a tecla, por "Codigo a" e
// "Codigo as". Lendo o resto da linha como id, o participante `Codigo` — que já
// estava desenhado — some da prévia e volta. É o mesmo tipo de regressão que o
// ADR-006 mediu no primeiro traço da seta do Flowchart, noutra sintaxe.
console.log('')
const ALIAS = [
  'sequenceDiagram',
  '  participant Codigo as Painel de codigo',
  '  participant Motor as Motor de layout',
  '  Codigo->>Motor: pedir posicao',
].join('\n')
const alias = await pagina.evaluate((texto) => {
  const t = window.__oraculo.TIPOS.sequencia
  const finais = new Set(t.analisar(texto).modelo.participantes.map((p) => p.id))
  const medir = (opcoes) => {
    let perda = 0
    let pior = 0
    let ant = 0
    for (let i = texto.indexOf('\n') + 1; i <= texto.length; i++) {
      const reais = t
        .analisar(texto.slice(0, i), opcoes)
        .modelo.participantes.map((p) => p.id)
        .filter((id) => finais.has(id)).length
      if (reais < ant) {
        perda++
        pior = Math.max(pior, ant - reais)
      }
      ant = reais
    }
    return { perda, pior }
  }
  return {
    nos: finais.size,
    corrigido: medir({ tolerante: true }),
    ingenuo: medir({ tolerante: true, aliasComoResto: true }),
  }
}, ALIAS)

registrar(
  'B4c-alias-do-participante',
  'sequencia',
  'participant X as Y',
  alias.corrigido.perda === 0,
  `perda real: id = primeiro token ${alias.corrigido.perda} · id = resto da linha ${alias.ingenuo.perda} (pior queda ${alias.ingenuo.pior}) · ${alias.nos} participantes`,
)
relatorio.oraculo.alias = alias

// ─── B6 · as duas vistas, no app rodando, sobre o mesmo modelo ───────────────
console.log('')
for (const familia of FAMILIAS) {
  await pagina.goto(`${BASE}/?tipo=${familia}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)

  const nomes = await pagina.evaluate(
    (f) => window.__oraculo.corpus.filter((c) => c.familia === f).map((c) => c.nome),
    familia,
  )

  for (const nome of nomes) {
    const r = await pagina.evaluate(
      async ({ f, alvo }) => {
        const doc = window.__oraculo.corpus.find((c) => c.familia === f && c.nome === alvo)
        const ta = document.getElementById('codigo')
        const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
        set.call(ta, doc.texto)
        ta.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise((res) => setTimeout(res, 250))

        const noCanvas = document.querySelectorAll('.react-flow__node').length
        const noModelo = window.__spike.contarNos()
        const desenho = await window.__oraculo.desenha(window.__spike.canonico(), f)
        return { noCanvas, noModelo, noCodigo: desenho.ok ? desenho.rotulosNo.length : -1, erro: desenho.erro }
      },
      { f: familia, alvo: nome },
    )
    const ok = r.noCanvas === r.noModelo && r.noModelo === r.noCodigo
    registrar(
      'B6-duas-vistas',
      familia,
      nome,
      ok,
      ok
        ? `${r.noModelo} nós no modelo, no canvas e no código`
        : `canvas ${r.noCanvas} · modelo ${r.noModelo} · código ${r.noCodigo} ${r.erro || ''}`,
    )
  }
}

// ─── B5 · a tecla dentro do editor de código, por família ────────────────────
console.log('')
const CENARIOS = []
for (const familia of FAMILIAS) {
  CENARIOS.push({ familia, rotulo: `${familia} · semente`, q: `tipo=${familia}` })
  CENARIOS.push({ familia, rotulo: `${familia} · envelope 400/500`, q: `tipo=${familia}&n=400&ligacoes=500` })
  // Braço de **controle**, não configuração do produto: mede o que acontece
  // quando a invariante de reuso do ADR-004/005/006 é quebrada. Estourar a barra
  // aqui é o resultado esperado, não uma reprovação.
  CENARIOS.push({ familia, rotulo: `${familia} · envelope sem reuso`, q: `tipo=${familia}&n=400&ligacoes=500&memo=0`, controle: true })
}

const TEXTO_DIGITADO = 'documentacao'

for (const cen of CENARIOS) {
  await pagina.goto(`${BASE}/?${cen.q}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.waitForTimeout(600)

  const antes = await pagina.evaluate(() => ({ texto: window.__spike.texto().length }))

  // Cursor no meio do documento, não no fim: é o caso difícil para qualquer
  // estratégia incremental futura.
  await pagina.evaluate(() => {
    const ta = document.getElementById('codigo')
    ta.focus()
    const linhas = ta.value.split('\n')
    const alvo = Math.max(1, Math.floor(linhas.length / 2))
    let pos = 0
    for (let i = 0; i < alvo; i++) pos += linhas[i].length + 1
    ta.selectionStart = ta.selectionEnd = pos + linhas[alvo].length
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
    ligacoes: window.__spike.contarLigacoes(),
    texto: window.__spike.texto().length,
    erros: window.__spike.erros().length,
  }))

  // Guarda do ADR-004: cada cenário valida que mediu alguma coisa.
  const chegou = depois.texto === antes.texto + TEXTO_DIGITADO.length
  const totais = amostras.map((a) => a.total)
  const linha = {
    cenario: cen.rotulo,
    familia: cen.familia,
    query: cen.q,
    nos: depois.nos,
    ligacoes: depois.ligacoes,
    teclas: amostras.length,
    edicaoChegou: chegou,
    total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
    parse: { mediana: arred(mediana(amostras.map((a) => a.parse))) },
    projecao: { mediana: arred(mediana(amostras.map((a) => a.projecao))) },
    errosAoFinal: depois.erros,
  }
  relatorio.latencia[cen.rotulo] = linha

  registrar('B5-edicao-chegou', cen.familia, cen.rotulo, chegou, `${depois.nos} nós · ${depois.ligacoes} ligações`)
  const dentro = linha.total.mediana <= 50
  const detalhe = `total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · parse ${linha.parse.mediana}ms · projeção ${linha.projecao.mediana}ms`
  registrar(
    cen.controle ? 'B5c-controle-sem-reuso' : 'B5-tecla-na-barra-50ms',
    cen.familia,
    cen.rotulo,
    cen.controle ? true : dentro,
    cen.controle ? `${dentro ? 'dentro' : 'FORA'} da barra de 50ms · ${detalhe}` : detalhe,
  )

  await pagina.screenshot({ path: join(RESULTADOS, `tecla-${cen.q.replace(/[=&]/g, '-')}.png`) })
}

// ─── Capturas: o nó estruturado e o estado em digitação ──────────────────────
for (const [familia, doc, arquivo] of [
  ['classe', '10-dominio-real.mmd', 'classe-dominio-real.png'],
  ['sequencia', '10-fluxo-real.mmd', 'sequencia-fluxo-real.png'],
]) {
  await pagina.goto(`${BASE}/?tipo=${familia}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.evaluate(
    ({ f, d }) => {
      const ta = document.getElementById('codigo')
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      set.call(ta, window.__oraculo.corpus.find((c) => c.familia === f && c.nome === d).texto)
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    },
    { f: familia, d: doc },
  )
  await pagina.waitForTimeout(900)
  await pagina.screenshot({ path: join(RESULTADOS, arquivo) })
}

// Estado **em digitação** nas duas famílias novas: corpo de classe aberto, e
// mensagem sem destino. O mermaid recusa os dois; aqui o diagrama continua.
console.log('')
const EM_DIGITACAO = [
  ['classe', ['classDiagram', '  class Pedido {', '    +String identifica'].join('\n'), 1],
  ['sequencia', ['sequenceDiagram', '  participant Alice', '  participant Bob', '  Alice->>'].join('\n'), 2],
]
for (const [familia, texto, esperado] of EM_DIGITACAO) {
  await pagina.goto(`${BASE}/?tipo=${familia}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto)
  await pagina.evaluate((t) => {
    const ta = document.getElementById('codigo')
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    set.call(ta, t)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }, texto)
  await pagina.waitForTimeout(700)
  const r = await pagina.evaluate(async () => ({
    nos: window.__spike.contarNos(),
    avisos: window.__spike.avisos().length,
    erros: window.__spike.erros().length,
    mermaid: await window.__oraculo.valida(window.__spike.texto()),
  }))
  registrar(
    'B8-em-digitacao',
    familia,
    'estado intermediário',
    r.nos === esperado && r.avisos > 0 && r.erros === 0,
    `${r.nos} nós na prévia (esperado ${esperado}) · ${r.avisos} aviso · ${r.erros} erro · mermaid ${r.mermaid.ok ? 'aceita' : 'recusa'}`,
  )
  relatorio[`emDigitacao_${familia}`] = r
  await pagina.screenshot({ path: join(RESULTADOS, `em-digitacao-${familia}.png`) })
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
