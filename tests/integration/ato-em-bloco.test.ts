import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { selecaoVazia, type Selecao } from '../../src/modelo/selecao'

const sel = (over: Partial<Selecao>): Selecao => ({ ...selecaoVazia(), ...over })

function comTexto(texto: string) {
  const store = criarSessaoStore()
  store.getState().aplicarTexto(texto)
  return store
}
const conta = (store: ReturnType<typeof comTexto>) => store.getState().historico.entradas.length

// Ato em bloco = 1 entrada de histórico (T036 / FR-012, SC-006, SC-008).

describe('ato em bloco é UMA entrada de histórico (T036)', () => {
  it('mover uma seleção de N nós → 1 entrada', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]')
    const antes = conta(store)
    store.getState().moverSelecao({ n1: { x: 10, y: 10 }, n2: { x: 20, y: 20 }, n3: { x: 30, y: 30 } })
    expect(conta(store)).toBe(antes + 1)
  })

  it('duplicar uma seleção de N elementos → 1 entrada', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const antes = conta(store)
    store.getState().duplicarSelecao(sel({ nos: new Set(['n1', 'n2']) }))
    expect(conta(store)).toBe(antes + 1)
  })

  it('excluir uma seleção (nó + conexões presas) → 1 entrada', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn1 --> n2\nn2 --> n3')
    const antes = conta(store)
    store.getState().excluirSelecao(sel({ nos: new Set(['n2']) }))
    expect(conta(store)).toBe(antes + 1)
  })

  it('a cascata de esvaziamento em qualquer profundidade → 1 entrada (SC-008)', () => {
    const store = comTexto('flowchart TD\nn1[A]\nsubgraph out[F]\n  subgraph inn[D]\n    n1\n  end\nend')
    const antes = conta(store)
    store.getState().excluirSelecao(sel({ nos: new Set(['n1']) }))
    expect(conta(store)).toBe(antes + 1) // inn + out somem numa entrada só
    expect(store.getState().modelo.agrupamentos).toHaveLength(0)
  })

  it('seleção com agrupamento E membros → cada elemento afetado 1× (0 em dobro, SC-006)', () => {
    // duplicar um grupo + seus membros explicitamente: as cópias não saem em dobro
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nsubgraph g[G]\n  n1\n  n2\nend')
    store.getState().duplicarSelecao(sel({ agrupamentos: new Set(['g']), nos: new Set(['n1', 'n2']) }))
    const m = store.getState().modelo
    expect(m.nos).toHaveLength(4) // 2 originais + 2 cópias (não 4 cópias)
    expect(m.agrupamentos).toHaveLength(2) // 1 original + 1 cópia
  })
})
