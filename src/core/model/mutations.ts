import { slugify } from '@/core/slug'
import type { Edge, GraphModel, Node, StyleBlock } from './types'

function nextEdgeId(edges: Edge[]): string {
  const existing = new Set(edges.map((e) => e.id))
  let index = edges.length
  let id = `e${index}`
  while (existing.has(id)) {
    index += 1
    id = `e${index}`
  }
  return id
}

/** Discards refIds pointing at a removed node; drops the whole block only if it originally referenced specific nodes and now references none (classDef/linkStyle blocks, which never carry node refIds, are never discarded this way). */
function pruneStyleRefs(blocks: StyleBlock[], removedId: string): StyleBlock[] {
  return blocks
    .map((block) => ({ ...block, refIds: block.refIds.filter((ref) => ref !== removedId) }))
    .filter((block, index) => block.refIds.length > 0 || blocks[index].refIds.length === 0)
}

export function addNode(model: GraphModel, label: string): GraphModel {
  const id = slugify(
    label,
    model.nodes.map((n) => n.id),
  )
  const node: Node = { id, label, shape: 'rect', subgraphId: null }
  return { ...model, nodes: [...model.nodes, node] }
}

export function renameNode(model: GraphModel, id: string, newLabel: string): GraphModel {
  const otherIds = model.nodes.filter((n) => n.id !== id).map((n) => n.id)
  const newId = slugify(newLabel, otherIds)

  const nodes = model.nodes.map((n) => (n.id === id ? { ...n, id: newId, label: newLabel } : n))
  const edges = model.edges.map((e) => ({
    ...e,
    source: e.source === id ? newId : e.source,
    target: e.target === id ? newId : e.target,
  }))
  const subgraphs = model.subgraphs.map((sg) => ({
    ...sg,
    nodeIds: sg.nodeIds.map((nid) => (nid === id ? newId : nid)),
  }))
  const preservedStyles = model.preservedStyles.map((block) => ({
    ...block,
    refIds: block.refIds.map((ref) => (ref === id ? newId : ref)),
  }))

  return { ...model, nodes, edges, subgraphs, preservedStyles }
}

export function connect(model: GraphModel, sourceId: string, targetId: string): GraphModel {
  const edge: Edge = { id: nextEdgeId(model.edges), source: sourceId, target: targetId, connector: '-->', label: null }
  return { ...model, edges: [...model.edges, edge] }
}

export function removeNode(model: GraphModel, id: string): GraphModel {
  const nodes = model.nodes.filter((n) => n.id !== id)
  const edges = model.edges.filter((e) => e.source !== id && e.target !== id)
  const subgraphs = model.subgraphs.map((sg) => ({ ...sg, nodeIds: sg.nodeIds.filter((nid) => nid !== id) }))
  const preservedStyles = pruneStyleRefs(model.preservedStyles, id)

  return { ...model, nodes, edges, subgraphs, preservedStyles }
}

export function removeEdge(model: GraphModel, edgeId: string): GraphModel {
  return { ...model, edges: model.edges.filter((e) => e.id !== edgeId) }
}

/** Sets an edge's label, normalizing at the source (FR-004a/FR-004b) so `null` is the model's one canonical representation of "no label" — never `''`. */
export function setEdgeLabel(model: GraphModel, edgeId: string, label: string): GraphModel {
  const trimmed = label.trim()
  const next = trimmed === '' ? null : trimmed
  const edges = model.edges.map((e) => (e.id === edgeId ? { ...e, label: next } : e))
  return { ...model, edges }
}

/** Sets only a node's shape (FR-005a); id/label and every edge stay untouched, so exactly one generated line changes (SC-005). */
export function setNodeShape(model: GraphModel, nodeId: string, shape: string): GraphModel {
  const nodes = model.nodes.map((n) => (n.id === nodeId ? { ...n, shape } : n))
  return { ...model, nodes }
}
