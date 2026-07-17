import { describe, expect, it } from 'vitest'
import { createEmptyModel } from '@/core/model/types'
import { addNode, connect, setEdgeLabel, setNodeShape } from '@/core/model/mutations'
import { generate } from '@/core/generator'

// Gate IV/SC-007: mutations plug into the deterministic generator without
// introducing any non-determinism of their own.
describe('SC-007 — setEdgeLabel generates byte-identical text on repetition', () => {
  it('generate(setEdgeLabel(...)) is identical across repeated calls with the same inputs', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    const edgeId = model.edges[0].id

    const outputs = Array.from({ length: 5 }, () => generate(setEdgeLabel(model, edgeId, 'Sim')))

    expect(new Set(outputs).size).toBe(1)
  })
})

describe('SC-007 — setNodeShape generates byte-identical text on repetition', () => {
  it('generate(setNodeShape(...)) is identical across repeated calls with the same inputs', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')

    const outputs = Array.from({ length: 5 }, () => generate(setNodeShape(model, 'a', 'diamond')))

    expect(new Set(outputs).size).toBe(1)
  })
})
