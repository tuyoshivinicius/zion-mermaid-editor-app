// A metade da verificação que não precisa de navegador, agora sobre **três
// famílias** em vez de uma.
//
// O Flowchart entra como linha de base — é o código do ADR-006 sem retoque, e
// as mesmas checagens rodam sobre ele. Sem essa coluna, "Class passou" não teria
// contra o que ser lido.
//
// A checagem que este spike acrescenta ao repertório do ADR-006 é a F7: se a
// **ordem** dos agregados é semântica. É ela que decide se o núcleo pode ter uma
// normalização só.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TIPOS } from '../src/registro.js'
import { codificar, codificarSemAspas, decodificar } from '../src/nucleo/rotulo.js'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')

const FAMILIAS = ['flowchart', 'classe', 'sequencia']

const corpora = Object.fromEntries(
  FAMILIAS.map((f) => [
    f,
    readdirSync(join(RAIZ, 'corpus', f))
      .filter((n) => n.endsWith('.mmd'))
      .sort()
      .map((n) => ({ nome: n, texto: readFileSync(join(RAIZ, 'corpus', f, n), 'utf8').replace(/\n$/, '') })),
  ]),
)

const checagens = []
const registrar = (id, familia, alvo, passou, detalhe) => {
  checagens.push({ id, familia, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(24)} ${familia.padEnd(10)} ${String(alvo).padEnd(22)} ${detalhe ?? ''}`,
  )
}

// ─── F1 · o parser aceita o corpus da sua família sem acusar erro ────────────
for (const f of FAMILIAS) {
  for (const c of corpora[f]) {
    const { erros } = TIPOS[f].analisar(c.texto)
    registrar('F1-parser-aceita', f, c.nome, erros.length === 0, erros.map((e) => `L${e.linha}: ${e.mensagem}`).join(' · '))
  }
}

// ─── F2 · round-trip estrutural: o modelo sobrevive à ida e volta ────────────
console.log('')
for (const f of FAMILIAS) {
  const t = TIPOS[f]
  for (const c of corpora[f]) {
    const m1 = t.analisar(c.texto).modelo
    const m2 = t.analisar(t.serializar(m1)).modelo
    const a = JSON.stringify(t.normalizar(m1))
    const b = JSON.stringify(t.normalizar(m2))
    registrar('F2-roundtrip', f, c.nome, a === b, a === b ? '' : primeiraDiferenca(a, b))
  }
}

// ─── F3 · ponto fixo textual: normaliza uma vez, depois não muda mais ────────
console.log('')
for (const f of FAMILIAS) {
  const t = TIPOS[f]
  for (const c of corpora[f]) {
    const t1 = t.serializar(t.analisar(c.texto).modelo)
    const t2 = t.serializar(t.analisar(t1).modelo)
    registrar('F3-ponto-fixo', f, c.nome, t1 === t2, t1 === t2 ? '' : primeiraDiferenca(t1, t2))
  }
}

// ─── F4 · sintaxe preservada: frontmatter, diretiva e comentário sobrevivem ──
console.log('')
for (const f of FAMILIAS) {
  const t = TIPOS[f]
  for (const c of corpora[f]) {
    const esperado = []
    if (/^---/.test(c.texto)) esperado.push('frontmatter')
    if (/%%\{/.test(c.texto)) esperado.push('diretiva')
    if (/^\s*%%[^{]/m.test(c.texto)) esperado.push('comentario')
    if (!esperado.length) continue

    const saida = t.serializar(t.analisar(c.texto).modelo)
    const faltando = []
    if (esperado.includes('frontmatter') && !saida.startsWith('---')) faltando.push('frontmatter')
    if (esperado.includes('diretiva') && !/%%\{/.test(saida)) faltando.push('diretiva')
    if (esperado.includes('comentario')) {
      const orig = (c.texto.match(/%%(?!\{)[^\n]*/g) || []).length
      const volta = (saida.match(/%%(?!\{)[^\n]*/g) || []).length
      if (volta < orig) faltando.push(`comentario ${volta}/${orig}`)
    }
    registrar('F4-preservado', f, c.nome, faltando.length === 0, faltando.join(' · ') || esperado.join('+'))
  }
}

// ─── F5 · charset: o texto de fora volta como entrou, ou volta marcado ───────
// Cada família tem a sua "fenda de rótulo" natural, e elas não são a mesma
// coisa: no Flowchart o rótulo mora entre aspas dentro da forma; em Class é o
// rótulo da relação, depois do `:`; em Sequence é o texto da mensagem. É o
// mesmo texto hostil atravessando três molduras diferentes.
console.log('')
const HOSTIS = [
  ['ascii simples', 'Passo um'],
  ['acentuação', 'validação de inscrição'],
  ['aspas duplas', 'ele disse "vai" e foi'],
  ['hash', 'ticket #4021'],
  ['ponto e vírgula', 'a; b; c'],
  ['colchetes', 'array[0] e obj{k}'],
  ['parênteses', 'chamar(x, y)'],
  ['pipe', 'a | b | c'],
  ['seta literal', 'entrada --> saída'],
  ['tag html', 'usar <br/> no texto'],
  ['e comercial', 'P&D e M&A'],
  ['dois pontos', 'razão: porque sim'],
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

/** Onde cada família encaixa um texto livre, e como lê de volta. */
const FENDAS = {
  flowchart: {
    montar: (t) => `flowchart TD\n  a[${codificar(t).bruto}] --> b["fim"]`,
    ler: (m) => {
      const n = m.nos.find((x) => x.id === 'a')
      return { texto: n ? n.rotulo : null, marcado: !!n && n.alertas.length > 0 }
    },
  },
  classe: {
    montar: (t) => `classDiagram\n  class A\n  class B\n  A --> B : ${codificarSemAspas(t).bruto}`,
    ler: (m) => {
      const r = m.relacoes[0]
      return { texto: r ? r.rotulo : null, marcado: !!r && r.alertas.length > 0 }
    },
  },
  sequencia: {
    montar: (t) => `sequenceDiagram\n  participant A\n  participant B\n  A->>B: ${codificarSemAspas(t).bruto}`,
    ler: (m) => {
      const msg = m.corpo.find((i) => i.especie === 'mensagem')
      return { texto: msg ? msg.texto : null, marcado: !!msg && msg.alertas.length > 0 }
    },
  },
}

const charset = []
for (const f of FAMILIAS) {
  const t = TIPOS[f]
  const fenda = FENDAS[f]
  for (const [nome, texto] of HOSTIS) {
    // O codec sozinho (ida e volta direta), e depois atravessando um documento.
    const cod = f === 'flowchart' ? codificar(texto) : codificarSemAspas(texto)
    const direto = decodificar(f === 'flowchart' ? cod.bruto : `"${cod.bruto}"`).texto
    const lido = fenda.ler(t.analisar(fenda.montar(texto)).modelo)
    const identicoDoc = lido.texto === texto
    const marcado = cod.alertas.length > 0 || lido.marcado

    charset.push({ familia: f, nome, identicoDireto: direto === texto, identicoDoc, marcado })
    registrar(
      'F5-charset',
      f,
      nome,
      identicoDoc,
      identicoDoc ? (marcado ? 'idêntico + MARCADO' : 'idêntico') : `voltou ${JSON.stringify(lido.texto)}`,
    )
  }
}

// ─── F6a · prefixo de digitação nunca lança ──────────────────────────────────
console.log('')
for (const f of FAMILIAS) {
  const t = TIPOS[f]
  for (const c of corpora[f]) {
    let quebrou = null
    for (let i = 1; i <= c.texto.length; i++) {
      try {
        const { modelo } = t.analisar(c.texto.slice(0, i))
        if (!modelo) quebrou = quebrou ?? i
      } catch {
        quebrou = quebrou ?? i
        break
      }
    }
    registrar('F6a-prefixo-nao-quebra', f, c.nome, quebrou === null, quebrou === null ? `${c.texto.length} prefixos` : `lançou em ${quebrou}`)
  }
}

// ─── F6b · uma linha inválida no meio não leva o resto junto ─────────────────
// As injeções são por família: cada uma usa os estados de digitação e o lixo
// estrutural que fazem sentido naquela sintaxe.
console.log('')
const INJECOES = {
  flowchart: ['A -->', 'B[[[oops', 'subgraph', '-->-->', 'A --> B]]'],
  classe: ['A --', 'class', '-->-->', '<<oops', '}'],
  sequencia: ['A->>', 'loop', 'Note right of', '->>B: x', '<<oops'],
}

for (const f of FAMILIAS) {
  const t = TIPOS[f]
  for (const c of corpora[f]) {
    const antes = nosDe(f, t.analisar(c.texto).modelo)
    const linhas = c.texto.split('\n')
    const alvo = pontoDeInjecao(f, linhas)

    let piorSobrevivencia = 1
    let sinalizou = 0
    for (const q of INJECOES[f]) {
      const sujo = [...linhas.slice(0, alvo), '  ' + q, ...linhas.slice(alvo)].join('\n')
      const { modelo, erros, avisos } = t.analisar(sujo)
      const depois = nosDe(f, modelo)
      const sobreviveu = antes.filter((id) => depois.includes(id)).length / (antes.length || 1)
      piorSobrevivencia = Math.min(piorSobrevivencia, sobreviveu)
      if (erros.length || avisos.length) sinalizou++
    }
    const ok = piorSobrevivencia === 1 && sinalizou === INJECOES[f].length
    registrar(
      'F6b-linha-invalida',
      f,
      c.nome,
      ok,
      `nós preservados ${(piorSobrevivencia * 100).toFixed(0)}% · sinalizou ${sinalizou}/${INJECOES[f].length}`,
    )
  }
}

/** Os "nós" de cada família: o que a prévia não pode perder enquanto se digita. */
function nosDe(f, m) {
  if (f === 'flowchart') return m.nos.map((n) => n.id)
  if (f === 'classe') return m.classes.map((c) => c.id)
  return m.participantes.map((p) => p.id)
}

/**
 * Onde injetar o lixo. Em Class a injeção não pode cair dentro do corpo de uma
 * classe: ali qualquer linha é membro válido, e o teste não testaria nada.
 */
function pontoDeInjecao(f, linhas) {
  // Depois do cabeçalho: lixo dentro do frontmatter seria só preservado, e o
  // teste não teria testado nada.
  const cabecalho = linhas.findIndex((l) => /^\s*(flowchart|graph|classDiagram|sequenceDiagram)\b/i.test(l))
  const inicio = cabecalho + 1
  const meio = inicio + Math.floor((linhas.length - inicio) / 2)
  if (f !== 'classe') return meio

  // Em Class a injeção não pode cair dentro do corpo de uma classe: ali qualquer
  // linha é membro válido, e o teste não testaria nada.
  let prof = 0
  let ultimoRaso = inicio
  for (let i = inicio; i < meio && i < linhas.length; i++) {
    prof += (linhas[i].match(/\{/g) || []).length
    prof -= (linhas[i].match(/\}/g) || []).length
    if (prof === 0) ultimoRaso = i + 1
  }
  return ultimoRaso
}

// ─── F7 · a ordem do agregado é semântica? ───────────────────────────────────
// A checagem que este spike acrescenta. No Flowchart, `conexoes` é conjunto:
// permutar não muda o diagrama, e por isso o `normalizar` do ADR-006 pode
// ordenar. Se em alguma família permutar **mudar** o modelo normalizado, então
// não existe uma normalização única no núcleo — e a hipótese do modelo único
// perde o seu campo mais central.
console.log('')
for (const f of FAMILIAS) {
  const t = TIPOS[f]
  const alvo = corpora[f].find((c) => c.nome.startsWith('10')) || corpora[f][0]
  const m = t.analisar(alvo.texto).modelo
  const antes = JSON.stringify(t.normalizar(m))
  const depois = JSON.stringify(t.normalizar(t.permutar(m)))
  const invariante = antes === depois
  registrar(
    'F7-ordem-do-agregado',
    f,
    alvo.nome,
    true, // caracterização, não aprovação: a linha existe para ser lida
    invariante
      ? `permutar NÃO muda o modelo — a ordem é ruído, o núcleo pode ordenar (${t.agregado(m).length} itens)`
      : `permutar MUDA o modelo — a ordem é semântica, o núcleo não pode ordenar (${t.agregado(m).length} itens)`,
  )
}

// ─── F8 · calibragem de custo: quantas linhas custa cada família ─────────────
console.log('')
const contar = (rel) => readFileSync(join(RAIZ, rel), 'utf8').split('\n').length
const ARQUIVOS = {
  nucleo: ['src/nucleo/modelo.js', 'src/nucleo/rotulo.js', 'src/registro.js'],
  flowchart: ['src/tipos/flowchart/modelo.js', 'src/tipos/flowchart/parser.js', 'src/tipos/flowchart/serializar.js'],
  classe: ['src/tipos/classe/modelo.js', 'src/tipos/classe/parser.js', 'src/tipos/classe/serializar.js'],
  sequencia: ['src/tipos/sequencia/modelo.js', 'src/tipos/sequencia/parser.js', 'src/tipos/sequencia/serializar.js'],
}
const calibragem = {}
for (const [nome, arquivos] of Object.entries(ARQUIVOS)) {
  const porArquivo = Object.fromEntries(arquivos.map((a) => [a.replace('src/', ''), contar(a)]))
  calibragem[nome] = { total: Object.values(porArquivo).reduce((a, b) => a + b, 0), porArquivo }
  console.log(`     calibragem  ${nome.padEnd(12)} ${String(calibragem[nome].total).padStart(4)} linhas`)
}

function primeiraDiferenca(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return `divergiu em ${i}: ${JSON.stringify(a.slice(i, i + 70))} != ${JSON.stringify(b.slice(i, i + 70))}`
}

const passaram = checagens.filter((c) => c.passou).length
console.log(`\n${passaram}/${checagens.length} checagens de fidelidade passaram`)

mkdirSync(join(RAIZ, 'resultados'), { recursive: true })
writeFileSync(
  join(RAIZ, 'resultados', 'fidelidade.json'),
  JSON.stringify(
    {
      gerado: 'verify/fidelidade.mjs',
      corpora: Object.fromEntries(FAMILIAS.map((f) => [f, corpora[f].map((c) => c.nome)])),
      placar: { passaram, total: checagens.length },
      calibragem,
      checagens,
      charset,
    },
    null,
    2,
  ),
)
console.log('-> resultados/fidelidade.json')
process.exit(passaram === checagens.length ? 0 : 1)
