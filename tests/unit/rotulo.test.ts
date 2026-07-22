import { describe, it, expect } from 'vitest'
import { codificar, decodificar, checarExpressividade } from '../../src/codec/nucleo/rotulo'
import { ROTULOS_HOSTIS } from '../fixtures/rotulos-hostis'

describe('codec do rótulo (T009 / Princípio VIII)', () => {
  it('aspas delimitam e NÃO entram no rótulo', () => {
    expect(decodificar('"Nó, A"').texto).toBe('Nó, A')
    expect(decodificar('"citado"').texto).toBe('citado')
  })

  it('rótulo cru (sem aspas) volta como está', () => {
    expect(decodificar('Nó A').texto).toBe('Nó A')
  })

  it('parcial tolerante: aspas abertas sem fecho é estado de digitação (FR-018)', () => {
    // whitespace de borda é aparado (fidelidade ao render do mermaid); o conteúdo acompanha letra a letra
    expect(decodificar('"Nó A').texto).toBe('Nó A')
    expect(decodificar('Nó A').texto).toBe('Nó A')
    expect(decodificar('"Nó ').texto).toBe('Nó')
  })

  it('checarExpressividade marca controle, tabulação e espaço colapsado', () => {
    expect(checarExpressividade('texto limpo')).toHaveLength(0)
    expect(checarExpressividade('dois  espaços').some((a) => a.tipo === 'espaco-colapsado')).toBe(true)
    expect(checarExpressividade('com\ttab').some((a) => a.tipo === 'tabulacao')).toBe(true)
    expect(checarExpressividade(' borda ').some((a) => a.tipo === 'espaco-colapsado')).toBe(true)
  })

  describe('round-trip byte-a-byte sobre o corpus hostil (≥26)', () => {
    it('tem pelo menos 26 rótulos', () => {
      expect(ROTULOS_HOSTIS.length).toBeGreaterThanOrEqual(26)
    })

    for (const { texto, esperaMarcado } of ROTULOS_HOSTIS) {
      it(`volta byte-a-byte: ${JSON.stringify(texto).slice(0, 40)}`, () => {
        const { bruto } = codificar(texto)
        const { texto: volta } = decodificar(bruto)
        // O codec é lossless: TODOS voltam byte-a-byte (o "em silêncio" proibido nunca ocorre).
        expect(volta).toBe(texto)
      })

      it(`marca quando o tipo não expressa fiel: ${JSON.stringify(texto).slice(0, 40)}`, () => {
        const marcas = checarExpressividade(texto)
        expect(marcas.length > 0).toBe(esperaMarcado)
      })
    }
  })
})
