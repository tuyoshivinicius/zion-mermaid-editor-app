import { describe, expect, it } from 'vitest'
import { STARTER_MODEL, STARTER_TEXT } from '@/starter/model'
import { deriveSlug } from '@/core/slug'
import { importFlowchart } from '@/core/mermaid-acl'
import type { Edge } from '@/core/model/types'

const DOCUMENTED_TEXT = `flowchart TD
  inicio[Início]
  revisar[Revisar]
  aprovado{Aprovado?}
  publicar[Publicar]
  fim[Fim]
  inicio --> revisar
  revisar --> aprovado
  aprovado -->|Sim| publicar
  aprovado -->|Não| revisar
  publicar --> fim
`

function edgeKey(edge: Edge): string {
  return `${edge.source}->${edge.target}:${edge.connector}:${edge.label ?? ''}`
}

describe('ST1 — exact shape (FR-002)', () => {
  it('has exactly 5 nodes and 5 edges, direction TD, pt-BR labels', () => {
    expect(STARTER_MODEL.direction).toBe('TD')
    expect(STARTER_MODEL.nodes).toHaveLength(5)
    expect(STARTER_MODEL.edges).toHaveLength(5)
    expect(STARTER_MODEL.nodes.map((n) => n.label)).toEqual(['Início', 'Revisar', 'Aprovado?', 'Publicar', 'Fim'])
  })

  it('gives the decision node a diamond shape (FR-002a, model half)', () => {
    const aprovado = STARTER_MODEL.nodes.find((n) => n.label === 'Aprovado?')
    expect(aprovado?.shape).toBe('diamond')
  })
})

describe('ST2 — ids by S0 slug rule', () => {
  it('derives every node id from its label via deriveSlug', () => {
    for (const node of STARTER_MODEL.nodes) {
      expect(node.id).toBe(deriveSlug(node.label))
    }
  })

  it('has unique node ids', () => {
    const ids = STARTER_MODEL.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('follows the e{index} edge-id convention', () => {
    expect(STARTER_MODEL.edges.map((e) => e.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4'])
  })

  it('has every edge source/target resolve to an existing node', () => {
    const nodeIds = new Set(STARTER_MODEL.nodes.map((n) => n.id))
    for (const edge of STARTER_MODEL.edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })
})

describe('ST3 — canonicity by construction (FR-003)', () => {
  it('STARTER_TEXT equals the documented 11-line canonical form', () => {
    expect(STARTER_TEXT).toBe(DOCUMENTED_TEXT)
  })
})

describe('ST4 — validity at test time, round-trip without structural loss (FR-015)', () => {
  it('imports as a valid Flowchart', async () => {
    const result = await importFlowchart(STARTER_TEXT)
    expect(result.ok).toBe(true)
  })

  it('preserves structural content across model -> text -> model', async () => {
    const result = await importFlowchart(STARTER_TEXT)
    if (!result.ok) throw new Error('expected STARTER_TEXT to import successfully')
    const reimported = result.model

    // TD and TB are the same top-down orientation; Mermaid normalizes TD -> TB.
    expect(reimported.direction === 'TD' || reimported.direction === 'TB').toBe(true)

    const originalNodes = [...STARTER_MODEL.nodes]
      .map((n) => ({ id: n.id, label: n.label, shape: n.shape }))
      .sort((a, b) => a.id.localeCompare(b.id))
    const reimportedNodes = [...reimported.nodes]
      .map((n) => ({ id: n.id, label: n.label, shape: n.shape }))
      .sort((a, b) => a.id.localeCompare(b.id))
    expect(reimportedNodes).toEqual(originalNodes)

    // Edge ids are ACL-internal handles (e.g. "e0-inicio-revisar"), not
    // structural content — compare by (source, target, connector, label).
    const originalEdgeKeys = [...STARTER_MODEL.edges].map(edgeKey).sort()
    const reimportedEdgeKeys = [...reimported.edges].map(edgeKey).sort()
    expect(reimportedEdgeKeys).toEqual(originalEdgeKeys)
  })
})

describe('ST5 — size ceilings (FR-013/SC-009)', () => {
  it('stays within 6 nodes and 14 lines', () => {
    expect(STARTER_MODEL.nodes.length).toBeLessThanOrEqual(6)
    expect(STARTER_TEXT.trimEnd().split('\n').length).toBeLessThanOrEqual(14)
  })
})
