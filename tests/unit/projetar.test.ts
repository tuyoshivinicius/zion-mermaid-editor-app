import { describe, it, expect, beforeEach } from 'vitest'
import { analisar } from '../../src/codec'
import { Arranjo, materializarPosicoes } from '../../src/modelo/arranjo'
import { projetar, limparCacheProjecao } from '../../src/projecao/projetar'
import type { Modelo } from '../../src/modelo/modelo'

function prep(texto: string): { modelo: Modelo; arranjo: Arranjo } {
  const modelo = analisar(texto).modelo
  const arranjo = new Arranjo()
  materializarPosicoes(arranjo, modelo.nos.map((n) => n.id))
  return { modelo, arranjo }
}

describe('projetar — invariante de reuso (T022 / Princípio III, portão)', () => {
  beforeEach(() => limparCacheProjecao())

  it('projeta 2× mudando 1 nó → identidade referencial dos demais', () => {
    const { modelo, arranjo } = prep('flowchart TD\nn1[Alfa]\nn2[Beta]\nn3[Gama]')
    const p1 = projetar(modelo, arranjo)

    // muda SÓ o rótulo de n2
    modelo.nos[1].rotulo = 'Beta editado'
    const p2 = projetar(modelo, arranjo)

    // n1 e n3 são o MESMO objeto (reuso); n2 é objeto novo
    expect(p2.nodes[0]).toBe(p1.nodes[0])
    expect(p2.nodes[2]).toBe(p1.nodes[2])
    expect(p2.nodes[1]).not.toBe(p1.nodes[1])
  })

  it('mover um nó troca só o objeto dele', () => {
    const { modelo, arranjo } = prep('flowchart TD\nn1[Alfa]\nn2[Beta]')
    const p1 = projetar(modelo, arranjo)
    arranjo.gravar('n1', { x: 999, y: 999 })
    const p2 = projetar(modelo, arranjo)
    expect(p2.nodes[1]).toBe(p1.nodes[1]) // n2 reusado
    expect(p2.nodes[0]).not.toBe(p1.nodes[0]) // n1 mudou de posição
    expect(p2.nodes[0].position).toEqual({ x: 999, y: 999 })
  })

  it('edges = [] no R0', () => {
    const { modelo, arranjo } = prep('flowchart TD\nn1[a]')
    expect(projetar(modelo, arranjo).edges).toEqual([])
  })

  it('rótulo exibido de um nó sem rótulo é o próprio id', () => {
    const { modelo, arranjo } = prep('flowchart TD\nn1')
    expect(projetar(modelo, arranjo).nodes[0].data.rotulo).toBe('n1')
  })
})
