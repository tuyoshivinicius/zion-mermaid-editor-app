import { describe, expect, it } from 'vitest'
import { createEmptyModel } from '@/core/model/types'
import { addNode, connect } from '@/core/model/mutations'
import { generate } from '@/core/generator'

// Gate V (Principle V / FR-010): layout is recomputed by the app (dagre) and
// never serialized. Generated Mermaid text must carry no node coordinates.

describe('Gate V: generated text has no coordinates', () => {
  it('contains no x/y coordinate pairs or position-like tokens', () => {
    let model = addNode(createEmptyModel(), 'Start')
    model = addNode(model, 'End')
    model = connect(model, 'start', 'end')

    const output = generate(model)

    expect(output).not.toMatch(/-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/)
    expect(output).not.toMatch(/\b(x|y|position|coords?)\s*[:=]/i)
  })
})
