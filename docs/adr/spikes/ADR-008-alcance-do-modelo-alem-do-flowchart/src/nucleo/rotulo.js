// Codec do rótulo: texto puro (o que a Marina digitou ou colou) <-> rótulo
// mermaid (o que sai no código).
//
// É aqui que mora a promessa mais afiada do discovery, e a razão de o codec ser
// um arquivo só:
//
//   "O que entra é texto puro, sem a formatação da origem, preservado como ela
//    trouxe. Caractere que o tipo de diagrama não expressa em código deixa o
//    rótulo marcado — o texto nunca é alterado em silêncio para caber."
//
// Três desfechos possíveis por caractere, e o spike mede os três separadamente:
//   1. sobrevive ao ciclo e o mermaid renderiza -> ok
//   2. sobrevive ao ciclo mas o mermaid não renderiza fiel -> **marcado**
//   3. o texto volta diferente -> falha (é o "em silêncio" que o discovery proíbe)

/** Escapes que precisam sair do texto puro para o código não mudar de significado. */
const ESCAPAR = {
  '"': '#quot;',
  '#': '#35;',
  '<': '#60;', // sem isso, um `<br/>` digitado pela pessoa viraria quebra de linha na volta
  '>': '#62;',
  '&': '#38;', // `&` é separador de lista de nós no mermaid
}

const RE_ENTIDADE = /#(quot|amp|lt|gt|nbsp|semi|colon|\d{1,7});/g
const NOMEADAS = { quot: '"', amp: '&', lt: '<', gt: '>', nbsp: ' ', semi: ';', colon: ':' }

// Controle de verdade: exclui \t (tratado à parte) e \n (que vira <br/>).
// Montado a partir de texto de escape para não haver byte de controle na fonte.
const CLASSE_CONTROLE = '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F'
const RE_CONTROLE = new RegExp('[' + CLASSE_CONTROLE + ']')
const RE_QUEBRA = /<br\s*\/?>/gi
const TAB = String.fromCharCode(9)

/**
 * texto puro -> rótulo pronto para entrar no código, entre aspas.
 * @returns { bruto, alertas }
 */
/**
 * O que o tipo de diagrama não expressa fielmente neste texto.
 *
 * A marca é propriedade **do modelo**, não da direção de onde o texto veio:
 * um rótulo colado de fora e um rótulo digitado no código com o mesmo conteúdo
 * têm que ficar marcados igual. Por isso as duas pontas do codec chamam isto.
 */
export function checarExpressividade(texto) {
  const alertas = []
  if (texto == null) return alertas

  if (RE_CONTROLE.test(texto)) {
    alertas.push({
      tipo: 'caractere-de-controle',
      detalhe: 'o tipo de diagrama não expressa caractere de controle no código',
    })
  }
  if (texto.includes(TAB)) {
    alertas.push({ tipo: 'tabulacao', detalhe: 'tabulação não é preservada na renderização' })
  }
  if (/ {2,}/.test(texto) || texto !== texto.trim()) {
    alertas.push({
      tipo: 'espaco-colapsado',
      detalhe: 'espaços repetidos ou nas bordas colapsam ao renderizar',
    })
  }
  return alertas
}

export function codificar(texto) {
  if (texto == null) return { bruto: null, alertas: [] }
  const alertas = checarExpressividade(texto)

  let s = ''
  for (const ch of texto) {
    if (ESCAPAR[ch] !== undefined) s += ESCAPAR[ch]
    else if (ch === '\n') s += '<br/>'
    else if (ch === TAB || RE_CONTROLE.test(ch)) s += '#' + ch.codePointAt(0) + ';'
    else s += ch
  }
  return { bruto: '"' + s + '"', alertas }
}

/**
 * Acréscimo do ADR-008 ao codec do ADR-006 — e ele próprio é um achado pequeno.
 *
 * No Flowchart todo rótulo cabe entre aspas. Em Class (rótulo de relação, depois
 * do `:`) e em Sequence (texto da mensagem e da nota) o texto corre até o fim da
 * linha, **sem aspas** — e escapar `#`, `<` ou `&` ali muda o que aparece na
 * tela. O único caractere que precisa sair é a quebra de linha, que encerraria
 * o statement.
 *
 * Ou seja: o codec do núcleo é compartilhado, mas não é único — a moldura do
 * rótulo é da família, não do núcleo.
 */
export function codificarSemAspas(texto) {
  if (texto == null) return { bruto: null, alertas: [] }
  const alertas = checarExpressividade(texto)
  let s = ''
  for (const ch of texto) {
    // `&` e `"` não são escapados: fora das aspas eles são texto comum, e o
    // decodificador correspondente não os interpreta.
    if (ch === '<' || ch === '>' || ch === '#') s += '#' + ch.codePointAt(0) + ';'
    else if (ch === '\n') s += '<br/>'
    else if (ch === TAB || RE_CONTROLE.test(ch)) s += '#' + ch.codePointAt(0) + ';'
    else s += ch
  }
  // Espaço nas bordas é o caso em que a fenda sem aspas quase perde o texto: a
  // linha do código é aparada antes de o statement ser lido, então um espaço
  // solto no começo ou no fim simplesmente não chega. Emiti-lo como entidade é
  // o que mantém a promessa do discovery — o texto volta byte a byte.
  s = s.replace(/^ +/, (m) => '#32;'.repeat(m.length)).replace(/ +$/, (m) => '#32;'.repeat(m.length))
  return { bruto: s, alertas }
}

/**
 * O inverso de `codificarSemAspas`. Não tira aspas e não trata crase: numa fenda
 * sem moldura, aspas e crase são texto que a pessoa digitou, não delimitador.
 *
 * É a segunda metade do achado: o núcleo empresta o **vocabulário** de escape
 * às três famílias, mas o par codec é por moldura, não por documento.
 */
export function decodificarSemAspas(bruto) {
  const alertas = []
  if (bruto == null) return { texto: null, alertas }
  let s = String(bruto)
  s = s.replace(RE_QUEBRA, '\n')
  s = s.replace(RE_ENTIDADE, (m, corpo) => {
    if (NOMEADAS[corpo] !== undefined) return NOMEADAS[corpo]
    const n = Number(corpo)
    return Number.isFinite(n) ? String.fromCodePoint(n) : m
  })
  alertas.push(...checarExpressividade(s))
  return { texto: s, alertas }
}

/**
 * rótulo cru vindo do código (com ou sem aspas) -> texto puro.
 * Aceita também a string markdown de backtick, que o mermaid trata como rótulo
 * formatado — o spike a registra como não-expressa em texto puro.
 */
export function decodificar(bruto) {
  const alertas = []
  if (bruto == null) return { texto: null, alertas }

  let s = bruto.trim()
  let markdown = false

  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') s = s.slice(1, -1)
  // Aspas abertas e ainda não fechadas: estado de digitação, não de erro.
  else if (s.length >= 1 && s[0] === '"') s = s.slice(1)
  if (s.length >= 2 && s[0] === '`' && s[s.length - 1] === '`') {
    s = s.slice(1, -1)
    markdown = true
  }
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') s = s.slice(1, -1)

  if (markdown) {
    alertas.push({
      tipo: 'markdown-no-rotulo',
      detalhe: 'string markdown do mermaid: formatação da origem não é texto puro',
    })
  }

  s = s.replace(RE_QUEBRA, '\n')
  s = s.replace(RE_ENTIDADE, (m, corpo) => {
    if (NOMEADAS[corpo] !== undefined) return NOMEADAS[corpo]
    const n = Number(corpo)
    return Number.isFinite(n) ? String.fromCodePoint(n) : m
  })

  alertas.push(...checarExpressividade(s))
  return { texto: s, alertas }
}
