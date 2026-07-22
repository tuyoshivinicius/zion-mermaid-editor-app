import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'

describe('criação por gesto — append cirúrgico (T032 / US1 / SC-009)', () => {
  it('criarNo faz append no fim; nada acima muda; nasce neutro "Nó N" (Princípio XIV)', () => {
    const store = criarSessaoStore()
    expect(store.getState().textoEditor).toBe('flowchart TD') // semente (FR-019)

    store.getState().criarNo({ x: 120, y: 80 })
    expect(store.getState().textoEditor).toBe('flowchart TD\nn1[Nó 1]')

    const antes = store.getState().textoEditor
    store.getState().criarNo({ x: 320, y: 200 })
    const depois = store.getState().textoEditor
    expect(depois).toBe('flowchart TD\nn1[Nó 1]\nn2[Nó 2]')
    expect(depois.startsWith(antes)).toBe(true) // a linha do primeiro permanece (US1-2)

    const no1 = store.getState().modelo.nos[0]
    expect(no1).toMatchObject({ id: 'n1', rotulo: 'Nó 1' }) // sem herdar nada
    expect(no1.alertas).toEqual([])
  })

  it('texto próprio (com trecho ilegível) fica byte-idêntico ao criar (SC-009)', () => {
    const store = criarSessaoStore()
    const proprio = 'flowchart TD\n%% minha nota\nn1[a]\nlixo ( ilegível'
    store.getState().aplicarTexto(proprio)

    store.getState().criarNo({ x: 400, y: 300 })
    const depois = store.getState().textoEditor
    expect(depois.startsWith(proprio + '\n')).toBe(true) // tudo acima byte-idêntico
    expect(depois.slice(proprio.length)).toBe('\nn2[Nó 2]') // só a linha nova
  })

  it('cabeçalho apagado NÃO é recolocado ao criar (US1-4 / FR-019)', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('n1[a]') // pessoa apagou o cabeçalho
    store.getState().criarNo({ x: 50, y: 50 })
    expect(store.getState().textoEditor).toBe('n1[a]\nn2[Nó 2]') // sem `flowchart TD`
  })
})
