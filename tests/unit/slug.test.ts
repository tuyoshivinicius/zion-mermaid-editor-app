import { describe, expect, it } from 'vitest'
import { deriveSlug, slugify, uniqueSlug } from '@/core/slug'

describe('deriveSlug', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(deriveSlug('Hello World')).toBe('hello-world')
  })

  it('transliterates accented characters to a safe charset', () => {
    expect(deriveSlug('café')).toBe('cafe')
    expect(deriveSlug('Ação')).toBe('acao')
  })

  it('drops unsafe punctuation', () => {
    expect(deriveSlug('a[b]{c}(d)|e#f;g')).toBe('a-b-c-d-e-f-g')
  })

  it('falls back to a safe placeholder for an empty result', () => {
    expect(deriveSlug('!!!')).toBe('no')
  })
})

describe('uniqueSlug', () => {
  it('returns the base slug when unused', () => {
    expect(uniqueSlug('a', [])).toBe('a')
  })

  it('appends a deterministic numeric suffix on collision', () => {
    expect(uniqueSlug('a', ['a'])).toBe('a-2')
    expect(uniqueSlug('a', ['a', 'a-2'])).toBe('a-3')
  })
})

describe('slugify', () => {
  it('never merges two nodes with equal labels into the same id', () => {
    const idA = slugify('Task', [])
    const idB = slugify('Task', [idA])
    expect(idA).not.toBe(idB)
    expect(idA).toBe('task')
    expect(idB).toBe('task-2')
  })

  it('avoids Mermaid reserved keywords like "end" (subgraph closer)', () => {
    expect(slugify('End', [])).toBe('end_')
    expect(slugify('Subgraph', [])).toBe('subgraph_')
  })
})
