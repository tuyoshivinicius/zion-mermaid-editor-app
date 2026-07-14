import type { GraphModel, Node, StyleBlock } from '@/core/model/types'
import { DEFAULT_SHAPE, SHAPE_DELIMITERS } from '@/core/model/shapes'

const SPECIAL_CHARS = /[[\]{}()|#;"\n]/

/** Wraps a label in quotes (escaping embedded quotes) only when it contains characters that would otherwise break Mermaid syntax (FR-003/G4). */
function formatLabelText(label: string): string {
  if (!SPECIAL_CHARS.test(label)) return label
  const escaped = label.replace(/"/g, '#quot;').replace(/\n/g, ' ')
  return `"${escaped}"`
}

function wrapNodeLabel(node: Node): string {
  const [open, close] = SHAPE_DELIMITERS[node.shape] ?? SHAPE_DELIMITERS[DEFAULT_SHAPE]
  return `${open}${formatLabelText(node.label)}${close}`
}

/**
 * Rewrites the id-bearing portion of a preserved style line using the
 * block's *current* refIds (kept in sync by renameNode/removeNode), while
 * leaving the rest of the opaque line untouched. classDef/linkStyle blocks
 * never carry node refIds, so they pass through verbatim.
 */
function regenerateStyleBlock(block: StyleBlock): string {
  if (block.refIds.length === 0) return block.raw

  const styleMatch = /^style\s+\S+(\s+.*)$/.exec(block.raw)
  if (styleMatch) return `style ${block.refIds[0]}${styleMatch[1]}`

  const classMatch = /^class\s+\S+(\s+\S+.*)$/.exec(block.raw)
  if (classMatch) return `class ${block.refIds.join(',')}${classMatch[1]}`

  const inlineMatch = /^\S+(:::.*)$/.exec(block.raw)
  if (inlineMatch) return `${block.refIds[0]}${inlineMatch[1]}`

  return block.raw
}

/**
 * Pure, deterministic Mermaid Flowchart serializer — no Mermaid dependency,
 * no Date/Math.random, ordering follows the model's canonical insertion
 * order end to end (Principle IV / G1).
 */
export function generate(model: GraphModel): string {
  const lines: string[] = [`flowchart ${model.direction}`]

  for (const node of model.nodes) {
    if (node.subgraphId) continue
    lines.push(`  ${node.id}${wrapNodeLabel(node)}`)
  }

  for (const subgraph of model.subgraphs) {
    lines.push(`  subgraph ${subgraph.id} [${subgraph.title}]`)
    for (const nodeId of subgraph.nodeIds) {
      const node = model.nodes.find((n) => n.id === nodeId)
      if (node) lines.push(`    ${node.id}${wrapNodeLabel(node)}`)
    }
    lines.push('  end')
  }

  for (const edge of model.edges) {
    const labelPart = edge.label ? `|${formatLabelText(edge.label)}|` : ''
    lines.push(`  ${edge.source} ${edge.connector}${labelPart} ${edge.target}`)
  }

  for (const block of model.preservedStyles) {
    lines.push(`  ${regenerateStyleBlock(block)}`)
  }

  return `${lines.join('\n')}\n`
}
