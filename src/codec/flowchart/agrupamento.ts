// Reconhecedores de `subgraph …` (abre) e `end` (fecha) + emissor do bloco (R1) —
// vocabulário de agrupamento da família flowchart (contracts/codec-grafo-dirigido.md).
// Módulo da FAMÍLIA: pode nomear `subgraph`/`end` (o Princípio XII vale só p/ o núcleo).
//
// O reconhecedor de abertura garante o Agrupamento, aninha por menção (M3: se a pilha
// não está vazia, o novo bloco é membro do topo) e ABRE o container; o de `end` fecha.
// A mecânica de pertencimento do topo é do núcleo (agnóstica) — aqui só se chamam
// abrir/fechar/registrarMembro.

import type { Reconhecedor, Ctx } from '../nucleo/reconhecedores'
import type { Agrupamento } from '../../modelo/modelo'
import { garantirAgrupamento } from '../../modelo/modelo'
import { decodificar, codificar } from '../nucleo/rotulo'

const RE_ABRE = /^subgraph(\s+(.*))?$/
const RE_ID = /^([A-Za-z0-9_]+)(.*)$/

interface AbreLido {
  id: string
  titulo: string | null
}

/** Lê o cabeçalho de um bloco: `subgraph id[Título]` | `subgraph id` | `subgraph Título`. */
function lerAbre(rest: string, quantosJa: number): AbreLido {
  const r = rest.trim()
  if (r === '') return { id: `_sub${quantosJa + 1}`, titulo: null }

  const m = RE_ID.exec(r)
  if (m && (m[2] === '' || m[2][0] === '[')) {
    const id = m[1]
    const resto = m[2]
    if (resto === '') return { id, titulo: null }
    // Forma com colchete: `id[Título]` (fecho no fim) ou parcial (colchete aberto — digitação).
    const interno = resto.slice(1)
    const conteudo = interno.endsWith(']') ? interno.slice(0, -1) : interno
    return { id, titulo: decodificar(conteudo).texto }
  }
  // Sem id casável (título com espaços/aspas) → id anônimo do contador da análise (o produto NÃO escreve).
  return { id: `_sub${quantosJa + 1}`, titulo: decodificar(r).texto }
}

export const reconhecedorAbreAgrupamento: Reconhecedor = {
  tentar(statement: string, ctx: Ctx): boolean {
    const m = RE_ABRE.exec(statement.trim())
    if (!m) return false
    const lido = lerAbre(m[2] ?? '', ctx.modelo.agrupamentos.length)
    const g = garantirAgrupamento(ctx.modelo, lido.id)
    if (lido.titulo != null) g.titulo = lido.titulo
    // Aninhar por menção (M3): um bloco aberto dentro de outro é membro do topo — ANTES de abrir o seu.
    ctx.registrarMembro(lido.id)
    ctx.abrirContainer(lido.id)
    return true
  },
}

export const reconhecedorFechaAgrupamento: Reconhecedor = {
  tentar(statement: string, ctx: Ctx): boolean {
    if (statement.trim() !== 'end') return false
    ctx.fecharContainer()
    return true
  },
}

/** Um título é "simples" se cabe cru entre colchetes sem risco para o mermaid. */
const RE_TITULO_SIMPLES = /^[\p{L}\p{N} ]+$/u
function tituloSimples(texto: string): boolean {
  return (
    texto.length > 0 &&
    texto === texto.trim() &&
    !/ {2}/.test(texto) &&
    RE_TITULO_SIMPLES.test(texto)
  )
}

/** modelo → a linha `subgraph …` (abre). Determinística (dá o ponto fixo). */
export function emitirAgrupamentoAbre(g: Agrupamento): string {
  if (g.titulo == null) return `subgraph ${g.id}`
  if (tituloSimples(g.titulo)) return `subgraph ${g.id}[${g.titulo}]`
  return `subgraph ${g.id}[${codificar(g.titulo).bruto}]`
}

/** modelo → a linha `end` (fecha). */
export function emitirAgrupamentoFecha(): string {
  return 'end'
}
