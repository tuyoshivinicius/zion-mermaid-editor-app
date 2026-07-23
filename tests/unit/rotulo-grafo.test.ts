import { describe, it, expect } from 'vitest'
import { analisar, emitirConexao } from '../../src/codec'
import { criarSessaoStore } from '../../src/modelo/store'
import type { Conexao } from '../../src/modelo/modelo'
import { ROTULOS_HOSTIS, MULTILINHA } from '../fixtures/rotulos-hostis'

const conexao = (texto: string | null): Conexao => ({
  id: 'e1', origem: 'a', destino: 'b', texto, conectivo: '-->', alertas: [], ...{},
})

// Texto de conexão + rótulo vazio + multi-linha (T026 / FR-006, FR-018).

describe('checker de expressividade sobre TEXTO DE CONEXÃO (T026 / FR-006)', () => {
  it('todo texto hostil volta byte a byte no texto da conexão, e a marca casa esperaMarcado', () => {
    for (const { texto, esperaMarcado } of ROTULOS_HOSTIS) {
      const linha = emitirConexao(conexao(texto))
      const c = analisar(`flowchart TD\n${linha}`).modelo.conexoes[0]
      expect(c.texto, `texto: ${JSON.stringify(texto)}`).toBe(texto) // byte a byte
      expect(c.alertas.length > 0, `marca de ${JSON.stringify(texto)}`).toBe(esperaMarcado)
    }
  })

  it('multi-linha na conexão: quebras viram <br/>, voltam byte a byte, 0 marca', () => {
    const c = analisar(`flowchart TD\n${emitirConexao(conexao(MULTILINHA))}`).modelo.conexoes[0]
    expect(c.texto).toBe(MULTILINHA)
    expect(c.alertas).toEqual([])
  })
})

describe('rótulo vazio no nó (T026 / FR-018)', () => {
  it('apagar todo o rótulo por gesto → caixa SEM rótulo; 0 repovoados, 0 id como rótulo', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 100, y: 100 }) // n1 = "Nó 1"
    store.getState().editarTexto('n1', '') // apaga tudo
    const n1 = store.getState().modelo.nos.find((n) => n.id === 'n1')!
    expect(n1.rotulo).toBe('') // vazio, NÃO null (não é "sem rótulo declarado")
    // a caixa exibe vazio — nunca o neutro "Nó 1", nunca o identificador "n1"
    const dados = store.getState().projecao.nodes.find((x) => x.id === 'n1')!.data as { rotulo: string }
    expect(dados.rotulo).toBe('')
    expect(dados.rotulo).not.toBe('n1')
    expect(dados.rotulo).not.toBe('Nó 1')
  })

  it('multi-linha colada num rótulo volta byte a byte (0 quebras colapsadas)', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 100, y: 100 })
    store.getState().editarTexto('n1', MULTILINHA)
    const n1 = store.getState().modelo.nos.find((n) => n.id === 'n1')!
    expect(n1.rotulo).toBe(MULTILINHA)
    expect(n1.alertas).toEqual([]) // lossless
  })
})

describe('rajada de edição = 1 ato (T029 / FR-007)', () => {
  it('digitar/colar em rajada no mesmo rótulo coalesce em UMA entrada de histórico', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 100, y: 100 }) // 1 entrada (criar)
    const antes = store.getState().historico.entradas.length
    store.getState().editarTexto('n1', 'I')
    store.getState().editarTexto('n1', 'In')
    store.getState().editarTexto('n1', 'Iní')
    store.getState().editarTexto('n1', 'Início')
    // 4 edições em rajada → +1 entrada só (coalesce por chave `editar-n1`)
    expect(store.getState().historico.entradas.length).toBe(antes + 1)
    expect(store.getState().modelo.nos.find((n) => n.id === 'n1')!.rotulo).toBe('Início')
  })
})
