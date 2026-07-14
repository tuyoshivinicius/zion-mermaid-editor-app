import { describe, expect, it } from 'vitest'
import { createEmptyModel, type GraphModel } from '@/core/model/types'
import { addNode, connect } from '@/core/model/mutations'
import { generate } from '@/core/generator'
import { importFlowchart } from '@/core/mermaid-acl'

// Gate II (Principle II / FR-007/FR-008/SC-003): only admissible losses are
// declaration order and `%%` comments — everything else must survive the
// round trip. We assert this by comparing order-insensitive canonical model
// snapshots rather than raw text, since Mermaid's own parser normalizes
// cosmetic header aliases (e.g. TD -> TB) that carry no structural meaning.
function canonicalize(model: GraphModel) {
  return {
    direction: model.direction === 'TD' ? 'TB' : model.direction,
    nodes: [...model.nodes]
      .map((n) => ({ id: n.id, label: n.label, shape: n.shape }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...model.edges]
      .map((e) => ({ source: e.source, target: e.target, connector: e.connector, label: e.label }))
      .sort((a, b) => `${a.source}-${a.target}-${a.connector}`.localeCompare(`${b.source}-${b.target}-${b.connector}`)),
  }
}

describe('round-trip fidelity (Flowchart)', () => {
  it('text-first: generate(importFlowchart(t).model) preserves 100% structural content', async () => {
    const source = `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do thing]
  B -.->|No| D[Other]
`
    const imported = await importFlowchart(source)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return

    const output = generate(imported.model)
    const reimported = await importFlowchart(output)
    expect(reimported.ok).toBe(true)
    if (!reimported.ok) return

    expect(canonicalize(reimported.model)).toEqual(canonicalize(imported.model))
  })

  it('canvas-first (SC-003): canvas mutations survive generate -> reimport unchanged', async () => {
    let model = addNode(createEmptyModel(), 'Start')
    model = addNode(model, 'Finish')
    model = connect(model, 'start', 'finish')

    const output = generate(model)
    const reimported = await importFlowchart(output)
    expect(reimported.ok).toBe(true)
    if (!reimported.ok) return

    expect(canonicalize(reimported.model)).toEqual(canonicalize(model))
  })

  it('a node labeled "End" round-trips without colliding with the Mermaid "end" keyword', async () => {
    let model = addNode(createEmptyModel(), 'Start')
    model = addNode(model, 'End')
    model = connect(model, 'start', model.nodes[1].id)

    const output = generate(model)
    const reimported = await importFlowchart(output)
    expect(reimported.ok).toBe(true)
    if (!reimported.ok) return

    expect(canonicalize(reimported.model)).toEqual(canonicalize(model))
  })
})
