import { describe, it, expect } from 'vitest'
import { appendConexao, appendAgrupamento, inserirMencao, removerMencao } from '../../src/codec'
import type { Conexao, Agrupamento } from '../../src/modelo/modelo'

// Escrita cirúrgica byte-idêntica (T013 / SC-009): append de conexão e de bloco +
// menções, 0 realocações de linha preexistente.

const conexao = (over: Partial<Conexao>): Conexao => ({
  id: 'e1', origem: 'a', destino: 'b', texto: null, conectivo: '-->', alertas: [], ...over,
})
const agrupamento = (over: Partial<Agrupamento>): Agrupamento => ({
  id: 'sub1', titulo: 'Grupo 1', membros: [], alertas: [], ...over,
})

describe('append de conexão (T013 / SC-009)', () => {
  it('acrescenta a aresta no fim; o texto de cima é byte-idêntico', () => {
    const texto = 'flowchart TD\nn1[a]\nn2[b]'
    const r = appendConexao(texto, conexao({ origem: 'n1', destino: 'n2' }))
    expect(r).toBe('flowchart TD\nn1[a]\nn2[b]\nn1 --> n2')
    expect(r.startsWith(texto)).toBe(true)
  })
})

describe('append de bloco + menções (T013 / SC-009)', () => {
  it('agrupar é INSERÇÃO PURA: bloco novo com menções, 0 declarações realocadas', () => {
    const texto = 'flowchart TD\nn1[Alfa]\nn2[Beta]\nn3[Gama]'
    const r = appendAgrupamento(texto, agrupamento({ id: 'sub1', titulo: 'Grupo 1', membros: ['n1', 'n2'] }))
    // as declarações n1/n2/n3 permanecem no lugar; só nasce o bloco no fim
    expect(r).toBe('flowchart TD\nn1[Alfa]\nn2[Beta]\nn3[Gama]\nsubgraph sub1[Grupo 1]\n  n1\n  n2\nend')
    expect(r.startsWith(texto)).toBe(true)
  })

  it('bloco sem título → `subgraph id` e menções', () => {
    const r = appendAgrupamento('flowchart TD\nn1[a]', agrupamento({ id: 'sub2', titulo: null, membros: ['n1'] }))
    expect(r).toBe('flowchart TD\nn1[a]\nsubgraph sub2\n  n1\nend')
  })
})

describe('menção cirúrgica dentro do bloco (T013 / FR-016, SC-009)', () => {
  const doc = 'flowchart TD\nn1[a]\nn2[b]\nsubgraph sub1[G]\n  n1\nend'

  it('inserir menção: adiciona a linha antes do `end`; declaração intocada', () => {
    const r = inserirMencao(doc, 'sub1', 'n2')
    expect(r).toBe('flowchart TD\nn1[a]\nn2[b]\nsubgraph sub1[G]\n  n1\n  n2\nend')
  })

  it('inserir menção é idempotente: não duplica uma já presente', () => {
    expect(inserirMencao(doc, 'sub1', 'n1')).toBe(doc)
  })

  it('remover menção: tira só a linha da menção; a declaração fica', () => {
    const r = removerMencao(doc, 'sub1', 'n1')
    expect(r).toBe('flowchart TD\nn1[a]\nn2[b]\nsubgraph sub1[G]\nend')
  })

  it('pareamento por profundidade: insere no bloco certo (aninhado)', () => {
    const aninhado = 'flowchart TD\nsubgraph out\n  subgraph inn\n    n1\n  end\nend'
    const r = inserirMencao(aninhado, 'inn', 'n2')
    expect(r).toBe('flowchart TD\nsubgraph out\n  subgraph inn\n    n1\n  n2\n  end\nend')
  })
})
