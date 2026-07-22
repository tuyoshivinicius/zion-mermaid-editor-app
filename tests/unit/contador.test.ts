import { describe, it, expect } from 'vitest'
import { Contador } from '../../src/modelo/contador'

describe('Contador de sessão (T020 / FR-016 / research §8)', () => {
  it('monotônico: emite n1, n2, n3 com rótulo Nó N', () => {
    const c = new Contador()
    expect(c.emitir(new Set())).toEqual({ id: 'n1', rotulo: 'Nó 1' })
    expect(c.emitir(new Set())).toEqual({ id: 'n2', rotulo: 'Nó 2' })
    expect(c.emitir(new Set())).toEqual({ id: 'n3', rotulo: 'Nó 3' })
  })

  it('nunca reusa id emitido, nem depois da linha apagada', () => {
    const c = new Contador()
    c.emitir(new Set()) // n1
    c.emitir(new Set()) // n2
    // a linha de n2 é apagada (o texto agora só tem n1) — o contador NÃO recua
    c.observar(new Set(['n1']))
    expect(c.emitir(new Set(['n1']))).toEqual({ id: 'n3', rotulo: 'Nó 3' })
  })

  it('avança até valor livre quando o próximo já está ocupado no texto', () => {
    const c = new Contador()
    // a pessoa já escreveu n1 e n2 no editor
    c.observar(new Set(['n1', 'n2']))
    expect(c.emitir(new Set(['n1', 'n2']))).toEqual({ id: 'n3', rotulo: 'Nó 3' })
  })

  it('pula um valor ocupado no meio da sequência', () => {
    const c = new Contador()
    expect(c.emitir(new Set(['n2'])).id).toBe('n1')
    // próximo seria n2, mas está ocupado → salta para n3
    expect(c.emitir(new Set(['n2'])).id).toBe('n3')
  })
})
