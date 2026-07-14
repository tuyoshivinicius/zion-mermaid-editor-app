import { describe, expect, it } from 'vitest'
import { importFlowchart } from '@/core/mermaid-acl'

describe('import-acl contract', () => {
  it('G2/G3 — returns unsupported-type for a non-Flowchart diagram, never renders it', async () => {
    const result = await importFlowchart('sequenceDiagram\n  Alice->>Bob: Hi')
    expect(result).toEqual({ ok: false, reason: 'unsupported-type' })
  })

  it('G4 — never throws on invalid/uninterpretable text, returns invalid', async () => {
    await expect(importFlowchart('this is not mermaid at all !!')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('G4 — never throws on empty text', async () => {
    await expect(importFlowchart('')).resolves.toEqual({ ok: false, reason: 'invalid' })
  })

  it('G2 — returns a neutral GraphModel for valid Flowchart text', async () => {
    const result = await importFlowchart('flowchart TD\n  A[Start] --> B[End]')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.model).toMatchObject({
      nodes: [
        { id: 'A', label: 'Start' },
        { id: 'B', label: 'End' },
      ],
      edges: [{ source: 'A', target: 'B', connector: '-->' }],
    })
  })

  it('G5 — captures opaque style blocks with refIds', async () => {
    const result = await importFlowchart('flowchart TD\n  A[Start] --> B[End]\n  style A fill:#f9f\n  class B highlight')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.model.preservedStyles).toEqual(
      expect.arrayContaining([
        { raw: 'style A fill:#f9f', refIds: ['A'] },
        { raw: 'class B highlight', refIds: ['B'] },
      ]),
    )
  })

  it('G6 — model carries no position/coordinate fields', async () => {
    const result = await importFlowchart('flowchart TD\n  A[Start] --> B[End]')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const node of result.model.nodes) {
      expect(node).not.toHaveProperty('x')
      expect(node).not.toHaveProperty('y')
      expect(node).not.toHaveProperty('position')
    }
  })
})
