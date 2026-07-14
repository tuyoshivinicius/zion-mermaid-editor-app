import dagre from 'dagre'
import type { Direction, GraphModel } from '@/core/model/types'

export interface Position {
  x: number
  y: number
}

const NODE_WIDTH = 172
const NODE_HEIGHT = 40

function toDagreRankdir(direction: Direction): 'TB' | 'BT' | 'LR' | 'RL' {
  if (direction === 'TD') return 'TB'
  return direction
}

/**
 * Ephemeral auto-layout: positions are computed for the current render and
 * never serialized into the model or the generated text (Principle V /
 * FR-010). Feeding dagre nodes/edges in the model's canonical insertion
 * order (not layout-determinism) is what keeps the visual layout stable
 * between renders (Decision A).
 */
export function layout(model: GraphModel): Map<string, Position> {
  const graph = new dagre.graphlib.Graph({ compound: true })
  graph.setGraph({ rankdir: toDagreRankdir(model.direction) })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const node of model.nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const subgraph of model.subgraphs) {
    graph.setNode(subgraph.id, {})
    for (const nodeId of subgraph.nodeIds) {
      graph.setParent(nodeId, subgraph.id)
    }
  }

  for (const edge of model.edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  const positions = new Map<string, Position>()
  for (const node of model.nodes) {
    const positioned = graph.node(node.id)
    positions.set(node.id, { x: positioned.x, y: positioned.y })
  }
  return positions
}
