import { describe, it, expect } from 'vitest'
import { Historico } from '../../src/modelo/transacao'
import { criarSessaoStore } from '../../src/modelo/store'
import type { Modelo } from '../../src/modelo/modelo'
import { vazio } from '../../src/modelo/modelo'

const entrada = (origem: 'canvas' | 'editor', modelo: Modelo = vazio()) => ({
  origem,
  textoEditor: '',
  modelo,
  arranjo: new Map(),
})

describe('Historico — coalescência (T025 / SC-007)', () => {
  it('N transações com a mesma chave = 1 entrada', () => {
    const h = new Historico()
    for (let i = 0; i < 8; i++) h.registrar(entrada('editor'), 'editor-digitacao')
    expect(h.entradas).toHaveLength(1)
  })

  it('chave nula abre entrada nova a cada vez', () => {
    const h = new Historico()
    h.registrar(entrada('canvas'), null)
    h.registrar(entrada('canvas'), null)
    expect(h.entradas).toHaveLength(2)
  })

  it('encerrarRajada força a próxima a ser entrada nova', () => {
    const h = new Historico()
    h.registrar(entrada('editor'), 'editor-digitacao')
    h.encerrarRajada()
    h.registrar(entrada('editor'), 'editor-digitacao')
    expect(h.entradas).toHaveLength(2)
  })
})

describe('Transação como fronteira do modelo (T025 / Princípio IV)', () => {
  it('a rajada de digitação num rótulo é 1 ato', () => {
    const store = criarSessaoStore()
    const antes = store.getState().historico.entradas.length
    // rajada: várias teclas no mesmo rótulo
    for (const t of ['flowchart TD\nn', 'flowchart TD\nn1', 'flowchart TD\nn1[', 'flowchart TD\nn1[A]']) {
      store.getState().aplicarTexto(t)
    }
    expect(store.getState().historico.entradas.length - antes).toBe(1)
  })

  it('criar e mover são atos próprios (não coalescem com a digitação)', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('flowchart TD\nn1[A]')
    const base = store.getState().historico.entradas.length
    store.getState().criarNo({ x: 400, y: 300 })
    store.getState().moverNo('n1', { x: 10, y: 10 })
    expect(store.getState().historico.entradas.length - base).toBe(2)
  })

  it('toda mutação atravessa o histórico: o modelo só muda via ação do store', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 100, y: 100 })
    const ultima = store.getState().historico.entradas.at(-1)
    expect(ultima?.origem).toBe('canvas')
    expect(ultima?.modelo).toBe(store.getState().modelo) // a entrada guarda o modelo do commit
  })
})
