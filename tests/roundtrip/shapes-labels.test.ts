import { describe, expect, it } from 'vitest'
import { createEmptyModel, type GraphModel } from '@/core/model/types'
import { addNode, connect, setEdgeLabel, setNodeShape } from '@/core/model/mutations'
import { generate } from '@/core/generator'
import { importFlowchart } from '@/core/mermaid-acl'
import { SHAPE_DELIMITERS } from '@/core/model/shapes'

// Gate SC-006 (extends tests/roundtrip/flowchart.test.ts): edge labels written
// through the canvas (setEdgeLabel) survive generate -> importFlowchart.
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

describe('SC-006 — round-trip: connection label written via setEdgeLabel', () => {
  it('a labeled edge survives generate -> importFlowchart', async () => {
    let model = addNode(createEmptyModel(), 'Start')
    model = addNode(model, 'Finish')
    model = connect(model, 'start', 'finish')
    model = setEdgeLabel(model, model.edges[0].id, 'Sim')

    const output = generate(model)
    const reimported = await importFlowchart(output)
    expect(reimported.ok).toBe(true)
    if (!reimported.ok) return

    expect(canonicalize(reimported.model)).toEqual(canonicalize(model))
    expect(reimported.model.edges[0].label).toBe('Sim')
  })

  it('clearing a label back to null survives generate -> importFlowchart (no |...| in the text)', async () => {
    let model = addNode(createEmptyModel(), 'Start')
    model = addNode(model, 'Finish')
    model = connect(model, 'start', 'finish')
    model = setEdgeLabel(model, model.edges[0].id, 'Sim')
    model = setEdgeLabel(model, model.edges[0].id, '')

    const output = generate(model)
    expect(output).not.toMatch(/\|/)

    const reimported = await importFlowchart(output)
    expect(reimported.ok).toBe(true)
    if (!reimported.ok) return

    expect(canonicalize(reimported.model)).toEqual(canonicalize(model))
  })
})

describe('SC-006 — round-trip: all 14 node shapes + labeled connections (Decisão R)', () => {
  it('a model covering the 14 shapes and labeled edges survives generate -> importFlowchart (14/14)', async () => {
    const shapes = Object.keys(SHAPE_DELIMITERS)
    let model = createEmptyModel()
    for (const shape of shapes) {
      model = addNode(model, shape)
    }
    for (const node of model.nodes) {
      model = setNodeShape(model, node.id, node.label)
    }
    for (let i = 0; i < model.nodes.length - 1; i++) {
      model = connect(model, model.nodes[i].id, model.nodes[i + 1].id)
    }
    model = setEdgeLabel(model, model.edges[0].id, 'Sim')
    model = setEdgeLabel(model, model.edges[1].id, 'Não')

    expect(model.nodes.map((n) => n.shape).sort()).toEqual([...shapes].sort())

    const output = generate(model)
    const reimported = await importFlowchart(output)
    expect(reimported.ok).toBe(true)
    if (!reimported.ok) return

    expect(canonicalize(reimported.model)).toEqual(canonicalize(model))
  })

  // FR-015 — known, registered exception to NFR-02, not fixed by S2: a label
  // containing a double quote does not survive the round trip (pre-existing
  // S0 defect in the generator's escaping). Named and explicit, never a
  // silently-omitted case (Decisão R).
  it('FR-015 — a connection label containing a double quote is a KNOWN round-trip loss (not fixed here)', async () => {
    let model = addNode(createEmptyModel(), 'Start')
    model = addNode(model, 'Finish')
    model = connect(model, 'start', 'finish')
    model = setEdgeLabel(model, model.edges[0].id, 'a"b')

    const output = generate(model)
    const reimported = await importFlowchart(output)
    expect(reimported.ok).toBe(true)
    if (!reimported.ok) return

    expect(reimported.model.edges[0].label).not.toBe('a"b')
  })
})
