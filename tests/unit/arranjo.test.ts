import { describe, it, expect } from 'vitest'
import { Arranjo, materializarPosicoes, ORIGEM, chavePos } from '../../src/modelo/arranjo'

describe('Arranjo.posicaoPara (T018 / FR-015 / SC-008)', () => {
  it('lembrada se o lugar está livre', () => {
    const a = new Arranjo()
    a.gravar('n1', { x: 300, y: 200 })
    expect(a.posicaoPara('n1', null, new Set())).toEqual({ x: 300, y: 200 })
  })

  it('sem âncora (primeiro nó) → origem fixa, independente da janela', () => {
    const a = new Arranjo()
    expect(a.posicaoPara('n1', null, new Set())).toEqual(ORIGEM)
  })

  it('determinística ancorada no anterior quando não há lembrança', () => {
    const a = new Arranjo()
    const ancora = { x: 48, y: 48 }
    const p = a.posicaoPara('n2', ancora, new Set([chavePos(ancora)]))
    expect(p.x).toBeGreaterThan(ancora.x) // à direita da âncora
  })

  it('NUNCA empilha: lugar ocupado → cai na colocação determinística', () => {
    const a = new Arranjo()
    a.gravar('n1', { x: 100, y: 100 })
    const p = a.posicaoPara('n1', { x: 48, y: 48 }, new Set([chavePos({ x: 100, y: 100 })]))
    expect(p).not.toEqual({ x: 100, y: 100 })
  })

  it('transferir no renomear: a lembrança muda de dono; o antigo a perde (FR-018)', () => {
    const a = new Arranjo()
    a.gravar('n1', { x: 300, y: 200 })
    a.transferir('n1', 'x')
    expect(a.porId.get('x')).toEqual({ x: 300, y: 200 })
    expect(a.porId.has('n1')).toBe(false)
  })
})

describe('materializarPosicoes (SC-008 / Princípio VII)', () => {
  it('mesmo código 2× → posições idênticas (determinismo)', () => {
    const a = new Arranjo()
    const ids = ['a', 'b', 'c']
    const p1 = materializarPosicoes(new Arranjo(), ids)
    const p2 = materializarPosicoes(a, ids)
    for (const id of ids) expect(p2.get(id)).toEqual(p1.get(id))
  })

  it('0 reposicionamentos: preexistentes ficam ao acrescentar um novo', () => {
    const a = new Arranjo()
    const antes = materializarPosicoes(a, ['a', 'b'])
    const depois = materializarPosicoes(a, ['a', 'b', 'c'])
    expect(depois.get('a')).toEqual(antes.get('a'))
    expect(depois.get('b')).toEqual(antes.get('b'))
  })

  it('nenhuma caixa empilhada: todas as posições são distintas', () => {
    const a = new Arranjo()
    const p = materializarPosicoes(a, ['a', 'b', 'c', 'd', 'e'])
    const chaves = new Set([...p.values()].map(chavePos))
    expect(chaves.size).toBe(5)
  })
})
