import { describe, expect, it } from 'vitest'
import { importFlowchart } from '@/core/mermaid-acl'

describe('importFlowchart — valid Flowchart text to GraphModel', () => {
  it('parses nodes, edges, connector variants and direction', async () => {
    const result = await importFlowchart(`flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[Do thing]
  B -.->|No| D[Other]
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.model.direction).toBe('LR')
    expect(result.model.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C', 'D'])
    expect(result.model.nodes.find((n) => n.id === 'B')).toMatchObject({ label: 'Decision', shape: 'diamond' })

    expect(result.model.edges).toEqual([
      expect.objectContaining({ source: 'A', target: 'B', connector: '-->', label: null }),
      expect.objectContaining({ source: 'B', target: 'C', connector: '-->', label: 'Yes' }),
      expect.objectContaining({ source: 'B', target: 'D', connector: '-.->', label: 'No' }),
    ])
  })

  it('parses subgraphs and assigns member nodes their subgraphId', async () => {
    const result = await importFlowchart(`flowchart TD
  subgraph s1 [Group]
    A[Inside]
  end
  B[Outside]
  A --> B
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.model.subgraphs).toHaveLength(1)
    const subgraph = result.model.subgraphs[0]
    expect(subgraph.nodeIds).toContain('A')
    expect(result.model.nodes.find((n) => n.id === 'A')?.subgraphId).toBe(subgraph.id)
    expect(result.model.nodes.find((n) => n.id === 'B')?.subgraphId).toBeNull()
  })
})
