import { describe, it, expect } from 'vitest'
import { analisar } from '../../src/codec'

describe('analisar (T013 / contracts/codec.md)', () => {
  it('NUNCA devolve vazio: sempre um modelo + duas listas de severidade', () => {
    const r = analisar('')
    expect(r.modelo).toBeDefined()
    expect(Array.isArray(r.erros)).toBe(true)
    expect(Array.isArray(r.avisos)).toBe(true)
    expect(r.modelo.nos).toEqual([])
  })

  it('duas listas: statement fora do vocabulário vira erro, sem derrubar o resto', () => {
    // R1: `a --> b` já é conexão legível; o fan-out `a --> b & c` continua ilegível.
    const r = analisar('flowchart TD\nn1[ok]\na --> b & c\nn2[ok2]')
    expect(r.modelo.nos.map((n) => n.id)).toEqual(['n1', 'n2'])
    expect(r.erros.length).toBeGreaterThan(0)
  })

  it('rótulo sem fecho vira aviso (estado de digitação), não erro', () => {
    const r = analisar('flowchart TD\nn1[Nó ')
    expect(r.avisos.length).toBeGreaterThan(0)
    expect(r.modelo.nos).toHaveLength(1)
  })

  describe('reconhecedor de cabeçalho — as cinco declarações, conjunto FECHADO', () => {
    it('descarta as cinco em QUALQUER posição (nunca vira nó)', () => {
      for (const decl of [
        'flowchart',
        'flowchart TD',
        'graph LR',
        'stateDiagram',
        'stateDiagram-v2',
        'classDiagram',
        'sequenceDiagram',
        'erDiagram',
      ]) {
        const r = analisar(`flowchart TD\nn1[a]\n${decl}\nn2[b]`)
        expect(r.modelo.nos.map((n) => n.id)).toEqual(['n1', 'n2']) // a declaração no meio não virou nó
      }
    })

    it('`pie`/`gantt` NÃO são reconhecidos → caem na regra comum e viram nó', () => {
      const r = analisar('flowchart TD\npie\ngantt')
      expect(r.modelo.nos.map((n) => n.id)).toEqual(['pie', 'gantt'])
    })
  })

  it('preâmbulo preservado: frontmatter, diretiva e comentário sobrevivem', () => {
    const texto = ['---', 'title: X', '---', '%%{init: {"t":1}}%%', 'flowchart TD', '%% nota', 'n1[a]'].join('\n')
    const r = analisar(texto)
    expect(r.modelo.preservado.frontmatter).toContain('title: X')
    expect(r.modelo.preservado.diretivas).toHaveLength(1)
    expect(r.modelo.preservado.comentarios).toContain('%% nota')
    expect(r.modelo.nos.map((n) => n.id)).toEqual(['n1'])
  })
})
