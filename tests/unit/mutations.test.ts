import { describe, expect, it } from 'vitest'
import { createEmptyModel } from '@/core/model/types'
import { addNode, connect, removeEdge, removeNode, renameNode } from '@/core/model/mutations'

describe('model mutations contract', () => {
  it('G1 — pure: does not mutate the input model', () => {
    const model = addNode(createEmptyModel(), 'A')
    const snapshot = JSON.stringify(model)
    addNode(model, 'B')
    expect(JSON.stringify(model)).toBe(snapshot)
  })

  it('G2 — addNode derives a unique slug id, never merges equal labels', () => {
    let model = addNode(createEmptyModel(), 'Task')
    model = addNode(model, 'Task')
    expect(model.nodes.map((n) => n.id)).toEqual(['task', 'task-2'])
  })

  it('G3 — renameNode propagates the new id to edges and style refIds', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    model = { ...model, preservedStyles: [{ raw: 'style a fill:#f9f', refIds: ['a'] }] }

    model = renameNode(model, 'a', 'Renamed')

    expect(model.nodes.find((n) => n.label === 'Renamed')?.id).toBe('renamed')
    expect(model.edges[0]).toMatchObject({ source: 'renamed', target: 'b' })
    expect(model.preservedStyles[0].refIds).toEqual(['renamed'])
  })

  it('G4 — removeNode cleans incident edges and discards exclusive style refs', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    model = {
      ...model,
      preservedStyles: [
        { raw: 'style a fill:#f9f', refIds: ['a'] },
        { raw: 'class a,b highlight', refIds: ['a', 'b'] },
      ],
    }

    model = removeNode(model, 'a')

    expect(model.nodes.map((n) => n.id)).toEqual(['b'])
    expect(model.edges).toEqual([])
    expect(model.preservedStyles).toEqual([{ raw: 'class a,b highlight', refIds: ['b'] }])
  })

  it('G4 — removeEdge discards only the targeted edge', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    const edgeId = model.edges[0].id

    model = removeEdge(model, edgeId)

    expect(model.edges).toEqual([])
  })

  it('G5 — addNode/connect operate at root level, never inside a subgraph', () => {
    const model = addNode(createEmptyModel(), 'A')
    expect(model.nodes[0].subgraphId).toBeNull()
  })

  it('G6 — canvas defaults: rect shape, --> connector, null label', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    expect(model.nodes[0].shape).toBe('rect')
    expect(model.edges[0]).toMatchObject({ connector: '-->', label: null })
  })

  it('G7 — preserves canonical order of unaffected elements', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = addNode(model, 'C')
    model = removeNode(model, 'b')
    expect(model.nodes.map((n) => n.id)).toEqual(['a', 'c'])
  })
})
