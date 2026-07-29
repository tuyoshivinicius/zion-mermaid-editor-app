import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const NUCLEO = join(raiz, 'src', 'codec', 'nucleo')
const AREA_TRABALHO = join(raiz, 'src', 'areatrabalho')

// Os nomes das cinco famílias (Princípio XII). `\b` evita casar "statement" com "state".
// R1 estende a proibição ao vocabulário do grafo dirigido: `subgraph` e o token de aresta
// `-->` são gramática de FAMÍLIA e não podem vazar para o núcleo (nem em comentário).
const RE_FAMILIA = /\b(flowchart|graph|stateDiagram|classDiagram|sequenceDiagram|erDiagram|subgraph)\b|-->/

function arquivosTs(dir: string): string[] {
  const saida: string[] = []
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) saida.push(...arquivosTs(p))
    else if (/\.tsx?$/.test(nome)) saida.push(p)
  }
  return saida
}

function ofensoresEm(arquivos: string[]): { arq: string; trecho: string }[] {
  const ofensores: { arq: string; trecho: string }[] = []
  for (const arq of arquivos) {
    const m = RE_FAMILIA.exec(readFileSync(arq, 'utf8'))
    if (m) ofensores.push({ arq: arq.split(raiz)[1], trecho: m[0] })
  }
  return ofensores
}

describe('núcleo sem nome de família (T043 / Princípio XII)', () => {
  it('nenhum arquivo do núcleo do codec nomeia família nem soletra o token de aresta/bloco', () => {
    const arquivos = readdirSync(NUCLEO)
      .filter((n) => /\.ts$/.test(n))
      .map((n) => join(NUCLEO, n))
    expect(ofensoresEm(arquivos)).toEqual([])
  })
})

// R2 (T048): a ÁREA DE TRABALHO é a mesma seja qual for o tipo aberto. Ela fala de
// nó, traçado e moldura — o vocabulário comum às famílias —, e não nomeia nenhuma.
// Um controle de enquadramento que soubesse que existe `flowchart` seria um controle
// a reescrever quando o segundo tipo chegar (Princípio XII).
describe('a área de trabalho não nomeia família (T048 / Princípio XII)', () => {
  it('nenhum módulo de `src/areatrabalho` nomeia família nem soletra o token de aresta/bloco', () => {
    expect(ofensoresEm(arquivosTs(AREA_TRABALHO))).toEqual([])
  })

  it('a varredura enxerga os módulos novos da feature (não é um diretório vazio)', () => {
    const nomes = arquivosTs(AREA_TRABALHO).map((p) => p.split(/[\\/]/).pop())
    for (const esperado of [
      'faixa.ts',
      'tipos.ts',
      'areaVisivel.ts',
      'enquadramento.ts',
      'extensao.ts',
      'orientacao.ts',
      'transito.ts',
      'useNavegacao.ts',
      'AreaDeTrabalho.tsx',
      'ControlesEnquadramento.tsx',
      'Divisao.tsx',
    ]) {
      expect(nomes, esperado).toContain(esperado)
    }
  })
})
