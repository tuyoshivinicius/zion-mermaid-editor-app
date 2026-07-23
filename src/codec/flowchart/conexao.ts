// Reconhecedor + emissor da ARESTA dirigida (R1) — vocabulário de conexão da
// família flowchart (contracts/codec-grafo-dirigido.md, research §9). Módulo da
// FAMÍLIA: pode nomear tokens de aresta à vontade (o Princípio XII vale só p/ o núcleo).
//
// Lê `origem CONECTIVO destino`, com rótulo `|texto|` ou `-- texto -->`. Preserva o
// LEXEMA do conectivo (byte-fiel, FR-014/SC-009). Garante as pontas (materializa os
// nós que faltarem, como o mermaid de fora) e, dentro de um bloco, agrupa-as (M2).
// Fora do vocabulário lido (fan-out `a --> b & c`, ponta com rótulo) → ilegível por inteiro.

import type { Reconhecedor, Ctx } from '../nucleo/reconhecedores'
import type { Conexao, Modelo, Alerta } from '../../modelo/modelo'
import { garantirNo } from '../../modelo/modelo'
import { decodificar, codificar } from '../nucleo/rotulo'

// A família de conectivos dirigidos que o R1 LÊ (research §9). Ordem: mais específico
// primeiro, para `-.->` não ser cortado como `-->` etc.
const CON = '(<-->|-\\.->|-\\.-|==>|===|-->|---|--x|--o)'
const RE_PIPE = new RegExp(`^([A-Za-z0-9_]+)\\s*${CON}\\|([^|]*)\\|\\s*([A-Za-z0-9_]+)$`)
const RE_PLAIN = new RegExp(`^([A-Za-z0-9_]+)\\s*${CON}\\s*([A-Za-z0-9_]+)$`)
// Aresta ainda sem destino (estado de digitação, tolerante): avisa, não derruba (Princípio IX).
const RE_PARCIAL = new RegExp(`^([A-Za-z0-9_]+)\\s*${CON}\\s*$`)
// Rótulo no meio: `a -- texto --> b` (conectivo canônico = a seta final).
const RE_MEIO = /^([A-Za-z0-9_]+)\s*(?:--|==|-\.)\s+(.+?)\s+(-->|---|==>|===|-\.->|-\.-|--x|--o)\s*([A-Za-z0-9_]+)$/

interface ConexaoLida {
  origem: string
  destino: string
  texto: string | null
  conectivo: string
  alertas: Alerta[]
}

/** O par (origem, destino) de uma linha de conexão, ou `null` — para a cirúrgica casar a linha. */
export function origemDestinoDe(statement: string): { origem: string; destino: string } | null {
  const l = lerConexao(statement.trim())
  return l ? { origem: l.origem, destino: l.destino } : null
}

function lerConexao(s: string): ConexaoLida | null {
  let m = RE_PIPE.exec(s)
  if (m) {
    const d = decodificar(m[3])
    return { origem: m[1], conectivo: m[2], texto: d.texto, destino: m[4], alertas: d.alertas }
  }
  m = RE_MEIO.exec(s)
  if (m) {
    const d = decodificar(m[2])
    return { origem: m[1], conectivo: m[3], texto: d.texto, destino: m[4], alertas: d.alertas }
  }
  m = RE_PLAIN.exec(s)
  if (m) {
    return { origem: m[1], conectivo: m[2], texto: null, destino: m[3], alertas: [] }
  }
  return null
}

/**
 * Reconhecedor de aresta dirigida. Materializa a `Conexao` + garante as duas pontas,
 * e — dentro de um bloco — agrupa as pontas (M2/FR-019). `id` efêmero temporário; o
 * store reconcilia para o `eN` durável (research §4).
 */
export const reconhecedorConexao: Reconhecedor = {
  tentar(statement: string, ctx: Ctx): boolean {
    const s = statement.trim()
    const lida = lerConexao(s)
    if (!lida) {
      // Aresta incompleta (`a -->`) enquanto se digita → aviso, materializa só a origem.
      const p = ctx.tolerante ? RE_PARCIAL.exec(s) : null
      if (p) {
        garantirNo(ctx.modelo, p[1])
        ctx.registrarMembro(p[1])
        ctx.avisos.push({ linha: ctx.linha, trecho: s, mensagem: `aresta de \`${p[1]}\` sem destino` })
        return true
      }
      return false
    }

    garantirNo(ctx.modelo, lida.origem)
    garantirNo(ctx.modelo, lida.destino)
    const c: Conexao = {
      id: `e${ctx.modelo.conexoes.length + 1}`, // temporário; o store reconcilia p/ o `eN` de sessão
      origem: lida.origem,
      destino: lida.destino,
      texto: lida.texto,
      conectivo: lida.conectivo,
      alertas: lida.alertas,
    }
    ctx.modelo.conexoes.push(c)
    // Qualquer menção dentro do bloco cria pertencimento — inclusive ponta de aresta (M2).
    ctx.registrarMembro(lida.origem)
    ctx.registrarMembro(lida.destino)
    return true
  },
}

/** Um rótulo de aresta é "simples" se cabe cru entre pipes sem risco (sem `|`, sem borda). */
const RE_ARESTA_SIMPLES = /^[\p{L}\p{N} ]+$/u
function arestaSimples(texto: string): boolean {
  return (
    texto.length > 0 &&
    texto === texto.trim() &&
    !/ {2}/.test(texto) &&
    RE_ARESTA_SIMPLES.test(texto)
  )
}

/**
 * modelo → UM statement de conexão (research §3). Preserva o lexema do conectivo; o
 * `|` do texto vira `#124;` (o pipe é delimitador). Determinístico (dá o ponto fixo).
 */
export function emitirConexao(c: Conexao, _m?: Modelo): string {
  const seta = c.conectivo
  if (c.texto == null) return `${c.origem} ${seta} ${c.destino}`
  const label = arestaSimples(c.texto)
    ? c.texto
    : (codificar(c.texto).bruto ?? '""').replace(/\|/g, '#124;')
  return `${c.origem} ${seta}|${label}| ${c.destino}`
}
