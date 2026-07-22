import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'

// Portão byte-idêntico (T047 / SC-004 / Princípio V): mover TODOS os nós deixa o
// código byte-idêntico; nenhuma posição/zoom/seleção/foco em qualquer saída.

const EFEMEROS = /\b(position|zoom|selecionad|foco|scrollTop|viewport|"x"|"y")\b/i

describe('byte-idêntico ao mover (T047)', () => {
  it('mover todos os nós → textoEditor byte-idêntico', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]')
    const antes = store.getState().textoEditor

    const destinos: Record<string, { x: number; y: number }> = {
      n1: { x: 700, y: 40 },
      n2: { x: 120, y: 400 },
      n3: { x: 500, y: 260 },
    }
    for (const [id, para] of Object.entries(destinos)) store.getState().moverNo(id, para)

    expect(store.getState().textoEditor).toBe(antes) // 0 bytes mudados
    // as posições foram para o arranjo (efêmero), não para o código
    expect(store.getState().arranjo.porId.get('n1')).toEqual({ x: 700, y: 40 })
  })

  it('nenhum efêmero aparece no código nem na cópia', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]')
    store.getState().moverNo('n1', { x: 999, y: 999 })
    expect(EFEMEROS.test(store.getState().textoEditor)).toBe(false)
  })
})
