import { describe, it, expect } from 'vitest'
import { analisar } from '../../src/codec'
import { conexoesDerivadas, normalizar, selecaoVazia, type Selecao } from '../../src/modelo/selecao'

const sel = (over: Partial<Selecao>): Selecao => ({ ...selecaoVazia(), ...over })

// Seleção de sessão (T034 / FR-008, SC-006).
describe('conexão derivada (T034 / FR-008)', () => {
  it('entra quando AS DUAS pontas entram; não quando só uma', () => {
    const m = analisar('flowchart TD\na --> b\nb --> c').modelo
    expect(conexoesDerivadas(m, new Set(['a', 'b']))).toHaveLength(1) // a-->b
    expect(conexoesDerivadas(m, new Set(['a', 'c']))).toHaveLength(0) // nenhuma com as duas pontas
    expect(conexoesDerivadas(m, new Set(['a', 'b', 'c']))).toHaveLength(2)
  })
})

describe('normalização: fecho transitivo + dedup (T034 / SC-006)', () => {
  it('um agrupamento arrasta os seus membros (recursivo), cada elemento 1×', () => {
    const m = analisar('flowchart TD\nsubgraph out\n  subgraph inn\n    n1\n    n2\n  end\nend').modelo
    const r = normalizar(m, sel({ agrupamentos: new Set(['out']) }))
    expect(r.agrupamentos.sort()).toEqual(['inn', 'out'])
    expect(r.nos.sort()).toEqual(['n1', 'n2'])
  })

  it('agrupamento E membros na seleção → cada elemento exatamente 1× (0 em dobro)', () => {
    const m = analisar('flowchart TD\nsubgraph g\n  n1\n  n2\nend').modelo
    const r = normalizar(m, sel({ agrupamentos: new Set(['g']), nos: new Set(['n1', 'n2']) }))
    expect(r.nos.sort()).toEqual(['n1', 'n2']) // n1/n2 uma vez só, mesmo estando em dobro na seleção
    expect(r.agrupamentos).toEqual(['g'])
  })

  it('as conexões afetadas são derivadas do conjunto FINAL de nós', () => {
    const m = analisar('flowchart TD\nsubgraph g\n  n1\n  n2\nend\nn1 --> n2').modelo
    const r = normalizar(m, sel({ agrupamentos: new Set(['g']) }))
    expect(r.conexoes).toHaveLength(1) // n1-->n2: as duas pontas entraram via o grupo
  })
})
