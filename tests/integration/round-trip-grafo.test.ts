import { describe, it, expect } from 'vitest'
import { analisar, serializar, normalizar } from '../../src/codec'
import { corpusDirigido } from '../fixtures/corpus'

// Round-trip / ponto-fixo do grafo dirigido + tolerância (Princípio IX, FR-013, FR-019).

describe('round-trip do grafo dirigido (T012)', () => {
  it('analisar ∘ serializar ≡ id (normalizado) sobre o corpus dirigido', () => {
    for (const { nome, texto } of corpusDirigido()) {
      const m1 = analisar(texto).modelo
      const m2 = analisar(serializar(m1)).modelo
      expect(normalizar(m2), `round-trip de ${nome}`).toEqual(normalizar(m1))
    }
  })

  it('serializar é idempotente sobre o corpus dirigido', () => {
    for (const { nome, texto } of corpusDirigido()) {
      const s1 = serializar(analisar(texto).modelo)
      const s2 = serializar(analisar(s1).modelo)
      expect(s2, `idempotência de ${nome}`).toBe(s1)
    }
  })

  it('a análise NUNCA devolve vazio: todo prefixo do corpus dirigido dá um modelo', () => {
    for (const { texto } of corpusDirigido()) {
      for (let k = 0; k <= texto.length; k++) {
        const r = analisar(texto.slice(0, k))
        expect(r.modelo).toBeDefined()
        expect(Array.isArray(r.erros)).toBe(true)
        expect(Array.isArray(r.avisos)).toBe(true)
      }
    }
  })

  it('0 perdas: um elemento materializado num prefixo não some ao continuar o documento', () => {
    for (const { nome, texto } of corpusDirigido()) {
      // ao fim do documento, tudo o que apareceu em algum prefixo continua lá
      const finalM = analisar(texto).modelo
      const idsFinais = new Set([
        ...finalM.nos.map((n) => n.id),
        ...finalM.agrupamentos.map((g) => g.id),
      ])
      // subgraph aberto e fechado, aresta completa: os ids estruturais persistem
      for (const g of finalM.agrupamentos) expect(idsFinais.has(g.id), `${nome}`).toBe(true)
    }
  })
})

describe('classificação erro-que-derruba × aviso (T012 / FR-013, FR-019)', () => {
  it('`subgraph` sem `end` AVISA (não derruba) — em duas listas separadas', () => {
    const r = analisar('flowchart TD\nn1[ok]\nsubgraph sub1[G]\n  n2')
    expect(r.avisos.length).toBeGreaterThan(0)
    expect(r.erros).toEqual([]) // nenhum erro-que-derruba
    // nem n1 nem n2 somem
    expect(r.modelo.nos.map((n) => n.id).sort()).toEqual(['n1', 'n2'])
  })

  it('aresta incompleta AVISA (não derruba elemento já materializado)', () => {
    const r = analisar('flowchart TD\nn1[ok]\na -->\nn2[ok2]')
    expect(r.avisos.length).toBeGreaterThan(0)
    expect(r.erros).toEqual([])
    expect(r.modelo.nos.map((n) => n.id)).toContain('n1')
    expect(r.modelo.nos.map((n) => n.id)).toContain('n2')
  })

  it('statement fora do vocabulário (fan-out) DERRUBA aquele statement (erro), sem tocar no resto', () => {
    const r = analisar('flowchart TD\nn1[ok]\na --> b & c\nn2[ok2]')
    expect(r.erros.length).toBeGreaterThan(0)
    expect(r.modelo.nos.map((n) => n.id)).toEqual(['n1', 'n2'])
  })

  it('FR-019: aresta dentro do bloco cria a conexão E agrupa as pontas (lê as duas formas)', () => {
    const m = analisar('flowchart TD\nsubgraph sub1\n  a --> b\nend').modelo
    expect(m.conexoes).toHaveLength(1)
    expect(m.agrupamentos[0].membros.sort()).toEqual(['a', 'b'])
  })
})
