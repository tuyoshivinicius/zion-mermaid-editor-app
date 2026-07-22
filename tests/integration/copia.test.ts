import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { normalizarCabecalhoParaCopia } from '../../src/codec'

// Mock da área de transferência (jsdom não a traz).
let escrito: string | null = null
let deveFalhar = false

beforeEach(() => {
  escrito = null
  deveFalhar = false
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn(async (t: string) => {
        if (deveFalhar) throw new Error('negado')
        escrito = t
      }),
    },
  })
})
afterEach(() => vi.restoreAllMocks())

describe('transformação da cópia (T042 / US3 / FR-014)', () => {
  it('acrescenta flowchart TD quando não há declaração; resto byte-idêntico', () => {
    expect(normalizarCabecalhoParaCopia('n1[a]\nn2[b]')).toBe('flowchart TD\nn1[a]\nn2[b]')
  })

  it('substitui a declaração de outro tipo; mantém a que já existe', () => {
    expect(normalizarCabecalhoParaCopia('classDiagram\nn1[a]')).toBe('flowchart TD\nn1[a]')
    expect(normalizarCabecalhoParaCopia('flowchart TD\nn1[a]')).toBe('flowchart TD\nn1[a]')
  })

  it('zero nós / editor apagado → flowchart TD sozinha (US3-6)', () => {
    expect(normalizarCabecalhoParaCopia('')).toBe('flowchart TD')
  })

  it('store.copiar escreve o texto normalizado e confirma (SC-006)', async () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('classDiagram\nn1[a]')
    const r = await store.getState().copiar()
    expect(r).toBe('copiado')
    expect(escrito).toBe('flowchart TD\nn1[a]')
  })

  it('store.copiar avisa a falha, nunca em silêncio (SC-006)', async () => {
    deveFalhar = true
    const store = criarSessaoStore()
    const r = await store.getState().copiar()
    expect(r).toBe('falhou')
  })

  it('trecho ilegível vai junto; difere só na declaração (US3-8)', () => {
    const editor = 'flowchart TD\nn1[ok]\na --> b\nn2(fora)'
    expect(normalizarCabecalhoParaCopia(editor)).toBe(editor)
  })
})
