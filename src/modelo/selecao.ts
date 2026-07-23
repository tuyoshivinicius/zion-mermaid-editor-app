// Seleção de sessão (R1) — estado EFÊMERO puro, nunca projetado no código (RN-01).
// A contenção (elemento inteiro dentro do retângulo) é da engine (SelectionMode.Full,
// canvas); aqui vivem a conexão DERIVADA (entra quando as duas pontas entram, FR-008)
// e a NORMALIZAÇÃO antes de todo ato em bloco: fecho transitivo de pertencimento +
// dedup → cada elemento afetado exatamente 1× (SC-006).

import type { Modelo } from './modelo'
import { acharAgrupamento, membrosTransitivos } from './modelo'

export interface Selecao {
  nos: Set<string>
  agrupamentos: Set<string>
  conexoes: Set<string>
}

export function selecaoVazia(): Selecao {
  return { nos: new Set(), agrupamentos: new Set(), conexoes: new Set() }
}

/** Conexões DERIVADAS: entram quando AS DUAS pontas estão no conjunto de nós (FR-008/FR-010/FR-011). */
export function conexoesDerivadas(modelo: Modelo, nosIds: Set<string>): string[] {
  return modelo.conexoes.filter((c) => nosIds.has(c.origem) && nosIds.has(c.destino)).map((c) => c.id)
}

export interface SelecaoNormalizada {
  nos: string[]
  agrupamentos: string[]
  conexoes: string[]
}

/**
 * Expande a seleção pelo fecho transitivo de pertencimento (um agrupamento arrasta
 * os seus membros, recursivamente) e deduplica: cada elemento afetado 1× (SC-006).
 * As conexões afetadas são as explicitamente selecionadas + as derivadas do conjunto
 * final de nós (as duas pontas dentro).
 */
export function normalizar(modelo: Modelo, sel: Selecao): SelecaoNormalizada {
  const nos = new Set(sel.nos)
  const agrupamentos = new Set(sel.agrupamentos)
  for (const idAgrup of sel.agrupamentos) {
    for (const m of membrosTransitivos(modelo, idAgrup)) {
      if (acharAgrupamento(modelo, m)) agrupamentos.add(m)
      else nos.add(m)
    }
  }
  const conexoes = new Set(sel.conexoes)
  for (const id of conexoesDerivadas(modelo, nos)) conexoes.add(id)
  return { nos: [...nos], agrupamentos: [...agrupamentos], conexoes: [...conexoes] }
}
