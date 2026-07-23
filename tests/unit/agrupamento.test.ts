import { describe, it, expect } from 'vitest'
import { analisar, emitirAgrupamentoAbre, emitirAgrupamentoFecha } from '../../src/codec'
import type { Agrupamento } from '../../src/modelo/modelo'

const modelo = (t: string) => analisar(t).modelo
const grupo = (over: Partial<Agrupamento>): Agrupamento => ({
  id: 'sub1', titulo: null, membros: [], alertas: [], ...over,
})

describe('codec de agrupamento — reconhecedor (T011 / FR-002, FR-019)', () => {
  it('M1: membro por menção isolada dentro do bloco', () => {
    const m = modelo('flowchart TD\nsubgraph sub1[Grupo]\n  n1\n  n2\nend')
    expect(m.agrupamentos).toHaveLength(1)
    expect(m.agrupamentos[0]).toMatchObject({ id: 'sub1', titulo: 'Grupo', membros: ['n1', 'n2'] })
    expect(m.nos.map((n) => n.id)).toEqual(['n1', 'n2'])
  })

  it('M2: aresta escrita DENTRO do bloco agrupa as duas pontas', () => {
    const m = modelo('flowchart TD\nsubgraph sub1\n  x --> y\nend')
    expect(m.agrupamentos[0].membros.sort()).toEqual(['x', 'y'])
    expect(m.conexoes).toHaveLength(1)
  })

  it('M3: aninhar por menção do id de um agrupamento (0 nó-fantasma)', () => {
    const m = modelo('flowchart TD\nsubgraph subOuter\n  subInner\nend\nsubgraph subInner[Dentro]\n  n1\nend')
    const outer = m.agrupamentos.find((g) => g.id === 'subOuter')!
    const inner = m.agrupamentos.find((g) => g.id === 'subInner')!
    expect(outer.membros).toEqual(['subInner'])
    expect(inner.membros).toEqual(['n1'])
    expect(m.nos.map((n) => n.id)).toEqual(['n1']) // subInner NÃO virou nó
  })

  it('M3 (léxico): bloco dentro de bloco → o interno é membro do externo', () => {
    const m = modelo('flowchart TD\nsubgraph subOuter[Fora]\n  subgraph subInner[Dentro]\n    n1\n  end\nend')
    expect(m.agrupamentos.find((g) => g.id === 'subOuter')!.membros).toEqual(['subInner'])
    expect(m.agrupamentos.find((g) => g.id === 'subInner')!.membros).toEqual(['n1'])
  })

  it('M4: mesmo id em dois blocos → o PRIMEIRO vence; o perdedor fica com 0 membros', () => {
    const m = modelo('flowchart TD\nn1[Alfa]\nsubgraph subA[A]\n  n1\nend\nsubgraph subB[B]\n  n1\nend')
    expect(m.agrupamentos.find((g) => g.id === 'subA')!.membros).toEqual(['n1'])
    expect(m.agrupamentos.find((g) => g.id === 'subB')!.membros).toEqual([]) // não rouba o membro
  })

  it('M5: bloco vazio escrito à mão existe e é exibido (0 membros)', () => {
    const m = modelo('flowchart TD\nn1[Solto]\nsubgraph sub1[Vazio]\nend')
    expect(m.agrupamentos).toHaveLength(1)
    expect(m.agrupamentos[0]).toMatchObject({ id: 'sub1', titulo: 'Vazio', membros: [] })
  })

  it('tolerância: `subgraph` sem `end` mantém o bloco aberto e avisa (Princípio IX)', () => {
    const r = analisar('flowchart TD\nsubgraph sub1[G]\n  n1')
    expect(r.modelo.agrupamentos[0].membros).toEqual(['n1']) // membro já lido não some
    expect(r.avisos.length).toBeGreaterThan(0)
  })

  it('`subgraph id` sem título → titulo null', () => {
    expect(modelo('flowchart TD\nsubgraph sub1\nend').agrupamentos[0].titulo).toBeNull()
  })
})

describe('codec de agrupamento — emissor (T011)', () => {
  it('abre: com título simples → `subgraph id[Título]`; sem → `subgraph id`', () => {
    expect(emitirAgrupamentoAbre(grupo({ titulo: 'Grupo' }))).toBe('subgraph sub1[Grupo]')
    expect(emitirAgrupamentoAbre(grupo({ titulo: null }))).toBe('subgraph sub1')
  })

  it('abre: título com pontuação → aspas + escape', () => {
    expect(emitirAgrupamentoAbre(grupo({ titulo: 'A, B' }))).toBe('subgraph sub1["A, B"]')
  })

  it('fecha: sempre `end`', () => {
    expect(emitirAgrupamentoFecha()).toBe('end')
  })
})
