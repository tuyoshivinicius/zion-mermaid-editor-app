import { describe, expect, it } from 'vitest'
import { createEmptyModel } from '@/core/model/types'
import { addNode, connect } from '@/core/model/mutations'
import { generate } from '@/core/generator'

function sampleModel() {
  let model = addNode(createEmptyModel(), 'A')
  model = addNode(model, 'B')
  model = connect(model, 'a', 'b')
  return model
}

describe('generator contract', () => {
  it('G1 — byte-identical across N calls on the same model', () => {
    const model = sampleModel()
    const outputs = Array.from({ length: 5 }, () => generate(model))
    expect(new Set(outputs).size).toBe(1)
  })

  it('G3 — header carries direction, no coordinates anywhere in the output', () => {
    const output = generate(sampleModel())
    expect(output).toMatch(/^flowchart TD\n/)
    expect(output).not.toMatch(/\bx\s*[:=]\s*-?\d/)
    expect(output).not.toMatch(/\by\s*[:=]\s*-?\d/)
  })

  it('G4 — quotes and escapes labels containing special characters', () => {
    const model = addNode(createEmptyModel(), 'Say "hi" [now]')
    const output = generate(model)
    expect(output).toContain('"Say #quot;hi#quot; [now]"')
  })

  it('G4 — leaves plain labels unquoted', () => {
    const output = generate(sampleModel())
    expect(output).toContain('a[A]')
    expect(output).toContain('b[B]')
  })

  it('G5 — preserves the imported connector variant; canvas edges use -->', () => {
    let model = sampleModel()
    model = { ...model, edges: [{ ...model.edges[0], connector: '==>' }] }
    expect(generate(model)).toContain('a ==> b')

    const canvasModel = sampleModel()
    expect(generate(canvasModel)).toContain('a --> b')
  })

  it('G6 — reemits preserved style blocks with rewritten refs, no dangling refs', () => {
    let model = sampleModel()
    model = { ...model, preservedStyles: [{ raw: 'style a fill:#f9f', refIds: ['a'] }] }
    expect(generate(model)).toContain('style a fill:#f9f')
  })

  it('G8 — deterministic ordering follows canonical insertion order', () => {
    let model = addNode(createEmptyModel(), 'Z')
    model = addNode(model, 'A')
    const output = generate(model)
    expect(output.indexOf('z[Z]')).toBeLessThan(output.indexOf('a[A]'))
  })
})
