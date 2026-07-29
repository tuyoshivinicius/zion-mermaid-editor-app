import { describe, it, expect, vi } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { projetar } from '../../src/projecao/projetar'
import { extensaoDesenhada } from '../../src/areatrabalho/extensao'
import { alvoAbertura, padraoDeclarado, pontoDeTela } from '../../src/areatrabalho/enquadramento'
import { TAMANHO_NATURAL } from '../../src/areatrabalho/faixa'
import { ORIGEM } from '../../src/modelo/arranjo'
import { CAIXA_H, CAIXA_W } from '../../src/projecao/projetar'
import type { Enquadramento, Piloto, Quadro } from '../../src/areatrabalho/tipos'

// A ABERTURA DERIVADA DO CONTEÚDO (T030 / FR-017 / SC-013 / research §10).
//
// O gatilho é de DISPARO ÚNICO: arma ao montar, dispara na primeira projeção com
// conteúdo e com o quadro já medido, e desarma. É isso que separa `FR-017` de
// `FR-007` — a abertura enquadra uma vez, porque ali não há enquadramento escolhido
// por ela a preservar; depois disso o produto não enquadra sozinho nunca mais.
//
// Aqui se exercita o MECANISMO (piloto + slot + alvos) sem navegador; a montagem
// real tem portão próprio em `us3-area-trabalho`.

const QUADRO: Quadro = { x: 0, y: 0, w: 1000, h: 700 }

/** Um piloto de mentira: registra o que foi aplicado, sem engine nenhuma. */
function pilotoFalso(quadro: Quadro = QUADRO) {
  const aplicados: { e: Enquadramento; comTransito: boolean }[] = []
  let corrente: Enquadramento = { x: 0, y: 0, zoom: 1 }
  const piloto: Piloto = {
    enquadramentoCorrente: () => corrente,
    aplicar: (e, comTransito) => {
      corrente = e
      aplicados.push({ e, comTransito })
    },
    quadro: () => quadro,
  }
  return { piloto, aplicados }
}

/**
 * O gatilho, na mesma forma que `AreaDeTrabalho` monta: dado o estado da sessão,
 * decide se aplica e se desarma.
 */
function abrir(store: ReturnType<typeof criarSessaoStore>, vazioJaAplicado: { feito: boolean }) {
  const s = store.getState()
  const { piloto, aberturaPendente } = s.areaDeTrabalho
  if (!aberturaPendente || !piloto) return
  const q = piloto.quadro()
  if (q.w === 0 || q.h === 0) return

  const ext = extensaoDesenhada(projetar(s.modelo, s.arranjo))
  if (!ext) {
    if (!vazioJaAplicado.feito) {
      vazioJaAplicado.feito = true
      piloto.aplicar(padraoDeclarado(q), false)
    }
    return
  }
  if (s.ultimaOrigem !== 'canvas') piloto.aplicar(alvoAbertura(ext, q), false)
  store.getState().desarmarAbertura()
}

const centroDe = (q: Quadro) => ({ x: q.x + q.w / 2, y: q.y + q.h / 2 })
const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 6)

describe('o gatilho arma, dispara uma vez e desarma (T030 / FR-017)', () => {
  it('COM CONTEÚDO: abre ajustada à tela — 100% dos elementos dentro, em 0 gestos', () => {
    const store = criarSessaoStore()
    const { piloto, aplicados } = pilotoFalso()
    store.getState().registrarPiloto(piloto)
    const vazio = { feito: false }

    // o conteúdo chega DEPOIS da montagem — documento inteiro colado no editor
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn1 --> n2\nn2 --> n3')
    abrir(store, vazio)

    expect(aplicados).toHaveLength(1)
    expect(store.getState().areaDeTrabalho.aberturaPendente).toBe(false)

    // e o alvo é o de ajustar à tela: 100% dentro do quadro
    const s = store.getState()
    const ext = extensaoDesenhada(projetar(s.modelo, s.arranjo))!
    const e = aplicados[0].e
    const a = pontoDeTela({ x: ext.x, y: ext.y }, e)
    const b = pontoDeTela({ x: ext.x + ext.w, y: ext.y + ext.h }, e)
    expect(a.x).toBeGreaterThanOrEqual(QUADRO.x)
    expect(a.y).toBeGreaterThanOrEqual(QUADRO.y)
    expect(b.x).toBeLessThanOrEqual(QUADRO.x + QUADRO.w)
    expect(b.y).toBeLessThanOrEqual(QUADRO.y + QUADRO.h)
  })

  it('VAZIO: vai ao padrão declarado, com 0 erros acusados (SC-013)', () => {
    const store = criarSessaoStore() // a semente é `flowchart TD` — 0 elementos
    const { piloto, aplicados } = pilotoFalso()
    store.getState().registrarPiloto(piloto)

    expect(() => abrir(store, { feito: false })).not.toThrow()

    expect(aplicados).toHaveLength(1)
    expect(aplicados[0].e.zoom).toBe(TAMANHO_NATURAL)
    // o ponto de NASCIMENTO do primeiro elemento no centro do quadro
    const nascimento = { x: ORIGEM.x + CAIXA_W / 2, y: ORIGEM.y + CAIXA_H / 2 }
    const naTela = pontoDeTela(nascimento, aplicados[0].e)
    perto(naTela.x, centroDe(QUADRO).x)
    perto(naTela.y, centroDe(QUADRO).y)
  })

  it('vazio NÃO desarma: o conteúdo do rascunho pode chegar um tique depois', () => {
    const store = criarSessaoStore()
    const { piloto, aplicados } = pilotoFalso()
    store.getState().registrarPiloto(piloto)
    const vazio = { feito: false }

    abrir(store, vazio) // ainda vazia
    expect(store.getState().areaDeTrabalho.aberturaPendente).toBe(true)

    store.getState().aplicarTexto('flowchart TD\nn1[Restaurado]')
    abrir(store, vazio)

    expect(store.getState().areaDeTrabalho.aberturaPendente).toBe(false)
    expect(aplicados).toHaveLength(2) // o padrão, depois o ajuste
  })

  it('espera o QUADRO ser medido — nunca ajusta contra um retângulo de zero', () => {
    const store = criarSessaoStore()
    const { piloto, aplicados } = pilotoFalso({ x: 0, y: 0, w: 0, h: 0 })
    store.getState().registrarPiloto(piloto)

    store.getState().aplicarTexto('flowchart TD\nn1[A]')
    abrir(store, { feito: false })

    expect(aplicados).toHaveLength(0)
    expect(store.getState().areaDeTrabalho.aberturaPendente).toBe(true) // continua armada
  })
})

describe('0 REAJUSTES quando o conteúdo muda depois (T030 / FR-007, SC-007)', () => {
  it('o gatilho já disparou: crescer, encolher e apagar não reenquadram', () => {
    const store = criarSessaoStore()
    const { piloto, aplicados } = pilotoFalso()
    store.getState().registrarPiloto(piloto)
    const vazio = { feito: false }

    store.getState().aplicarTexto('flowchart TD\nn1[A]')
    abrir(store, vazio)
    expect(aplicados).toHaveLength(1)

    for (const texto of [
      'flowchart TD\nn1[A]\nn2[B]',
      'flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn1 --> n3',
      'flowchart TD\nn1[A]',
      'flowchart TD',
    ]) {
      store.getState().aplicarTexto(texto)
      abrir(store, vazio)
    }

    expect(aplicados).toHaveLength(1) // 0 reajustes
  })

  it('o primeiro elemento criado POR GESTO desarma sem reenquadrar (é trabalho dela)', () => {
    const store = criarSessaoStore()
    const { piloto, aplicados } = pilotoFalso()
    store.getState().registrarPiloto(piloto)

    store.getState().criarNo({ x: 900, y: 640 }) // duplo clique num canto
    abrir(store, { feito: true })

    expect(aplicados).toHaveLength(0) // 0 reenquadramentos por conta própria
    expect(store.getState().areaDeTrabalho.aberturaPendente).toBe(false)
  })
})

describe('a abertura DERIVA, nunca RECUPERA (T030 / Princípio XI, ADR-010)', () => {
  it('0 recuperações da sessão anterior: nada é lido do armazém do navegador', () => {
    const leituras: string[] = []
    const espiao = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k: string) => {
      leituras.push(k)
      return null
    })
    try {
      const store = criarSessaoStore()
      const { piloto, aplicados } = pilotoFalso()
      store.getState().registrarPiloto(piloto)
      store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]')
      abrir(store, { feito: false })

      expect(aplicados).toHaveLength(1)
      expect(leituras).toEqual([]) // o enquadramento não veio de lugar nenhum: foi derivado
    } finally {
      espiao.mockRestore()
    }
  })

  it('a abertura não deixa entrada de histórico nem toca o código', () => {
    const store = criarSessaoStore()
    const { piloto } = pilotoFalso()
    store.getState().registrarPiloto(piloto)
    store.getState().aplicarTexto('flowchart TD\nn1[A]')

    const codigo = store.getState().textoEditor
    const entradas = store.getState().historico.entradas.length
    abrir(store, { feito: false })

    expect(store.getState().textoEditor).toBe(codigo)
    expect(store.getState().historico.entradas.length).toBe(entradas)
  })
})
