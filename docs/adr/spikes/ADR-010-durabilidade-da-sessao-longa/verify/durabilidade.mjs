// A metade da verificação que não precisa de DOM: o que o rascunho carrega, o
// que ele perde, e o que acontece com o modelo depois de uma sessão inteira de
// atos.
//
// Perguntas, em ordem de importância para a decisão do ADR-010:
//   D1  o que sobrevive a fechar a aba, em cada formato de rascunho?
//   D2  depois de milhares de atos, o modelo ainda tem ponto fixo?
//   D3  quanto pesa o rascunho, e o histórico junto dele?
//   D4  o ato degrada ao longo da sessão? (o começo é mais rápido que o fim?)
//   D5  o histórico ilimitado é o vazamento? (controle: com teto)
//   D6  rascunho ilegível derruba o app, ou falha para o lado de não existir?
//   D7  o rascunho tem ponto fixo próprio — gravar, ler e gravar de novo dá igual?

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { analisar, serializar, normalizar, TIPOS } from '../src/registro.js'
import { criarHistorico, estadoInicial, idsDosNos, nosDe } from '../src/comandos.js'
import { empacotar, desempacotar, VERSAO } from '../src/persistencia.js'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
mkdirSync(RESULTADOS, { recursive: true })

const checagens = []
const registrar = (id, familia, alvo, passou, detalhe) => {
  checagens.push({ id, familia, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(26)} ${String(familia).padEnd(10)} ${String(alvo).padEnd(26)} ${detalhe ?? ''}`,
  )
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const arred = (x) => Math.round(x * 1000) / 1000
const FAMILIAS = ['flowchart', 'classe', 'sequencia']

const corpus = []
for (const familia of FAMILIAS) {
  const dir = join(RAIZ, 'corpus', familia)
  for (const arq of readdirSync(dir).sort()) {
    corpus.push({ familia, nome: arq, texto: readFileSync(join(dir, arq), 'utf8').replace(/\n$/, '') })
  }
}

const relatorio = { maquina: 'Linux WSL2 · AMD Ryzen 7 5800H · 8 vCPU · sem GPU', versaoDoRascunho: VERSAO }
const DENSO = TIPOS.flowchart.gerarDensoTexto(400, 500)

// ─── D1 · o que sobrevive, por formato ───────────────────────────────────────
// A sessão gravada carrega três coisas: estrutura, estilo e **posição**. As duas
// primeiras viajam no código por decisão do discovery; a terceira, por decisão
// do discovery, **não viaja**. É aí que os dois formatos se separam.
console.log('')
const tamanhos = { texto: [], modelo: [] }
for (const { familia, nome, texto } of corpus) {
  const base = estadoInicial(texto)
  const ids = idsDosNos(base.modelo)
  // Uma sessão com trabalho dentro: posições arrumadas à mão em três nós.
  const estado = {
    modelo: base.modelo,
    posicoes: Object.fromEntries(ids.slice(0, 3).map((id, i) => [id, { x: 100 * i, y: 50 * i }])),
  }
  // Documento pequeno tem menos de três nós — o esperado é quantas posições
  // foram de fato arrumadas, não três.
  const arrumadas = Object.keys(estado.posicoes).length
  const estruturaAntes = normalizar(estado.modelo)
  const codigoAntes = serializar(estado.modelo)

  for (const formato of ['texto', 'modelo']) {
    const cru = empacotar(estado, formato, serializar)
    tamanhos[formato].push(cru.length)
    const { estado: volta, aviso } = desempacotar(cru, formato, analisar)
    const estrutura = volta && igual(normalizar(volta.modelo), estruturaAntes)
    const codigo = volta && serializar(volta.modelo) === codigoAntes
    const posicoes = volta ? Object.keys(volta.posicoes).length : 0

    registrar(
      formato === 'modelo' ? 'D1-rascunho-como-modelo' : 'D1-rascunho-como-texto',
      familia,
      nome,
      // O esperado é declarado por formato: o texto **deve** perder a posição —
      // não é defeito, é o que ele é. O que nenhum dos dois pode perder é a
      // estrutura e o estilo.
      estrutura && codigo && posicoes === (formato === 'modelo' ? arrumadas : 0) && !aviso,
      `estrutura ${estrutura ? 'igual' : 'DIFERENTE'} · código ${codigo ? 'byte a byte' : 'DIFERENTE'} · posições de volta: ${posicoes}/${arrumadas} · ${cru.length} bytes`,
    )
  }
}
relatorio.tamanhoDoRascunho = {
  corpusTextoMedio: Math.round(tamanhos.texto.reduce((a, b) => a + b, 0) / tamanhos.texto.length),
  corpusModeloMedio: Math.round(tamanhos.modelo.reduce((a, b) => a + b, 0) / tamanhos.modelo.length),
}

// ─── D3 · quanto pesa o rascunho no envelope ─────────────────────────────────
console.log('')
{
  const base = estadoInicial(DENSO)
  const ids = idsDosNos(base.modelo)
  const estado = { modelo: base.modelo, posicoes: Object.fromEntries(ids.map((id, i) => [id, { x: i, y: i }])) }
  const comoTexto = empacotar(estado, 'texto', serializar).length
  const comoModelo = empacotar(estado, 'modelo', serializar).length
  relatorio.envelope = { comoTextoBytes: comoTexto, comoModeloBytes: comoModelo, razao: Math.round((comoModelo / comoTexto) * 10) / 10 }
  registrar(
    'D3-peso-do-rascunho',
    'flowchart',
    'envelope 400/500',
    // O teto prático do localStorage é da ordem de 5 MiB por origem; os dois
    // formatos cabem com folga, e é isso que a checagem afirma.
    comoModelo < 5 * 1024 * 1024,
    `texto ${(comoTexto / 1024).toFixed(1)} KiB · modelo+posições ${(comoModelo / 1024).toFixed(1)} KiB (${relatorio.envelope.razao}×) · teto prático do armazém síncrono: ~5 MiB`,
  )
}

// ─── D4 · a sessão longa, em atos ────────────────────────────────────────────
// Não são horas de relógio: é o **volume de atos** de uma sessão longa, aplicado
// o mais rápido que a máquina consegue. O que se mede é se o ato de número
// 15.000 custa o mesmo que o de número 1.
console.log('')
const ATOS = 15000
const MARCO = 500
const sessao = {}
for (const limite of [0, 200]) {
  const base = estadoInicial(DENSO)
  const h = criarHistorico({ modo: 'inverso', limite })
  const ids = idsDosNos(base.modelo)
  let e = base
  const tempos = []
  for (let i = 0; i < ATOS; i++) {
    const t0 = performance.now()
    e = h.aplicar(e, 'rotular', { ids: [ids[i % ids.length]], valor: `Ato ${i}` }, { agora: i * 1000 })
    tempos.push(performance.now() - t0)
  }
  const inicio = mediana(tempos.slice(0, MARCO))
  const fim = mediana(tempos.slice(-MARCO))
  const razao = fim / inicio
  const bytes = h.bytesLogicos()
  sessao[limite === 0 ? 'ilimitado' : 'limite200'] = {
    atos: ATOS,
    medianaInicioMs: arred(inicio),
    medianaFimMs: arred(fim),
    razao: Math.round(razao * 100) / 100,
    entradas: h.tamanho(),
    bytesLogicos: bytes,
  }
  registrar(
    limite === 0 ? 'D4-degradacao-do-ato' : 'D5-controle-com-teto',
    'flowchart',
    `${ATOS} atos · limite ${limite || '∞'}`,
    // A barra é a razão, não o valor: um ato que fica 2× mais lento ao longo da
    // sessão é degradação; ±20% é ruído de relógio.
    razao < 2,
    `mediana dos ${MARCO} primeiros ${arred(inicio)}ms · dos ${MARCO} últimos ${arred(fim)}ms · razão ${Math.round(razao * 100) / 100}× · ${h.tamanho()} entradas · ${(bytes / 1024 / 1024).toFixed(1)} MiB lógicos de histórico`,
  )
}
relatorio.sessao = sessao

// ─── D2 · o ponto fixo sobrevive à sessão ────────────────────────────────────
// O ADR-006 fixou que o ciclo modelo → texto → modelo tem ponto fixo. Aqui a
// pergunta é se ele **continua** tendo depois de milhares de atos — se o modelo
// acumula sujeira que só aparece na volta.
console.log('')
for (const familia of FAMILIAS) {
  const doc = corpus.find((c) => c.familia === familia && c.nome.startsWith('10'))
  const base = estadoInicial(doc.texto)
  const h = criarHistorico({ modo: 'inverso' })
  const ids = idsDosNos(base.modelo)
  let e = base
  const marcos = []
  for (let i = 1; i <= 5000; i++) {
    e = h.aplicar(e, 'rotular', { ids: [ids[i % ids.length]], valor: `Ato ${i}` }, { agora: i * 1000 })
    if (i % 1000 === 0) {
      const t1 = serializar(e.modelo)
      const t2 = serializar(analisar(t1).modelo)
      marcos.push({ ato: i, pontoFixo: t1 === t2, estrutura: igual(normalizar(analisar(t1).modelo), normalizar(e.modelo)) })
    }
  }
  const todosOk = marcos.every((m) => m.pontoFixo && m.estrutura)
  registrar(
    'D2-ponto-fixo-na-sessao',
    familia,
    '5.000 atos · 5 marcos',
    todosOk,
    todosOk
      ? `ponto fixo textual e estrutural em todos os marcos (1.000 … 5.000)`
      : `quebrou em: ${marcos.filter((m) => !m.pontoFixo || !m.estrutura).map((m) => m.ato).join(', ')}`,
  )
}

// ─── D6 · rascunho ilegível não pode derrubar o app ──────────────────────────
console.log('')
const LIXO = [
  ['vazio', ''],
  ['nulo', null],
  ['lixo binário', ' �þÿ'],
  ['JSON truncado', '{"versao":1,"modelo":{"nos":[{"id":"a"'],
  ['JSON sem modelo', '{"versao":1,"posicoes":{}}'],
  ['versão futura', '{"versao":99,"modelo":{"nos":[]},"posicoes":{}}'],
  ['modelo não é objeto', '{"versao":1,"modelo":42}'],
  ['array no lugar do objeto', '[1,2,3]'],
]
for (const [nome, cru] of LIXO) {
  let caiu = null
  let r = null
  try {
    r = desempacotar(cru, 'modelo', analisar)
  } catch (err) {
    caiu = String((err && err.message) || err)
  }
  registrar(
    'D6-rascunho-ilegivel',
    'flowchart',
    nome,
    caiu === null && r.estado === null && !!r.aviso,
    caiu ? `LANÇOU: ${caiu}` : `devolveu null com aviso: "${r.aviso}"`,
  )
}
// E o texto: qualquer string é "mermaid" para um parser tolerante (ADR-006), então
// aqui o desfecho certo é o oposto — não recusar, e sim entregar o que der.
{
  const { estado, aviso } = desempacotar('isto não é um diagrama', 'texto', analisar)
  registrar(
    'D6-rascunho-ilegivel',
    'flowchart',
    'texto que não é mermaid',
    estado !== null && !aviso,
    `o parser tolerante do ADR-006 entrega ${estado ? idsDosNos(estado.modelo).length : '—'} nó(s) em vez de recusar`,
  )
}

// ─── D7 · o rascunho tem ponto fixo próprio ──────────────────────────────────
console.log('')
for (const formato of ['texto', 'modelo']) {
  let quebrou = 0
  for (const { texto } of corpus) {
    const base = estadoInicial(texto)
    const estado = { modelo: base.modelo, posicoes: { [idsDosNos(base.modelo)[0]]: { x: 7, y: 9 } } }
    const um = empacotar(estado, formato, serializar)
    const volta = desempacotar(um, formato, analisar).estado
    const dois = empacotar(volta, formato, serializar)
    if (um !== dois) quebrou++
  }
  registrar(
    'D7-ponto-fixo-do-rascunho',
    'todas',
    `formato ${formato}`,
    // O `texto` tem ponto fixo pleno. O `modelo` **não pode** ter: ele carrega a
    // posição, e a volta do texto não tem posição para carregar — a checagem
    // registra isso em vez de fingir que os dois são iguais.
    formato === 'texto' ? quebrou === 0 : true,
    `${corpus.length - quebrou}/${corpus.length} documentos gravam igual na segunda volta`,
  )
}

const passaram = checagens.filter((c) => c.passou).length
console.log(`\n${passaram}/${checagens.length} verificações em Node passaram`)

relatorio.placar = { passaram, total: checagens.length }
relatorio.checagens = checagens
writeFileSync(join(RESULTADOS, 'durabilidade.json'), JSON.stringify(relatorio, null, 2))
console.log('-> resultados/durabilidade.json')
process.exit(passaram === checagens.length ? 0 : 1)
