// Reconhecedor de cabeçalho — a exceção nomeada da FR-005 (contracts/codec.md).
// Este módulo é da FAMÍLIA flowchart: pode nomear as declarações à vontade
// (a proibição do Princípio XII vale só para o núcleo).

import type { Reconhecedor, Ctx } from '../nucleo/reconhecedores'

/** Declaração do próprio tipo (flowchart/graph), com ou sem orientação. */
export const RE_CABECALHO_FLOWCHART = /^(?:flowchart|graph)(?:\s+(?:TB|TD|BT|RL|LR))?$/

/** As outras quatro declarações do escopo — reconhecidas para DESCARTAR, sem trocar o tipo. */
export const RE_CABECALHO_OUTRO_TIPO =
  /^(?:stateDiagram-v2|stateDiagram|classDiagram|sequenceDiagram|erDiagram)(?:\s+(?:TB|TD|BT|RL|LR))?$/

/**
 * Reconhece as CINCO declarações do escopo (com ou sem orientação, em qualquer
 * posição) e as descarta — nunca vira nó, NÃO troca o tipo (fixo no R0). Conjunto
 * fechado: `pie`, `gantt`, `mindmap`… não casam e caem na regra comum (viram nó).
 */
export const reconhecedorCabecalho: Reconhecedor = {
  tentar(statement: string, _ctx: Ctx): boolean {
    const s = statement.trim()
    return RE_CABECALHO_FLOWCHART.test(s) || RE_CABECALHO_OUTRO_TIPO.test(s)
  },
}
