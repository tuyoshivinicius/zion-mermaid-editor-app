import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const NUCLEO = join(raiz, 'src', 'codec', 'nucleo')

// Os nomes das cinco famílias (Princípio XII). `\b` evita casar "statement" com "state".
// R1 estende a proibição ao vocabulário do grafo dirigido: `subgraph` e o token de aresta
// `-->` são gramática de FAMÍLIA e não podem vazar para o núcleo (nem em comentário).
const RE_FAMILIA = /\b(flowchart|graph|stateDiagram|classDiagram|sequenceDiagram|erDiagram|subgraph)\b|-->/

describe('núcleo sem nome de família (T043 / Princípio XII)', () => {
  it('nenhum arquivo do núcleo do codec nomeia família nem soletra o token de aresta/bloco', () => {
    const ofensores: { arq: string; trecho: string }[] = []
    for (const nome of readdirSync(NUCLEO)) {
      if (!/\.ts$/.test(nome)) continue
      const conteudo = readFileSync(join(NUCLEO, nome), 'utf8')
      const m = RE_FAMILIA.exec(conteudo)
      if (m) ofensores.push({ arq: nome, trecho: m[0] })
    }
    expect(ofensores).toEqual([])
  })
})
