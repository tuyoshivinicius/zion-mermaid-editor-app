// Metade da verificação que não precisa de navegador: o ciclo
// texto -> modelo -> texto, medido contra o corpus.
//
// Nada aqui é afirmado por leitura: cada checagem compara estruturas ou bytes.
// A outra metade — o mermaid de verdade aceitando a saída, e a latência dentro
// do envelope do ADR-004 — vive em `verify/run.mjs`, que precisa de DOM.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { analisar } from '../src/parser.js'
import { serializar } from '../src/serializar.js'
import { normalizar } from '../src/modelo.js'
import { codificar, decodificar } from '../src/rotulo.js'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const CORPUS = join(RAIZ, 'corpus')

const corpus = readdirSync(CORPUS)
  .filter((f) => f.endsWith('.mmd'))
  .sort()
  .map((f) => ({ nome: f, texto: readFileSync(join(CORPUS, f), 'utf8').replace(/\n$/, '') }))

const checagens = []
const registrar = (id, alvo, passou, detalhe) => {
  checagens.push({ id, alvo, passou, detalhe })
  const marca = passou ? 'ok  ' : 'FALHA'
  console.log(`${marca} ${id.padEnd(28)} ${alvo.padEnd(24)} ${detalhe ?? ''}`)
}

// ─── F1 · o parser aceita o corpus sem acusar erro ────────────────────────────
for (const c of corpus) {
  const { erros } = analisar(c.texto)
  registrar('F1-parser-aceita', c.nome, erros.length === 0, erros.map((e) => `L${e.linha}: ${e.mensagem}`).join(' · '))
}

// ─── F2 · round-trip estrutural: o modelo sobrevive à ida e volta ─────────────
for (const c of corpus) {
  const m1 = analisar(c.texto).modelo
  const t2 = serializar(m1)
  const m2 = analisar(t2).modelo
  const a = JSON.stringify(normalizar(m1))
  const b = JSON.stringify(normalizar(m2))
  registrar('F2-roundtrip-estrutural', c.nome, a === b, a === b ? '' : primeiraDiferenca(a, b))
}

// ─── F3 · ponto fixo textual: normaliza uma vez, depois não muda mais ─────────
for (const c of corpus) {
  const t1 = serializar(analisar(c.texto).modelo)
  const t2 = serializar(analisar(t1).modelo)
  registrar('F3-ponto-fixo', c.nome, t1 === t2, t1 === t2 ? '' : primeiraDiferenca(t1, t2))
}

// ─── F4 · sintaxe preservada: frontmatter, diretiva e comentário sobrevivem ───
for (const c of corpus) {
  const m = analisar(c.texto).modelo
  const t = serializar(m)
  const esperado = []
  if (/^---/.test(c.texto)) esperado.push('frontmatter')
  if (/%%\{/.test(c.texto)) esperado.push('diretiva')
  if (/^\s*%%[^{]/m.test(c.texto)) esperado.push('comentario')
  if (!esperado.length) continue

  const faltando = []
  if (esperado.includes('frontmatter') && !t.startsWith('---')) faltando.push('frontmatter')
  if (esperado.includes('diretiva') && !/%%\{/.test(t)) faltando.push('diretiva')
  if (esperado.includes('comentario')) {
    const orig = (c.texto.match(/%%(?!\{)[^\n]*/g) || []).length
    const volta = (t.match(/%%(?!\{)[^\n]*/g) || []).length
    if (volta < orig) faltando.push(`comentario ${volta}/${orig}`)
  }
  registrar('F4-sintaxe-preservada', c.nome, faltando.length === 0, faltando.join(' · ') || esperado.join('+'))
}

// ─── F5 · charset: o texto de fora volta como entrou, ou volta marcado ────────
const HOSTIS = [
  ['ascii simples', 'Passo um'],
  ['acentuação', 'validação de inscrição'],
  ['aspas duplas', 'ele disse "vai" e foi'],
  ['aspas simples', "o 'quase' pronto"],
  ['hash', 'ticket #4021'],
  ['ponto e vírgula', 'a; b; c'],
  ['colchetes', 'array[0] e obj{k}'],
  ['parênteses', 'chamar(x, y)'],
  ['pipe', 'a | b | c'],
  ['seta literal', 'entrada --> saída'],
  ['tag html', 'usar <br/> no texto'],
  ['e comercial', 'P&D e M&A'],
  ['emoji', 'lançar 🚀 com ✅'],
  ['cirílico', 'Привет мир'],
  ['CJK', '図の説明'],
  ['árabe (RTL)', 'مرحبا بالعالم'],
  ['matemático', 'x ≤ y ∧ z ≥ 0'],
  ['quebra de linha', 'primeira linha\nsegunda linha'],
  ['espaços repetidos', 'a  b   c'],
  ['espaço nas bordas', '  centro  '],
  ['tabulação', 'col1' + String.fromCharCode(9) + 'col2'],
  ['controle NUL', 'antes' + String.fromCharCode(0) + 'depois'],
  ['string vazia', ''],
  ['só espaço', ' '],
  ['barra invertida', 'caminho\\para\\arquivo'],
  ['crase', 'use `código` aqui'],
]

const charset = []
for (const [nome, texto] of HOSTIS) {
  const { bruto, alertas } = codificar(texto)
  const volta = decodificar(bruto).texto
  const identico = volta === texto

  // e agora o mesmo texto atravessando um documento inteiro
  const doc = `flowchart TD\n  a[${bruto}] --> b["fim"]`
  const m = analisar(doc).modelo
  const noA = m.nos.find((n) => n.id === 'a')
  const viaDoc = noA ? noA.rotulo : null
  const identicoDoc = viaDoc === texto
  const marcado = alertas.length > 0 || (noA && noA.alertas.length > 0)

  charset.push({ nome, texto, bruto, identico, identicoDoc, marcado, alertas: alertas.map((a) => a.tipo) })
  registrar(
    'F5-charset',
    nome,
    identico && identicoDoc,
    identico && identicoDoc ? (marcado ? 'idêntico + MARCADO' : 'idêntico') : `voltou ${JSON.stringify(viaDoc)}`,
  )
}

// ─── F6 · recuperação: prefixo de digitação nunca derruba a prévia ────────────
for (const c of corpus) {
  let quebrou = null
  let vazios = 0
  for (let i = 1; i <= c.texto.length; i++) {
    const prefixo = c.texto.slice(0, i)
    try {
      const { modelo } = analisar(prefixo)
      if (!modelo) quebrou = quebrou ?? i
    } catch (e) {
      quebrou = quebrou ?? i
      break
    }
  }
  registrar(
    'F6a-prefixo-nao-quebra',
    c.nome,
    quebrou === null,
    quebrou === null ? `${c.texto.length} prefixos` : `lançou no caractere ${quebrou}`,
  )
}

// ─── F6b · uma linha inválida no meio não leva o resto junto ──────────────────
const QUEBRAS = ['A -->', 'B[[[oops', 'subgraph', '-->-->', 'A --> B]]']
for (const c of corpus) {
  const m0 = analisar(c.texto).modelo
  const linhas = c.texto.split('\n')
  // A injeção precisa cair na região de statements, não dentro do frontmatter:
  // lixo dentro do YAML seria só preservado, e o teste não teria testado nada.
  const cabecalho = linhas.findIndex((l) => /^\s*(flowchart|graph)\b/i.test(l))
  const inicio = cabecalho + 1
  const meio = inicio + Math.floor((linhas.length - inicio) / 2)
  let piorSobrevivencia = 1
  let sinalizou = 0
  for (const q of QUEBRAS) {
    const sujo = [...linhas.slice(0, meio), '  ' + q, ...linhas.slice(meio)].join('\n')
    const { modelo, erros, avisos } = analisar(sujo)
    const sobreviveu = m0.nos.filter((n) => modelo.nos.some((x) => x.id === n.id)).length / (m0.nos.length || 1)
    piorSobrevivencia = Math.min(piorSobrevivencia, sobreviveu)
    // As duas metades da promessa: o resto do diagrama sobrevive **e** a linha
    // ofensora é sinalizada. Tolerar sem sinalizar reprova tanto quanto quebrar.
    if (erros.length || avisos.length) sinalizou++
  }
  const ok = piorSobrevivencia === 1 && sinalizou === QUEBRAS.length
  registrar(
    'F6b-linha-invalida-isolada',
    c.nome,
    ok,
    `nós preservados: ${(piorSobrevivencia * 100).toFixed(0)}% · sinalizou ${sinalizou}/${QUEBRAS.length}`,
  )
}

function primeiraDiferenca(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return `divergiu em ${i}: ...${JSON.stringify(a.slice(i, i + 70))} != ...${JSON.stringify(b.slice(i, i + 70))}`
}

const passaram = checagens.filter((c) => c.passou).length
console.log(`\n${passaram}/${checagens.length} checagens de fidelidade passaram`)

mkdirSync(join(RAIZ, 'resultados'), { recursive: true })
writeFileSync(
  join(RAIZ, 'resultados', 'fidelidade.json'),
  JSON.stringify(
    {
      gerado: 'verify/fidelidade.mjs',
      corpus: corpus.map((c) => c.nome),
      placar: { passaram, total: checagens.length },
      checagens,
      charset,
    },
    null,
    2,
  ),
)
console.log('-> resultados/fidelidade.json')
