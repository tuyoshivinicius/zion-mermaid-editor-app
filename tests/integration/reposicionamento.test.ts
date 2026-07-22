import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import type { EstadoSessao } from '../../src/modelo/store'
import type { StoreApi } from 'zustand'

// Portão do Princípio VII / SC-008 (T051): para CADA operação do R0, a posição de
// TODOS os preexistentes é idêntica antes/depois (0 reposicionamentos). E ler o
// mesmo código 2× → posições idênticas.

function posicoes(store: StoreApi<EstadoSessao>): Record<string, { x: number; y: number }> {
  const r: Record<string, { x: number; y: number }> = {}
  for (const n of store.getState().projecao.nodes) r[n.id] = { ...n.position }
  return r
}

function montarTres(): StoreApi<EstadoSessao> {
  const store = criarSessaoStore()
  store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]')
  return store
}

describe('0 reposicionamentos de preexistente (T051)', () => {
  it('criar um novo nó não move os preexistentes', () => {
    const store = montarTres()
    const antes = posicoes(store)
    store.getState().criarNo({ x: 640, y: 480 })
    const depois = posicoes(store)
    for (const id of ['n1', 'n2', 'n3']) expect(depois[id]).toEqual(antes[id])
  })

  it('mover um nó não move os outros', () => {
    const store = montarTres()
    const antes = posicoes(store)
    store.getState().moverNo('n2', { x: 900, y: 90 })
    const depois = posicoes(store)
    expect(depois['n1']).toEqual(antes['n1'])
    expect(depois['n3']).toEqual(antes['n3'])
  })

  it('digitar no código (acrescentar linha) não move os preexistentes', () => {
    const store = montarTres()
    const antes = posicoes(store)
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn4[D]')
    const depois = posicoes(store)
    for (const id of ['n1', 'n2', 'n3']) expect(depois[id]).toEqual(antes[id])
  })

  it('apagar uma linha não move os que restam', () => {
    const store = montarTres()
    const antes = posicoes(store)
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn3[C]') // apagou n2
    const depois = posicoes(store)
    expect(depois['n1']).toEqual(antes['n1'])
    expect(depois['n3']).toEqual(antes['n3'])
  })

  it('reescrever o id tecla a tecla não move os preexistentes (e o nó segue junto)', () => {
    const store = montarTres()
    const antes = posicoes(store)
    // n3 -> n3x -> n3xy, um passo por vez
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3x[C]')
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3xy[C]')
    const depois = posicoes(store)
    expect(depois['n1']).toEqual(antes['n1'])
    expect(depois['n2']).toEqual(antes['n2'])
    expect(depois['n3xy']).toEqual(antes['n3']) // o mesmo lugar, id renomeado
  })

  it('ler o mesmo código 2× → posições idênticas (determinismo)', () => {
    const a = criarSessaoStore()
    const b = criarSessaoStore()
    const codigo = 'flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn4[D]'
    a.getState().aplicarTexto(codigo)
    b.getState().aplicarTexto(codigo)
    expect(posicoes(b)).toEqual(posicoes(a))
  })
})
