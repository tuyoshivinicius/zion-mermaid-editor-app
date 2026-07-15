import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as starterModel from '@/starter/model'

// Gate FR-012/SC-011: the starter is a single, fixed scaffold — no surface
// to choose between multiple templates may exist anywhere in the source.

const REPO_ROOT = join(__dirname, '..', '..')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

const TEMPLATE_CHOICE_PATTERNS = [
  /template\s*(selector|picker|gallery|chooser|list)/i,
  /(escolher|selecionar|choose|select)\s+(um\s+)?template/i,
  /role=["']?(listbox|combobox|menu)["']?[^>]*template/i,
]

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) return collectSourceFiles(fullPath)
    return SOURCE_EXTENSIONS.has(fullPath.slice(fullPath.lastIndexOf('.'))) ? [fullPath] : []
  })
}

describe('FR-012/SC-011: no template-choice surface', () => {
  it('has no source file matching a template-choice pattern', () => {
    const files = collectSourceFiles(join(REPO_ROOT, 'src'))
    const offenders: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      if (TEMPLATE_CHOICE_PATTERNS.some((pattern) => pattern.test(content))) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it('exposes exactly one starter — no plural template collection', () => {
    expect(Object.keys(starterModel).sort()).toEqual(['STARTER_MODEL', 'STARTER_TEXT'])
    expect(Array.isArray(starterModel.STARTER_MODEL)).toBe(false)
    expect((starterModel as Record<string, unknown>).TEMPLATES).toBeUndefined()
    expect((starterModel as Record<string, unknown>).STARTER_TEMPLATES).toBeUndefined()
  })
})
