import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { paiDe } from '../../src/modelo/modelo'

// Nascer-neutro (T048 / FR-002, FR-003, Princípio XIV): conexão sem texto,
// agrupamento com título neutro, pertencimento do modelo (nunca da geometria).

function dois() {
  const store = criarSessaoStore()
  store.getState().criarNo({ x: 100, y: 100 }) // n1
  store.getState().criarNo({ x: 400, y: 100 }) // n2
  return store
}

describe('nascer-neutro (T048)', () => {
  it('conexão nasce SEM texto (neutra) e com id de sessão próprio', () => {
    const store = dois()
    store.getState().conectar('n1', 'n2')
    const cs = store.getState().modelo.conexoes
    expect(cs).toHaveLength(1)
    expect(cs[0].texto).toBeNull()
    expect(cs[0].id).toMatch(/^e\d+$/)
  })

  it('agrupamento nasce com título NEUTRO (`Grupo N`)', () => {
    const store = dois()
    store.getState().agrupar(['n1', 'n2'])
    const gs = store.getState().modelo.agrupamentos
    expect(gs).toHaveLength(1)
    expect(gs[0].titulo).toBe('Grupo 1')
    expect(gs[0].membros.sort()).toEqual(['n1', 'n2'])
  })

  it('nó/conexão não herdam nada de um elemento anterior', () => {
    const store = dois()
    store.getState().conectar('n1', 'n2') // e1, sem texto
    store.getState().criarNo({ x: 700, y: 100 }) // n3 nasce neutro
    const n3 = store.getState().modelo.nos.find((n) => n.id === 'n3')!
    expect(n3.rotulo).toBe('Nó 3') // rótulo neutro do gesto, não herdado
    expect(n3.alertas).toEqual([])
  })

  it('nó criado DENTRO da moldura nasce SOLTO (pertencimento é do modelo, não da geometria)', () => {
    const store = dois()
    store.getState().agrupar(['n1', 'n2']) // sub1 reúne n1,n2
    // cria um nó no ponto onde a moldura está (geometricamente "dentro")
    store.getState().criarNo({ x: 250, y: 100 })
    const m = store.getState().modelo
    const n3 = m.nos.find((n) => n.id === 'n3')!
    expect(paiDe(m, n3.id)).toBeNull() // solto: nenhum agrupamento o reivindica
  })

  it('agrupar seleção só-de-conexão / vazia → nada nasce (0 entradas de histórico)', () => {
    const store = dois()
    store.getState().conectar('n1', 'n2')
    const antes = store.getState().historico.entradas.length
    store.getState().agrupar([]) // vazia
    store.getState().agrupar(store.getState().modelo.conexoes.map((c) => c.id)) // só conexão
    expect(store.getState().historico.entradas.length).toBe(antes)
    expect(store.getState().modelo.agrupamentos).toEqual([])
  })
})
