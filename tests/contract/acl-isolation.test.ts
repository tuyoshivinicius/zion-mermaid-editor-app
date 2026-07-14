import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Gate VI (Principle VI): only src/core/mermaid-acl/ may import the Mermaid
// internal API. This grep backs up the ESLint no-restricted-imports rule
// (eslint.config.js) as an independently verifiable CI gate.

const REPO_ROOT = join(__dirname, '..', '..')
const SRC_ROOT = join(REPO_ROOT, 'src')
const ACL_DIR = join(SRC_ROOT, 'core', 'mermaid-acl')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])
const MERMAID_IMPORT_PATTERN = /from\s+['"]mermaid['"]/

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) return collectSourceFiles(fullPath)
    return SOURCE_EXTENSIONS.has(fullPath.slice(fullPath.lastIndexOf('.'))) ? [fullPath] : []
  })
}

describe('Gate VI: Mermaid internal API isolation', () => {
  it('only src/core/mermaid-acl/ imports the mermaid package', () => {
    const files = collectSourceFiles(SRC_ROOT).filter((file) => !file.startsWith(ACL_DIR))
    const offenders = files.filter((file) => MERMAID_IMPORT_PATTERN.test(readFileSync(file, 'utf-8')))
    expect(offenders).toEqual([])
  })

  it('the ACL module itself does import mermaid (sanity check the grep works)', () => {
    const aclFiles = collectSourceFiles(ACL_DIR)
    const importsMermaid = aclFiles.some((file) => MERMAID_IMPORT_PATTERN.test(readFileSync(file, 'utf-8')))
    expect(importsMermaid).toBe(true)
  })
})
