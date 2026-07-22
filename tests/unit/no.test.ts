import { describe, it, expect } from 'vitest'
import { analisar, emitirNo } from '../../src/codec'
import type { No } from '../../src/modelo/modelo'

const nos = (texto: string) => analisar(texto).modelo.nos
const soIds = (texto: string) => nos(texto).map((n) => n.id)

describe('reconhecedor de nó retangular (T011 / FR-005)', () => {
  it('casa identificador sozinho `nN` (rótulo exibido = o id)', () => {
    const m = nos('flowchart TD\nn1')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ id: 'n1', rotulo: null })
  })

  it('casa `nN[…]` e `nN["…"]` (aspas delimitam)', () => {
    expect(nos('flowchart TD\nn1[Alfa]')[0]).toMatchObject({ id: 'n1', rotulo: 'Alfa' })
    expect(nos('flowchart TD\nn1["Nó, A"]')[0]).toMatchObject({ id: 'n1', rotulo: 'Nó, A' })
  })

  describe('guarda de ilegibilidade — sem materialização parcial (research §2a)', () => {
    it('linha com token de link → 0 nós', () => {
      expect(soIds('flowchart TD\na --> b')).toEqual([])
      expect(soIds('flowchart TD\nn1[Nó A] --> n2')).toEqual([]) // US2-12
    })
    it('outro delimitador de shape → 0 nós', () => {
      expect(soIds('flowchart TD\nn1(Nó A)')).toEqual([]) // US2-14
      expect(soIds('flowchart TD\nn3{losango}')).toEqual([])
      expect(soIds('flowchart TD\nn5>assimetrico]')).toEqual([])
    })
  })

  it('parcial tolerante: colchete aberto sem fecho vira rótulo parcial + alerta (FR-018)', () => {
    const m = nos('flowchart TD\nn1[Nó A')
    expect(m[0]).toMatchObject({ id: 'n1', rotulo: 'Nó A' }) // acompanha letra a letra, sem o colchete
    expect(m[0].alertas.some((a) => a.tipo === 'em-digitacao')).toBe(true)
  })

  it('identificador repetido → um nó só; última declaração de rótulo prevalece (FR-016)', () => {
    const m = nos('flowchart TD\nn1[A]\nn1[B]')
    expect(m).toHaveLength(1)
    expect(m[0].rotulo).toBe('B')
  })
})

describe('emissor de nó (T011 / research §3)', () => {
  const no = (id: string, rotulo: string | null): No => ({ id, rotulo, alertas: [] })

  it('nó sem rótulo → só o id', () => {
    expect(emitirNo(no('n1', null))).toBe('n1')
  })
  it('rótulo simples → sem aspas', () => {
    expect(emitirNo(no('n1', 'Nó 1'))).toBe('n1[Nó 1]')
  })
  it('rótulo com pontuação → aspas + escape', () => {
    expect(emitirNo(no('n1', 'Nó, A'))).toBe('n1["Nó, A"]')
  })
})
