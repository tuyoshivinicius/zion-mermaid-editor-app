import { describe, expect, it } from 'vitest'
import { createEmptyModel } from '@/core/model/types'
import { addNode, connect, setEdgeLabel, setNodeShape } from '@/core/model/mutations'
import { generate } from '@/core/generator'

describe('MU — setEdgeLabel (aditiva, pura)', () => {
  function baseModel() {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    return model
  }

  it('MU1 — pure: does not mutate the input model', () => {
    const model = baseModel()
    const snapshot = JSON.stringify(model)
    setEdgeLabel(model, model.edges[0].id, 'Yes')
    expect(JSON.stringify(model)).toBe(snapshot)
  })

  it('MU2 — trims a non-empty label', () => {
    const model = baseModel()
    const next = setEdgeLabel(model, model.edges[0].id, '  Sim  ')
    expect(next.edges[0].label).toBe('Sim')
  })

  it('MU2/FR-004a — empty label normalizes to null (canonical "no label")', () => {
    const model = baseModel()
    const next = setEdgeLabel(model, model.edges[0].id, '')
    expect(next.edges[0].label).toBeNull()
  })

  it('MU2/FR-004b — whitespace-only label normalizes to null', () => {
    const model = baseModel()
    const next = setEdgeLabel(model, model.edges[0].id, '   ')
    expect(next.edges[0].label).toBeNull()
  })

  it('MU2 — only the targeted edge changes; nodes/subgraphs/styles/direction intact', () => {
    let model = baseModel()
    model = addNode(model, 'C')
    model = connect(model, 'a', 'c')
    const [firstId, secondId] = model.edges.map((e) => e.id)

    const next = setEdgeLabel(model, firstId, 'Sim')

    expect(next.edges.find((e) => e.id === firstId)?.label).toBe('Sim')
    expect(next.edges.find((e) => e.id === secondId)?.label).toBe(model.edges.find((e) => e.id === secondId)?.label)
    expect(next.nodes).toEqual(model.nodes)
    expect(next.subgraphs).toEqual(model.subgraphs)
    expect(next.preservedStyles).toEqual(model.preservedStyles)
    expect(next.direction).toBe(model.direction)
  })

  it('MU2 — non-existent edgeId is a no-op (model unchanged, no throw)', () => {
    const model = baseModel()
    const next = setEdgeLabel(model, 'does-not-exist', 'Sim')
    expect(next).toEqual(model)
  })
})

describe('MU — setNodeShape (aditiva, pura)', () => {
  function baseModel() {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    return model
  }

  it('MU1 — pure: does not mutate the input model', () => {
    const model = baseModel()
    const snapshot = JSON.stringify(model)
    setNodeShape(model, 'a', 'diamond')
    expect(JSON.stringify(model)).toBe(snapshot)
  })

  it('MU3/FR-005a — sets only the node\'s shape; id/label and all edges intact', () => {
    let model = baseModel()
    model = addNode(model, 'C')
    model = connect(model, 'a', 'c')

    const next = setNodeShape(model, 'a', 'diamond')

    expect(next.nodes.find((n) => n.id === 'a')).toMatchObject({ id: 'a', label: 'A', shape: 'diamond' })
    expect(next.edges).toEqual(model.edges)
    expect(next.nodes.filter((n) => n.id !== 'a')).toEqual(model.nodes.filter((n) => n.id !== 'a'))
    expect(next.subgraphs).toEqual(model.subgraphs)
    expect(next.preservedStyles).toEqual(model.preservedStyles)
  })

  it('MU3/SC-005 — the consequence is exactly one changed line in generated text', () => {
    const model = baseModel()
    const before = generate(model).split('\n')
    const after = generate(setNodeShape(model, 'a', 'diamond')).split('\n')

    expect(after.length).toBe(before.length)
    let changed = 0
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) changed += 1
    }
    expect(changed).toBe(1)
  })

  it('MU3 — non-existent nodeId is a no-op (model unchanged, no throw)', () => {
    const model = baseModel()
    const next = setNodeShape(model, 'does-not-exist', 'diamond')
    expect(next).toEqual(model)
  })
})
