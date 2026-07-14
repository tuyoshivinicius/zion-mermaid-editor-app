import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Gate VII (Principle VII): Mermaid text is the only source of truth /
// copyable output. No PNG/SVG image-export route, button, or API may exist.

const REPO_ROOT = join(__dirname, '..', '..')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const IMAGE_EXPORT_PATTERNS = [
  /toPng/i,
  /toSvg/i,
  /export-?(png|svg|image)/i,
  /download.*(png|svg)/i,
  /html-to-image/i,
  /dom-to-image/i,
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

describe('Gate VII: no image-export path', () => {
  it('has no PNG/SVG image-export dependency in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    const offenders = Object.keys(deps).filter((name) => IMAGE_EXPORT_PATTERNS.some((pattern) => pattern.test(name)))
    expect(offenders).toEqual([])
  })

  it('has no image-export route/button/API in src/', () => {
    const files = collectSourceFiles(join(REPO_ROOT, 'src'))
    const offenders: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      if (IMAGE_EXPORT_PATTERNS.some((pattern) => pattern.test(content))) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
