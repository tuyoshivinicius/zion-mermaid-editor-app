import { describe, expect, it } from 'vitest'
import { shouldSeedStarter } from '@/starter/seed'

describe('SD1/SD2 — pure seed decision (SC-008)', () => {
  it('seeds when there is no restorable draft', () => {
    expect(shouldSeedStarter({ restorableDraft: null })).toBe(true)
  })

  it('does not seed when a restorable draft exists, even one representing an empty canvas', () => {
    expect(shouldSeedStarter({ restorableDraft: { text: '' } })).toBe(false)
  })

  it('does not seed when a restorable draft carries real content', () => {
    expect(shouldSeedStarter({ restorableDraft: { text: 'flowchart TD\n  a[A] --> b[B]' } })).toBe(false)
  })
})
