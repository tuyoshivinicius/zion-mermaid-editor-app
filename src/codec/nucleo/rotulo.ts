// Codec do rótulo: texto puro (o que a pessoa digitou ou colou) <-> rótulo
// mermaid (o que sai no código). Porte fiel do spike do ADR-006, validado
// byte-a-byte contra o mermaid 11.16.0 de verdade (Princípio VIII).
//
// Três desfechos por caractere:
//   1. sobrevive ao ciclo e o mermaid renderiza     -> ok
//   2. sobrevive mas o mermaid não renderiza fiel    -> **marcado** (expressividade)
//   3. o texto volta diferente                        -> falha (o "em silêncio" proibido)
//
// Este arquivo é do NÚCLEO: não referencia nenhum nome de família (Princípio XII).

import type { Alerta } from '../../modelo/modelo'

/** Escapes que precisam sair do texto puro para o código não mudar de significado. */
const ESCAPAR: Record<string, string> = {
  '"': '#quot;',
  '#': '#35;',
  '<': '#60;', // sem isso, um `<br/>` digitado pela pessoa viraria quebra de linha na volta
  '>': '#62;',
  '&': '#38;', // `&` é separador de lista de nós no mermaid
}

const RE_ENTIDADE = /#(quot|amp|lt|gt|nbsp|semi|colon|\d{1,7});/g
const NOMEADAS: Record<string, string> = {
  quot: '"',
  amp: '&',
  lt: '<',
  gt: '>',
  nbsp: ' ',
  semi: ';',
  colon: ':',
}

// Controle de verdade: exclui \t (tratado à parte) e \n (que vira <br/>).
// Montado a partir de texto de escape para não haver byte de controle na fonte.
const CLASSE_CONTROLE = '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F'
const RE_CONTROLE = new RegExp('[' + CLASSE_CONTROLE + ']')
const RE_QUEBRA = /<br\s*\/?>/gi
const TAB = String.fromCharCode(9)

/**
 * O que o tipo de diagrama corrente não expressa fielmente neste texto.
 * A marca é propriedade DO MODELO, não da direção de onde o texto veio: um rótulo
 * colado e um rótulo digitado com o mesmo conteúdo ficam marcados igual (ADR-006).
 */
export function checarExpressividade(texto: string | null): Alerta[] {
  const alertas: Alerta[] = []
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

/**
 * texto puro -> rótulo pronto para entrar no código, entre aspas.
 * @returns { bruto, alertas } — `bruto` inclui as aspas; `null` se texto for `null`.
 */
export function codificar(texto: string | null): { bruto: string | null; alertas: Alerta[] } {
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
 * rótulo cru vindo do código (com ou sem aspas) -> texto puro.
 * Aspas delimitam e NÃO entram no rótulo (FR-005/FR-011). Aspas abertas sem fecho
 * são estado de digitação, não erro.
 */
export function decodificar(bruto: string | null): { texto: string | null; alertas: Alerta[] } {
  const alertas: Alerta[] = []
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
  s = s.replace(RE_ENTIDADE, (m, corpo: string) => {
    if (NOMEADAS[corpo] !== undefined) return NOMEADAS[corpo]
    const n = Number(corpo)
    return Number.isFinite(n) ? String.fromCodePoint(n) : m
  })

  alertas.push(...checarExpressividade(s))
  return { texto: s, alertas }
}
