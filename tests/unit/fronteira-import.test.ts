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

describe('fronteira de importação (T044 / Princípio X)', () => {
  it('nenhum módulo do caminho de edição importa mermaid', () => {
    const ofensores: string[] = []
    for (const dir of CAMINHO_EDICAO) {
      for (const arq of arquivos(dir)) {
        if (RE_IMPORT_MERMAID.test(readFileSync(arq, 'utf8'))) ofensores.push(arq)
      }
    }
    expect(ofensores).toEqual([])
  })

  it('os módulos NOVOS do R1 estão no escopo da checagem (não escaparam da fronteira)', () => {
    const todos = CAMINHO_EDICAO.flatMap((d) => arquivos(d))
    const novos = [
      'codec/flowchart/conexao.ts',
      'codec/flowchart/agrupamento.ts',
      'modelo/selecao.ts',
      'canvas/Conexao.tsx',
      'canvas/Agrupamento.tsx',
    ]
    for (const rel of novos) {
      expect(todos.some((p) => p.split('\\').join('/').endsWith(rel)), rel).toBe(true)
    }
  })
})
