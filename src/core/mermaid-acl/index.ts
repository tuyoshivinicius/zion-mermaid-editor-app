// ÚNICO módulo do repo autorizado a tocar a API interna/depreciada do Mermaid
// (Princípio VI / ADR-002 / Decisão D). Nada tipado pelo Mermaid escapa: a
// saída é sempre um GraphModel neutro.
import mermaid from 'mermaid'
import type { Connector, Direction, Edge, GraphModel, Node, StyleBlock, Subgraph } from '@/core/model/types'
import { normalizeImportedShape } from '@/core/model/shapes'

export type ImportResult = { ok: true; model: GraphModel } | { ok: false; reason: 'invalid' | 'unsupported-type' }

const FLOWCHART_DIAGRAM_TYPES = new Set(['flowchart', 'flowchart-v2'])

// Registers Mermaid's lazy-loaded diagram detectors; without this,
// mermaid.detectType() throws for every input, even valid ones.
mermaid.initialize({ startOnLoad: false })

// Dev-only hook so the E2E suite can exercise mermaid.render() against our
// generator's output inside a real browser (jsdom has no SVG layout APIs
// like getBBox(), so this can't be verified from Node/Vitest). Absent from
// production builds — import.meta.env.DEV is false there.
if (import.meta.env.DEV) {
  ;(window as unknown as { __mermaid: typeof mermaid }).__mermaid = mermaid
}

/**
 * mermaid.parse/getDiagramFromText are Promise-based in Mermaid 11 (no
 * synchronous parsing path exists), so this ACL boundary is necessarily
 * async even though earlier design notes sketched a sync signature.
 */
export async function importFlowchart(text: string): Promise<ImportResult> {
  let diagramType: string
  try {
    diagramType = mermaid.detectType(text)
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  if (!FLOWCHART_DIAGRAM_TYPES.has(diagramType)) {
    return { ok: false, reason: 'unsupported-type' }
  }

  try {
    const parsed = await mermaid.parse(text, { suppressErrors: true })
    if (!parsed) return { ok: false, reason: 'invalid' }

    const diagram = await mermaid.mermaidAPI.getDiagramFromText(text)
    const db = diagram.db as FlowDbLike
    return { ok: true, model: buildModel(db, text) }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

interface FlowVertexLike {
  id: string
  text?: string
  type?: string
}

interface FlowEdgeLike {
  start: string
  end: string
  text?: string
  type?: string
  stroke?: string
}

interface FlowSubGraphLike {
  id: string
  title: string
  nodes: string[]
}

interface FlowDbLike {
  getVertices(): Map<string, FlowVertexLike>
  getEdges(): FlowEdgeLike[]
  getSubGraphs(): FlowSubGraphLike[]
  getDirection(): string | undefined
}

function buildModel(db: FlowDbLike, sourceText: string): GraphModel {
  const vertices = db.getVertices()
  const subgraphNodeIds = new Set(db.getSubGraphs().flatMap((sg) => sg.nodes))

  const nodes: Node[] = [...vertices.values()].map((vertex) => ({
    id: vertex.id,
    label: vertex.text ?? vertex.id,
    shape: normalizeImportedShape(vertex.type),
    subgraphId: subgraphNodeIds.has(vertex.id) ? findParentSubgraph(db, vertex.id) : null,
  }))

  const edges: Edge[] = db.getEdges().map((edge, index) => ({
    id: `e${index}-${edge.start}-${edge.end}`,
    source: edge.start,
    target: edge.end,
    connector: toConnector(edge),
    label: edge.text || null,
  }))

  const subgraphs: Subgraph[] = db.getSubGraphs().map((sg) => ({
    id: sg.id,
    title: sg.title,
    nodeIds: sg.nodes,
  }))

  return {
    direction: normalizeDirection(db.getDirection()),
    nodes,
    edges,
    subgraphs,
    preservedStyles: scanStyleBlocks(sourceText),
  }
}

function findParentSubgraph(db: FlowDbLike, nodeId: string): string | null {
  const owner = db.getSubGraphs().find((sg) => sg.nodes.includes(nodeId))
  return owner?.id ?? null
}

function normalizeDirection(direction: string | undefined): Direction {
  const known: Direction[] = ['TD', 'LR', 'TB', 'RL', 'BT']
  return (known as string[]).includes(direction ?? '') ? (direction as Direction) : 'TD'
}

/**
 * Maps Mermaid's internal {type, stroke} edge representation back to one of
 * our six supported connector literals. Mermaid supports more variants
 * (double-headed arrows, invisible links, …) than S0's canvas can create;
 * anything outside this set falls back to its nearest visual equivalent.
 */
function toConnector(edge: FlowEdgeLike): Connector {
  if (edge.stroke === 'thick') return '==>'
  if (edge.stroke === 'dotted') return '-.->'
  switch (edge.type) {
    case 'arrow_point':
    case 'double_arrow_point':
      return '-->'
    case 'arrow_circle':
      return '--o'
    case 'arrow_cross':
      return '--x'
    default:
      return '---'
  }
}

const STYLE_LINE_PATTERNS = [
  { kind: 'style', regex: /^style\s+(\S+)\s+/ },
  { kind: 'classDef', regex: /^classDef\s+/ },
  { kind: 'class', regex: /^class\s+([^\s]+)\s+\S+/ },
  { kind: 'linkStyle', regex: /^linkStyle\s+/ },
] as const

/**
 * Textual pre-scan for opaque style directives (style/classDef/class/:::/
 * linkStyle) that FlowDB does not expose integrally. Blocks are reemitted
 * verbatim by the generator; refIds drive rename-rewrite / remove-discard
 * (FR-003/FR-007). linkStyle targets edge *indices*, not node ids, so it is
 * captured with no refIds (nothing to rewrite on node rename/remove).
 */
function scanStyleBlocks(sourceText: string): StyleBlock[] {
  const blocks: StyleBlock[] = []

  for (const rawLine of sourceText.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    for (const { kind, regex } of STYLE_LINE_PATTERNS) {
      const match = regex.exec(line)
      if (!match) continue
      const refIds = kind === 'style' ? [match[1]] : kind === 'class' ? match[1].split(',') : []
      blocks.push({ raw: line, refIds })
      break
    }

    const inlineClassMatch = /^([A-Za-z0-9_-]+):::\S+/.exec(line)
    if (inlineClassMatch && !STYLE_LINE_PATTERNS.some(({ regex }) => regex.test(line))) {
      blocks.push({ raw: line, refIds: [inlineClassMatch[1]] })
    }
  }

  return blocks
}
