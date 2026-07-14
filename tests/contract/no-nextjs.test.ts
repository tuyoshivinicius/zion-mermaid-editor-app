import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// ADR-004: this is a Vite SPA, never Next.js. No 'use client', no next/*
// import, no file-based app/ or pages/ router directory may appear.

const REPO_ROOT = join(__dirname, '..', '..')
const SCAN_DIRS = ['src']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) return collectSourceFiles(fullPath)
    return SOURCE_EXTENSIONS.has(fullPath.slice(fullPath.lastIndexOf('.'))) ? [fullPath] : []
  })
}

describe('ADR-004: no Next.js artifacts', () => {
  it('has no app/ or pages/ file-based router directory', () => {
    expect(existsSync(join(REPO_ROOT, 'app'))).toBe(false)
    expect(existsSync(join(REPO_ROOT, 'pages'))).toBe(false)
  })

  it('has no next.config.* file', () => {
    const rootEntries = readdirSync(REPO_ROOT)
    const nextConfig = rootEntries.find((entry) => entry.startsWith('next.config.'))
    expect(nextConfig).toBeUndefined()
  })

  it('has no "next" dependency in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'))
    expect(pkg.dependencies?.next).toBeUndefined()
    expect(pkg.devDependencies?.next).toBeUndefined()
  })

  it('has no "use client" directive or next/* import in src/', () => {
    const files = SCAN_DIRS.flatMap((dir) => collectSourceFiles(join(REPO_ROOT, dir)))
    const offenders: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('use client') || /from ['"]next\//.test(content) || /from ['"]next['"]/.test(content)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
