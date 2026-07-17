import { describe, expect, it } from 'vitest'
import { shapeSize } from '@/core/layout/shape-geometry'
import { SHAPE_DELIMITERS } from '@/core/model/shapes'

// Gate SH3 (Principle V / FR-006a): the shape-sensitive box is pure,
// deterministic, and never touches the model or generated text (verified
// separately by tests/contract/no-coordinates.test.ts).
describe('SH3 — shapeSize is pure and deterministic', () => {
  it('rect preserves S0\'s 172x40 default', () => {
    expect(shapeSize('rect')).toEqual({ width: 172, height: 40 })
  })

  it('is deterministic: repeated calls with the same shape return equal dimensions', () => {
    for (const shape of Object.keys(SHAPE_DELIMITERS)) {
      const first = shapeSize(shape)
      const second = shapeSize(shape)
      expect(second).toEqual(first)
    }
  })

  it('shapes that need a taller/rounder box for legibility get strictly larger area than rect', () => {
    const rectArea = 172 * 40
    for (const shape of ['diamond', 'circle', 'doublecircle', 'hexagon']) {
      const { width, height } = shapeSize(shape)
      expect(width * height).toBeGreaterThan(rectArea)
    }
  })

  it('every one of the 14 declared shapes resolves to a positive, finite size', () => {
    for (const shape of Object.keys(SHAPE_DELIMITERS)) {
      const { width, height } = shapeSize(shape)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
    }
  })

  it('an unknown shape falls back to the rect default (coherent with normalizeImportedShape)', () => {
    expect(shapeSize('not-a-real-shape')).toEqual(shapeSize('rect'))
  })
})
