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
// R2 (T049): `areatrabalho` NASCE dentro da fronteira — a área de trabalho é caminho
// de edição como qualquer outro, e o `dependency-cruiser` foi estendido junto.
const CAMINHO_EDICAO = ['modelo', 'projecao', 'canvas', 'editor', 'codec', 'areatrabalho'].map((d) =>
  join(raiz, 'src', d),
)
const RE_IMPORT_MERMAID = /(from\s+['"]mermaid|import\s+['"]mermaid|require\(\s*['"]mermaid)/

// Princípio IV / FR-014: nenhum gesto da área de trabalho abre transação. A fronteira
// forte é a regra `sem-transacao-na-area-de-trabalho` do `dependency-cruiser`; esta é
// a mesma leitura, por texto, para o caso de alguém alcançar `commit()` por outro nome.
const RE_TRANSACAO = /from\s+['"][^'"]*modelo\/transacao['"]/

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

  it('os módulos NOVOS do R2 também (T049)', () => {
    const todos = CAMINHO_EDICAO.flatMap((d) => arquivos(d))
    const novos = [
      'areatrabalho/faixa.ts',
      'areatrabalho/tipos.ts',
      'areatrabalho/areaVisivel.ts',
      'areatrabalho/enquadramento.ts',
      'areatrabalho/extensao.ts',
      'areatrabalho/orientacao.ts',
      'areatrabalho/transito.ts',
      'areatrabalho/useNavegacao.ts',
      'areatrabalho/AreaDeTrabalho.tsx',
      'areatrabalho/ControlesEnquadramento.tsx',
      'areatrabalho/Divisao.tsx',
      'canvas/caminho.ts',
    ]
    for (const rel of novos) {
      expect(todos.some((p) => p.split('\\').join('/').endsWith(rel)), rel).toBe(true)
    }
  })
})

describe('a área de trabalho não alcança a transação (T049 / Princípio IV, FR-014)', () => {
  it('nenhum módulo de `src/areatrabalho` importa `modelo/transacao`', () => {
    const ofensores = arquivos(join(raiz, 'src', 'areatrabalho')).filter((arq) =>
      RE_TRANSACAO.test(readFileSync(arq, 'utf8')),
    )
    expect(ofensores).toEqual([])
  })

  it('nenhum deles chama `commit(` — não é filtragem, é ausência de caminho', () => {
    const ofensores = arquivos(join(raiz, 'src', 'areatrabalho')).filter((arq) =>
      /\bcommit\s*\(/.test(readFileSync(arq, 'utf8')),
    )
    expect(ofensores).toEqual([])
  })
})

// T057 — AJUSTAR À TELA NÃO É EXPORTAR (Princípio XIII / PRD §4).
//
// O gesto muda `(x, y, zoom)` e nada mais. Sem servidor, sem contas, e SEM exportar
// imagem: nem PNG, nem SVG, nem qualquer formato. Reintroduzir isso exige ADR novo e
// emenda da constituição — nunca uma decisão de PR, e muito menos um efeito colateral
// de uma feature de enquadramento.
const CAMINHOS_DE_IMAGEM = [
  /\btoDataURL\s*\(/,
  /\btoBlob\s*\(/,
  /\bXMLSerializer\b/,
  /\bcreateObjectURL\s*\(/,
  /download\s*=/,
  /\bsaveAs\s*\(/,
]

describe('0 caminhos de exportação de imagem no código de produção (T057 / Princípio XIII)', () => {
  it('nenhum módulo de `src/` abre caminho de download de imagem', () => {
    const ofensores: { arq: string; trecho: string }[] = []
    for (const dir of CAMINHO_EDICAO) {
      for (const arq of arquivos(dir)) {
        const conteudo = readFileSync(arq, 'utf8')
        for (const re of CAMINHOS_DE_IMAGEM) {
          const m = re.exec(conteudo)
          if (m) ofensores.push({ arq: arq.split(raiz)[1], trecho: m[0] })
        }
      }
    }
    expect(ofensores).toEqual([])
  })

  it('o canvas 2D da área de trabalho MEDE texto — não pinta nem serializa nada', () => {
    const extensao = readFileSync(join(raiz, 'src', 'areatrabalho', 'extensao.ts'), 'utf8')
    expect(extensao).toContain('measureText')
    for (const re of CAMINHOS_DE_IMAGEM) expect(re.test(extensao), re.source).toBe(false)
  })
})
