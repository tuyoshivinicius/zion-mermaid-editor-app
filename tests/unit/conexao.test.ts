import { describe, it, expect } from 'vitest'
import { analisar, emitirConexao } from '../../src/codec'
import type { Conexao } from '../../src/modelo/modelo'

const conexoes = (t: string) => analisar(t).modelo.conexoes
const nos = (t: string) => analisar(t).modelo.nos.map((n) => n.id)
const c = (over: Partial<Conexao>): Conexao => ({
  id: 'e1', origem: 'a', destino: 'b', texto: null, conectivo: '-->', alertas: [], ...over,
})

describe('codec de conexão — reconhecedor (T010 / FR-001)', () => {
  it('`a --> b` → uma conexão dirigida + as duas pontas garantidas', () => {
    const cs = conexoes('flowchart TD\na --> b')
    expect(cs).toHaveLength(1)
    expect(cs[0]).toMatchObject({ origem: 'a', destino: 'b', texto: null, conectivo: '-->' })
    expect(nos('flowchart TD\na --> b')).toEqual(['a', 'b'])
  })

  it('arestas paralelas: o mesmo par duas vezes → DUAS conexões (não funde)', () => {
    const cs = conexoes('flowchart TD\na --> b\na --> b')
    expect(cs).toHaveLength(2)
    expect(cs.map((x) => `${x.origem}${x.destino}`)).toEqual(['ab', 'ab'])
  })

  it('laço: origem === destino é válido', () => {
    const cs = conexoes('flowchart TD\nb --> b')
    expect(cs).toHaveLength(1)
    expect(cs[0]).toMatchObject({ origem: 'b', destino: 'b' })
    expect(nos('flowchart TD\nb --> b')).toEqual(['b'])
  })

  it('preserva o lexema do conectivo (byte-fiel): -->, ==>, -.->, --x, --o, <-->', () => {
    for (const con of ['-->', '==>', '-.->', '--x', '--o', '<-->']) {
      expect(conexoes(`flowchart TD\na ${con} b`)[0].conectivo, con).toBe(con)
    }
  })

  it('rótulo de aresta `a -->|passo| b` → texto lido', () => {
    expect(conexoes('flowchart TD\na -->|passo| b')[0]).toMatchObject({ texto: 'passo', conectivo: '-->' })
  })

  it('rótulo no meio `a -- passo --> b` → texto lido, conectivo canônico', () => {
    expect(conexoes('flowchart TD\na -- passo --> b')[0]).toMatchObject({ texto: 'passo', conectivo: '-->' })
  })

  it('fan-out `a --> b & c` é ilegível por inteiro → 0 conexões, 0 nós', () => {
    expect(conexoes('flowchart TD\na --> b & c')).toEqual([])
    expect(nos('flowchart TD\na --> b & c')).toEqual([])
  })

  it('ponta com rótulo `n1[x] --> n2` é ilegível por inteiro → 0 conexões', () => {
    expect(conexoes('flowchart TD\nn1[x] --> n2')).toEqual([])
  })

  it('aresta incompleta `a -->` avisa (não derruba), materializa só a origem', () => {
    const r = analisar('flowchart TD\nn1[ok]\na -->')
    expect(r.modelo.nos.map((n) => n.id)).toEqual(['n1', 'a']) // n1 não some
    expect(r.modelo.conexoes).toEqual([])
    expect(r.avisos.length).toBeGreaterThan(0)
    expect(r.erros).toEqual([]) // aviso, não erro
  })
})

describe('codec de conexão — emissor (T010 / research §3/§9)', () => {
  it('sem texto → `origem conectivo destino`, conectivo preservado', () => {
    expect(emitirConexao(c({}))).toBe('a --> b')
    expect(emitirConexao(c({ conectivo: '==>' }))).toBe('a ==> b')
  })

  it('com texto simples → `origem -->|texto| destino` sem aspas', () => {
    expect(emitirConexao(c({ texto: 'passo' }))).toBe('a -->|passo| b')
  })

  it('texto com pipe → `#124;` (o pipe é delimitador)', () => {
    expect(emitirConexao(c({ texto: 'a | b' }))).toBe('a -->|"a #124; b"| b')
  })

  it('ponto fixo: analisar ∘ emitir preserva o conectivo lido', () => {
    for (const con of ['-->', '==>', '-.->', '--x']) {
      const lida = analisar(`flowchart TD\na ${con} b`).modelo.conexoes[0]
      expect(emitirConexao(lida)).toBe(`a ${con} b`)
    }
  })
})
