import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const NUCLEO = join(raiz, 'src', 'codec', 'nucleo')

// Os nomes das cinco famílias (Princípio XII). `\b` evita casar "statement" com "state".
const RE_FAMILIA = /\b(flowchart|graph|stateDiagram|classDiagram|sequenceDiagram|erDiagram)\b/

describe('núcleo sem nome de família (T049 / Princípio XII)', () => {
  it('nenhum arquivo do núcleo do codec referencia nome de família', () => {
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
