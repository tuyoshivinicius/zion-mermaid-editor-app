import { describe, it, expect, beforeEach } from 'vitest'
import { analisar } from '../../src/codec'
import { Arranjo, materializarPosicoes } from '../../src/modelo/arranjo'
import { projetar, limparCacheProjecao, type RFNode, type RFEdge } from '../../src/projecao/projetar'
import type { Modelo } from '../../src/modelo/modelo'

function prep(texto: string): { modelo: Modelo; arranjo: Arranjo } {
  const modelo = analisar(texto).modelo
  const arranjo = new Arranjo()
  materializarPosicoes(arranjo, modelo.nos.map((n) => n.id))
  return { modelo, arranjo }
}
const acharNode = (ns: RFNode[], id: string) => ns.find((n) => n.id === id)!
const acharEdge = (es: RFEdge[], id: string) => es.find((e) => e.id === id)!

// Reuso das TRÊS famílias de objeto (T014 / Princípio III, portão).
describe('projetar — reuso com 3 famílias (T014)', () => {
  beforeEach(() => limparCacheProjecao())

  const TEXTO = 'flowchart TD\nn1[Alfa]\nn2[Beta]\nn1 --> n2\nsubgraph sub1[Grupo]\n  n1\nend'

  it('muda 1 nó → só o objeto dele renova; aresta e agrupamento reusados', () => {
    const { modelo, arranjo } = prep(TEXTO)
    const p1 = projetar(modelo, arranjo)
    modelo.nos.find((n) => n.id === 'n2')!.rotulo = 'Beta editado'
    const p2 = projetar(modelo, arranjo)

    expect(acharNode(p2.nodes, 'n2')).not.toBe(acharNode(p1.nodes, 'n2'))
    expect(acharNode(p2.nodes, 'n1')).toBe(acharNode(p1.nodes, 'n1'))
    expect(acharEdge(p2.edges, p1.edges[0].id)).toBe(p1.edges[0])
    expect(acharNode(p2.nodes, 'sub1')).toBe(acharNode(p1.nodes, 'sub1'))
  })

  it('muda o texto de 1 aresta → só a aresta renova; nós e agrupamento reusados', () => {
    const { modelo, arranjo } = prep(TEXTO)
    const p1 = projetar(modelo, arranjo)
    modelo.conexoes[0].texto = 'passo'
    const p2 = projetar(modelo, arranjo)

    expect(acharEdge(p2.edges, p1.edges[0].id)).not.toBe(p1.edges[0])
    expect(acharNode(p2.nodes, 'n1')).toBe(acharNode(p1.nodes, 'n1'))
    expect(acharNode(p2.nodes, 'n2')).toBe(acharNode(p1.nodes, 'n2'))
    expect(acharNode(p2.nodes, 'sub1')).toBe(acharNode(p1.nodes, 'sub1'))
  })

  it('muda o título de 1 agrupamento → só o container renova', () => {
    const { modelo, arranjo } = prep(TEXTO)
    const p1 = projetar(modelo, arranjo)
    modelo.agrupamentos[0].titulo = 'Grupo editado'
    const p2 = projetar(modelo, arranjo)

    expect(acharNode(p2.nodes, 'sub1')).not.toBe(acharNode(p1.nodes, 'sub1'))
    expect(acharNode(p2.nodes, 'n1')).toBe(acharNode(p1.nodes, 'n1'))
    expect(acharEdge(p2.edges, p1.edges[0].id)).toBe(p1.edges[0])
  })

  it('membro projeta com parentId; a aresta referencia as pontas por id', () => {
    const { modelo, arranjo } = prep(TEXTO)
    const p = projetar(modelo, arranjo)
    expect(acharNode(p.nodes, 'n1').parentId).toBe('sub1')
    expect(acharNode(p.nodes, 'n2').parentId).toBeUndefined()
    expect(p.edges[0]).toMatchObject({ source: 'n1', target: 'n2' })
  })

  it('pai antes de filho: o container vem antes do seu membro no array', () => {
    const { modelo, arranjo } = prep(TEXTO)
    const { nodes } = projetar(modelo, arranjo)
    const iSub = nodes.findIndex((n) => n.id === 'sub1')
    const iN1 = nodes.findIndex((n) => n.id === 'n1')
    expect(iSub).toBeGreaterThanOrEqual(0)
    expect(iSub).toBeLessThan(iN1)
  })
})
