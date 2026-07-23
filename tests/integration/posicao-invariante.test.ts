import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { selecaoVazia, type Selecao } from '../../src/modelo/selecao'

const sel = (over: Partial<Selecao>): Selecao => ({ ...selecaoVazia(), ...over })

// Invariância de posição por operação (T050 / Princípio VII, FR-010): nenhuma edição
// rearranja — a posição de TODOS os elementos preexistentes é idêntica antes/depois; o
// elemento novo nasce por colocação local determinística, sem deslocar ninguém.

function snapshot(store: ReturnType<typeof criarSessaoStore>, ids: string[]): Record<string, { x: number; y: number }> {
  const arr = store.getState().arranjo
  const out: Record<string, { x: number; y: number }> = {}
  for (const id of ids) out[id] = { ...arr.porId.get(id)! }
  return out
}
function conferir(store: ReturnType<typeof criarSessaoStore>, antes: Record<string, { x: number; y: number }>) {
  const arr = store.getState().arranjo
  for (const [id, p] of Object.entries(antes)) expect(arr.porId.get(id), id).toEqual(p)
}

function tresNos() {
  const store = criarSessaoStore()
  store.getState().criarNo({ x: 100, y: 100 }) // n1
  store.getState().criarNo({ x: 400, y: 100 }) // n2
  store.getState().criarNo({ x: 700, y: 100 }) // n3
  return store
}

describe('nenhuma operação desloca os preexistentes (T050 / Princípio VII)', () => {
  it('conectar', () => {
    const store = tresNos()
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().conectar('n1', 'n2')
    conferir(store, antes)
  })

  it('agrupar', () => {
    const store = tresNos()
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().agrupar(['n1', 'n2'])
    conferir(store, antes)
  })

  it('duplicar (as cópias nascem deslocadas; os originais não se movem)', () => {
    const store = tresNos()
    store.getState().conectar('n1', 'n2')
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().duplicarSelecao(sel({ nos: new Set(['n1', 'n2']) }))
    conferir(store, antes)
  })

  it('excluir (os sobreviventes não se movem)', () => {
    const store = tresNos()
    const antes = snapshot(store, ['n1', 'n3'])
    store.getState().excluirSelecao(sel({ nos: new Set(['n2']) }))
    conferir(store, antes)
  })

  it('adicionar / retirar membro', () => {
    const store = tresNos()
    store.getState().agrupar(['n1', 'n2']) // sub1
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().adicionarMembros(['n3'], 'sub1')
    conferir(store, antes)
    const antes2 = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().retirarMembros(['n3'])
    conferir(store, antes2)
  })
})
