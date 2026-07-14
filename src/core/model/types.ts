export type Direction = 'TD' | 'LR' | 'TB' | 'RL' | 'BT'

export type Connector = '-->' | '---' | '-.->' | '==>' | '--o' | '--x'

export interface Node {
  id: string
  label: string
  shape: 'rect' | (string & {})
  subgraphId?: string | null
}

export interface Edge {
  id: string
  source: string
  target: string
  connector: Connector
  label?: string | null
}

export interface Subgraph {
  id: string
  title: string
  nodeIds: string[]
}

export interface StyleBlock {
  raw: string
  refIds: string[]
}

export interface GraphModel {
  direction: Direction
  nodes: Node[]
  edges: Edge[]
  subgraphs: Subgraph[]
  preservedStyles: StyleBlock[]
}

export function createEmptyModel(direction: Direction = 'TD'): GraphModel {
  return {
    direction,
    nodes: [],
    edges: [],
    subgraphs: [],
    preservedStyles: [],
  }
}
