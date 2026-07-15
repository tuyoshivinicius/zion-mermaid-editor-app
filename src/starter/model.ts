import { generate } from '@/core/generator'
import type { GraphModel } from '@/core/model/types'

function deepFreeze<T>(value: T): T {
  Object.freeze(value)
  for (const key of Object.getOwnPropertyNames(value as object)) {
    const prop = (value as Record<string, unknown>)[key]
    if (prop !== null && (typeof prop === 'object' || typeof prop === 'function') && !Object.isFrozen(prop)) {
      deepFreeze(prop)
    }
  }
  return value
}

export const STARTER_MODEL: GraphModel = deepFreeze({
  direction: 'TD',
  nodes: [
    { id: 'inicio', label: 'Início', shape: 'rect', subgraphId: null },
    { id: 'revisar', label: 'Revisar', shape: 'rect', subgraphId: null },
    { id: 'aprovado', label: 'Aprovado?', shape: 'diamond', subgraphId: null },
    { id: 'publicar', label: 'Publicar', shape: 'rect', subgraphId: null },
    { id: 'fim', label: 'Fim', shape: 'rect', subgraphId: null },
  ],
  edges: [
    { id: 'e0', source: 'inicio', target: 'revisar', connector: '-->', label: null },
    { id: 'e1', source: 'revisar', target: 'aprovado', connector: '-->', label: null },
    { id: 'e2', source: 'aprovado', target: 'publicar', connector: '-->', label: 'Sim' },
    { id: 'e3', source: 'aprovado', target: 'revisar', connector: '-->', label: 'Não' },
    { id: 'e4', source: 'publicar', target: 'fim', connector: '-->', label: null },
  ],
  subgraphs: [],
  preservedStyles: [],
})

export const STARTER_TEXT: string = generate(STARTER_MODEL)
