import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function arquivos(dir: string): string[] {
  const saida: string[] = []
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) saida.push(...arquivos(p))
    else if (/\.tsx?$/.test(nome)) saida.push(p)
  }
  return saida
}

// Caminho de edição (Princípio X): modelo, transações, projeção, canvas, editor, codec.
const CAMINHO_EDICAO = ['modelo', 'projecao', 'canvas', 'editor', 'codec'].map((d) => join(raiz, 'src', d))
const RE_IMPORT_MERMAID = /(from\s+['"]mermaid|import\s+['"]mermaid|require\(\s*['"]mermaid)/

describe('fronteira de importação (T048 / Princípio X)', () => {
  it('nenhum módulo do caminho de edição importa mermaid', () => {
    const ofensores: string[] = []
    for (const dir of CAMINHO_EDICAO) {
      for (const arq of arquivos(dir)) {
        if (RE_IMPORT_MERMAID.test(readFileSync(arq, 'utf8'))) ofensores.push(arq)
      }
    }
    expect(ofensores).toEqual([])
  })
})
