// Projeção modelo → nós da engine (ADR-004). O canvas é vista; a engine nunca é
// fonte; a coordenada nasce aqui (derivada do arranjo, não do modelo estrutural).
//
// A INVARIANTE DE REUSO é portão (Princípio III), não otimização: o objeto de
// vista de um nó é reusado (identidade referencial) quando nada que a vista
// enxerga mudou. Sem ela a tecla dobra e encosta na barra (ADR-006).

import type { Modelo } from '../modelo/modelo'
import type { Arranjo, Pos } from '../modelo/arranjo'
import { ORIGEM } from '../modelo/arranjo'

export const CAIXA_W = 170
export const CAIXA_H = 52

export interface DadosCaixa {
  rotulo: string
  forma: 'retangulo'
  marcado: boolean
}

export interface RFNode {
  id: string
  type: 'caixa'
  position: Pos
  width: number
  height: number
  data: DadosCaixa
}

export interface Projecao {
  nodes: RFNode[]
  edges: never[] // edges = [] no R0 (conexões são `elementos-grafo-dirigido`)
}

const cache = new Map<string, { chave: string; valor: RFNode }>()

export function limparCacheProjecao(): void {
  cache.clear()
}

export function projetar(modelo: Modelo, arranjo: Arranjo): Projecao {
  const presentes = new Set<string>()

  const nodes = modelo.nos.map((n) => {
    presentes.add(n.id)
    const pos = arranjo.porId.get(n.id) ?? ORIGEM
    const rotulo = n.rotulo ?? n.id
    const forma = 'retangulo' as const
    const marcado = n.alertas.length > 0
    // Chave de cache por nó (contracts/arrangement.md): rótulo|forma|marcado|x|y.
    const chave = `${rotulo}|${forma}|${marcado}|${pos.x}|${pos.y}`

    const ant = cache.get(n.id)
    if (ant && ant.chave === chave) return ant.valor // MESMO objeto → identidade referencial

    const valor: RFNode = {
      id: n.id,
      type: 'caixa',
      position: { x: pos.x, y: pos.y },
      width: CAIXA_W,
      height: CAIXA_H,
      data: { rotulo, forma, marcado },
    }
    cache.set(n.id, { chave, valor })
    return valor
  })

  // Higiene: descarta do cache os ids que sumiram (linha apagada).
  for (const id of cache.keys()) if (!presentes.has(id)) cache.delete(id)

  return { nodes, edges: [] }
}
