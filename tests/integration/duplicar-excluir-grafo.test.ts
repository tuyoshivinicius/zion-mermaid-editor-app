import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { selecaoVazia, type Selecao } from '../../src/modelo/selecao'
import { paiDe } from '../../src/modelo/modelo'

const sel = (over: Partial<Selecao>): Selecao => ({ ...selecaoVazia(), ...over })

function comTexto(texto: string) {
  const store = criarSessaoStore()
  store.getState().aplicarTexto(texto)
  return store
}

// Duplicar por fecho transitivo + excluir em cascata (T035 / FR-010, FR-011, SC-007, SC-008).

describe('duplicar (T035 / FR-010)', () => {
  it('2 pontas duplicadas → cópias ligadas por conexão nova; rótulos copiados', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    store.getState().duplicarSelecao(sel({ nos: new Set(['n1', 'n2']) }))
    const m = store.getState().modelo
    expect(m.nos.map((n) => n.id).sort()).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(m.nos.find((n) => n.id === 'n3')!.rotulo).toBe('A') // rótulo copiado
    expect(m.conexoes).toHaveLength(2)
    expect(m.conexoes.some((c) => c.origem === 'n3' && c.destino === 'n4')).toBe(true) // liga as cópias
  })

  it('0 pontas (só a conexão) → conexão PARALELA entre as originais; 0 nós novos', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const idConexao = store.getState().modelo.conexoes[0].id
    store.getState().duplicarSelecao(sel({ conexoes: new Set([idConexao]) }))
    const m = store.getState().modelo
    expect(m.nos).toHaveLength(2) // nenhum nó novo
    expect(m.conexoes).toHaveLength(2)
    expect(m.conexoes.every((c) => c.origem === 'n1' && c.destino === 'n2')).toBe(true) // paralela
  })

  it('exatamente 1 ponta duplicada → a conexão NÃO renasce', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    store.getState().duplicarSelecao(sel({ nos: new Set(['n1']) }))
    const m = store.getState().modelo
    expect(m.nos.map((n) => n.id).sort()).toEqual(['n1', 'n2', 'n3'])
    expect(m.conexoes).toHaveLength(1) // a conexão pendente não renasce
  })

  it('cópia de membro (sem o grupo) HERDA o agrupamento do original', () => {
    const store = comTexto('flowchart TD\nn1[A]\nsubgraph g[G]\n  n1\nend')
    store.getState().duplicarSelecao(sel({ nos: new Set(['n1']) }))
    const m = store.getState().modelo
    const copia = m.nos.find((n) => n.id === 'n2')!
    expect(paiDe(m, copia.id)!.id).toBe('g') // a cópia nasce no mesmo grupo
    expect(m.agrupamentos.find((x) => x.id === 'g')!.membros.sort()).toEqual(['n1', 'n2'])
  })

  it('duplicar SÓ a moldura → fecho transitivo: grupo novo + cópias dos membros; título copiado', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nsubgraph g[Grupo]\n  n1\n  n2\nend')
    store.getState().duplicarSelecao(sel({ agrupamentos: new Set(['g']) }))
    const m = store.getState().modelo
    expect(m.agrupamentos).toHaveLength(2)
    const novo = m.agrupamentos.find((x) => x.id !== 'g')!
    expect(novo.titulo).toBe('Grupo') // título copiado
    expect(novo.membros).toHaveLength(2) // cópias dos membros
    expect(m.nos).toHaveLength(4)
  })
})

describe('excluir (T035 / FR-011, SC-007, SC-008)', () => {
  it('excluir um nó leva as conexões presas (0 pendentes)', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn1 --> n2\nn2 --> n3')
    store.getState().excluirSelecao(sel({ nos: new Set(['n2']) }))
    const m = store.getState().modelo
    expect(m.nos.map((n) => n.id).sort()).toEqual(['n1', 'n3'])
    expect(m.conexoes).toHaveLength(0) // ambas presas a n2 saíram
  })

  it('excluir uma conexão remove só ela; as pontas ficam', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const id = store.getState().modelo.conexoes[0].id
    store.getState().excluirSelecao(sel({ conexoes: new Set([id]) }))
    const m = store.getState().modelo
    expect(m.conexoes).toHaveLength(0)
    expect(m.nos.map((n) => n.id).sort()).toEqual(['n1', 'n2']) // pontas preservadas
  })

  it('excluir SÓ a moldura preserva 100% dos membros (SC-008)', () => {
    const store = comTexto('flowchart TD\nn1[A]\nn2[B]\nsubgraph g[G]\n  n1\n  n2\nend')
    store.getState().excluirSelecao(sel({ agrupamentos: new Set(['g']) }))
    const m = store.getState().modelo
    expect(m.agrupamentos).toHaveLength(0) // moldura foi
    expect(m.nos.map((n) => n.id).sort()).toEqual(['n1', 'n2']) // membros ficam (soltos)
    expect(paiDe(m, 'n1')).toBeNull()
  })

  it('esvaziamento sobe em CASCATA pelos níveis aninhados (SC-008)', () => {
    // out contém só inn; inn contém só n1. Excluir n1 esvazia inn E out.
    const store = comTexto('flowchart TD\nn1[A]\nsubgraph out[Fora]\n  subgraph inn[Dentro]\n    n1\n  end\nend')
    store.getState().excluirSelecao(sel({ nos: new Set(['n1']) }))
    const m = store.getState().modelo
    expect(m.nos).toHaveLength(0)
    expect(m.agrupamentos).toHaveLength(0) // inn e out sumiram em cascata
  })

  it('cascata NÃO apaga bloco vazio escrito à mão (M5)', () => {
    const store = comTexto('flowchart TD\nn1[A]\nsubgraph vazio[V]\nend')
    store.getState().excluirSelecao(sel({ nos: new Set(['n1']) }))
    const m = store.getState().modelo
    expect(m.agrupamentos.map((g) => g.id)).toEqual(['vazio']) // o vazio à mão permanece
  })
})
