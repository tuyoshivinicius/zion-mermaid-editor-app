import { describe, it, expect } from 'vitest'
import { appendLinhaNoFim, normalizarCabecalhoParaCopia } from '../../src/codec'
import type { No } from '../../src/modelo/modelo'

const no = (id: string, rotulo: string | null): No => ({ id, rotulo, alertas: [] })

describe('appendLinhaNoFim (T017 / FR-017)', () => {
  it('acrescenta a linha do nó no fim; nada acima muda', () => {
    const texto = 'flowchart TD\nn1[Alfa]'
    const r = appendLinhaNoFim(texto, no('n2', 'Nó 2'))
    expect(r).toBe('flowchart TD\nn1[Alfa]\nn2[Nó 2]')
    expect(r.startsWith(texto)).toBe(true) // o texto de cima é byte-idêntico
  })

  it('texto vazio → só a linha nova', () => {
    expect(appendLinhaNoFim('', no('n1', 'Nó 1'))).toBe('n1[Nó 1]')
  })

  it('respeita quebra de linha final existente', () => {
    expect(appendLinhaNoFim('flowchart TD\n', no('n1', 'Nó 1'))).toBe('flowchart TD\nn1[Nó 1]')
  })
})

describe('normalizarCabecalhoParaCopia (T017 / FR-014)', () => {
  it('sem declaração reconhecida → acrescenta flowchart TD no topo, resto byte-idêntico', () => {
    expect(normalizarCabecalhoParaCopia('n1[Alfa]\nn2[Beta]')).toBe('flowchart TD\nn1[Alfa]\nn2[Beta]')
  })

  it('declaração de OUTRO tipo → substitui aquela linha (US3-7)', () => {
    expect(normalizarCabecalhoParaCopia('stateDiagram-v2\nn1[a]')).toBe('flowchart TD\nn1[a]')
  })

  it('já tem flowchart → intocado (o texto da pessoa vence)', () => {
    const t = 'flowchart TD\nn1[a]'
    expect(normalizarCabecalhoParaCopia(t)).toBe(t)
    const g = 'graph LR\nn1[a]'
    expect(normalizarCabecalhoParaCopia(g)).toBe(g)
  })

  it('editor vazio → flowchart TD sozinha (US3-6)', () => {
    expect(normalizarCabecalhoParaCopia('')).toBe('flowchart TD')
    expect(normalizarCabecalhoParaCopia('   \n  ')).toBe('flowchart TD')
  })

  it('trecho ilegível vai junto; difere só na declaração (US3-8)', () => {
    const editor = 'flowchart TD\nn1[ok]\na --> b\nn2(fora)'
    expect(normalizarCabecalhoParaCopia(editor)).toBe(editor) // já tem flowchart → byte-idêntico
  })
})
