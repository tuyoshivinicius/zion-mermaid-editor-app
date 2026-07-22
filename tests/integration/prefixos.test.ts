import { describe, it, expect } from 'vitest'
import { analisar, serializar, normalizar } from '../../src/codec'
import { todosOsDocumentos, documentosNoVocabulario } from '../fixtures/corpus'

// Documentos append-order sem edição posterior de linha (o cenário de digitação
// monotônica em que "0 perdas" é literal).
const APPEND_ORDER = ['02-cabecalho-apagado.mmd', '04-nos.mmd', '05-identificador-sozinho.mmd', '06-rotulos-hostis.mmd']

describe('prefixos (T027 / SC-002 / Princípio IX)', () => {
  it('análise NUNCA vazia: todo prefixo de todo documento devolve um modelo (nunca quebra)', () => {
    let total = 0
    for (const { texto } of todosOsDocumentos()) {
      for (let k = 0; k <= texto.length; k++) {
        const r = analisar(texto.slice(0, k))
        expect(r.modelo).toBeDefined()
        expect(Array.isArray(r.erros)).toBe(true)
        expect(Array.isArray(r.avisos)).toBe(true)
        total++
      }
    }
    expect(total).toBeGreaterThanOrEqual(757) // a barra medida no ADR-006
  })

  it('0 perdas: um nó com a linha completa no prefixo não some depois (digitação monotônica)', () => {
    for (const nome of APPEND_ORDER) {
      const texto = todosOsDocumentos().find((d) => d.nome === nome)!.texto
      const linhas = texto.split('\n')
      let offset = 0
      for (const linha of linhas) {
        offset += linha.length + 1 // +1 do \n
        const idsDaLinha = analisar(linha).modelo.nos.map((n) => n.id)
        if (idsDaLinha.length === 0) continue
        // de `offset` em diante, esses ids nunca podem sumir
        for (let k = offset; k <= texto.length; k++) {
          const presentes = new Set(analisar(texto.slice(0, k)).modelo.nos.map((n) => n.id))
          for (const id of idsDaLinha) {
            expect(presentes.has(id), `${nome}: id ${id} sumiu no prefixo ${k}`).toBe(true)
          }
        }
      }
    }
  })

  it('o braço TOLERANTE não perde onde o ESTRITO perde', () => {
    let ganhosTolerante = 0
    for (const { texto } of todosOsDocumentos()) {
      for (let k = 0; k <= texto.length; k++) {
        const p = texto.slice(0, k)
        const t = analisar(p, { tolerante: true }).modelo.nos.length
        const e = analisar(p, { tolerante: false }).modelo.nos.length
        expect(t).toBeGreaterThanOrEqual(e) // tolerante nunca perde a mais
        ganhosTolerante += t - e
      }
    }
    expect(ganhosTolerante).toBeGreaterThan(0) // e em algum prefixo o estrito regride
  })

  it('ponto fixo sobre o corpus no vocabulário', () => {
    for (const { nome, texto } of documentosNoVocabulario()) {
      const m1 = analisar(texto).modelo
      const m2 = analisar(serializar(m1)).modelo
      expect(normalizar(m2), nome).toEqual(normalizar(m1))
    }
  })
})
