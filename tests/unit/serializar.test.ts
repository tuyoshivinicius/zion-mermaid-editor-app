import { describe, it, expect } from 'vitest'
import { analisar, serializar, normalizar, emitirNo } from '../../src/codec'
import { documentosNoVocabulario } from '../fixtures/corpus'

describe('serializar / ponto fixo (T015 / research §3)', () => {
  it('emitirNo é idempotente por statement', () => {
    for (const linha of ['n1', 'n1[Alfa]', 'n1["Nó, A"]']) {
      const m1 = analisar(`flowchart TD\n${linha}`).modelo
      const s1 = emitirNo(m1.nos[0])
      const m2 = analisar(`flowchart TD\n${s1}`).modelo
      expect(emitirNo(m2.nos[0])).toBe(s1)
    }
  })

  it('analisar ∘ serializar ≡ id (normalizado) sobre o corpus no vocabulário', () => {
    for (const { nome, texto } of documentosNoVocabulario()) {
      const m1 = analisar(texto).modelo
      const m2 = analisar(serializar(m1)).modelo
      expect(normalizar(m2), `round-trip de ${nome}`).toEqual(normalizar(m1))
    }
  })

  it('serializar é idempotente (documento)', () => {
    const m = analisar('flowchart TD\nn1[Alfa]\nn2["Beta, x"]\nn3').modelo
    const s1 = serializar(m)
    const s2 = serializar(analisar(s1).modelo)
    expect(s2).toBe(s1)
  })
})
