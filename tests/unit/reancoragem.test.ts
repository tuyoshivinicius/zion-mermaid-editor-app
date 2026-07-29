import { describe, it, expect } from 'vitest'
import {
  reancorarArrasto,
  zoomAncorado,
  pontoDoPlano,
  centroDoQuadro,
} from '../../src/areatrabalho/enquadramento'
import type { Enquadramento, Ponto, Quadro } from '../../src/areatrabalho/tipos'

// A RE-ANCORAGEM DO ARRASTO EM CURSO (T012 / FR-015 / SC-010 /
// contracts/enquadramento.md §7).
//
// O arrasto de nó calcula `posição = ponto_do_plano_sob_o_ponteiro − deslocamento
// _capturado`. Se o enquadramento muda SEM o ponteiro se mexer, o próximo
// movimento faz o elemento SALTAR pela diferença. A correção é O(1): recalcular o
// deslocamento capturado a partir do transform corrente, de modo que a posição do
// elemento NO PLANO fique invariante.
//
// O arrasto está preso ao ponto do PLANO, não ao ponto da tela.

const quadro: Quadro = { x: 0, y: 0, w: 800, h: 600 }
const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 9)

/** O que a engine faria no próximo movimento do ponteiro, com o transform dado. */
const posicaoQueAEngineDaria = (ponteiro: Ponto, e: Enquadramento, deslocamento: Ponto): Ponto => {
  const p = pontoDoPlano(ponteiro, e)
  return { x: p.x - deslocamento.x, y: p.y - deslocamento.y }
}

describe('reancorarArrasto — a posição NO PLANO fica invariante (T012 / FR-015)', () => {
  it('zoom por tecla (ancorado no centro) no meio de um arrasto: 0 saltos', () => {
    const anterior: Enquadramento = { x: -300, y: -150, zoom: 1 }
    const ponteiro = { x: 512, y: 377 }
    const posicaoDoNo = { x: 700, y: 400 }

    // o que o arrasto capturou ao começar
    const capturado = pontoDoPlano(ponteiro, anterior)
    const deslocamento = { x: capturado.x - posicaoDoNo.x, y: capturado.y - posicaoDoNo.y }

    // o enquadramento muda por baixo do arrasto — ancorado no CENTRO, não no ponteiro
    const atual = zoomAncorado(anterior, centroDoQuadro(quadro), 1.2)

    // SEM re-ancorar, a engine daria uma posição diferente: é o salto do US1-7
    const semCorrigir = posicaoQueAEngineDaria(ponteiro, atual, deslocamento)
    expect(semCorrigir.x).not.toBeCloseTo(posicaoDoNo.x, 6)

    // COM a re-ancoragem, a posição do elemento no plano é a mesma
    const corrigido = reancorarArrasto(
      deslocamento,
      pontoDoPlano(ponteiro, anterior),
      pontoDoPlano(ponteiro, atual),
    )
    const comCorrigir = posicaoQueAEngineDaria(ponteiro, atual, corrigido)
    perto(comCorrigir.x, posicaoDoNo.x)
    perto(comCorrigir.y, posicaoDoNo.y)
  })

  it('arrasto do enquadramento (translação pura) no meio de um arrasto de nó', () => {
    const anterior: Enquadramento = { x: 0, y: 0, zoom: 2 }
    const atual: Enquadramento = { x: -240, y: 130, zoom: 2 }
    const ponteiro = { x: 333, y: 111 }
    const posicaoDoNo = { x: 40, y: 20 }

    const capturado = pontoDoPlano(ponteiro, anterior)
    const deslocamento = { x: capturado.x - posicaoDoNo.x, y: capturado.y - posicaoDoNo.y }

    const corrigido = reancorarArrasto(
      deslocamento,
      pontoDoPlano(ponteiro, anterior),
      pontoDoPlano(ponteiro, atual),
    )
    const r = posicaoQueAEngineDaria(ponteiro, atual, corrigido)
    perto(r.x, posicaoDoNo.x)
    perto(r.y, posicaoDoNo.y)
  })

  it('vale para uma sequência de mudanças — a correção compõe', () => {
    let e: Enquadramento = { x: -10, y: -10, zoom: 0.8 }
    const ponteiro = { x: 421, y: 288 }
    const posicaoDoNo = { x: 123, y: 456 }
    const capturado = pontoDoPlano(ponteiro, e)
    let deslocamento = { x: capturado.x - posicaoDoNo.x, y: capturado.y - posicaoDoNo.y }

    for (const passo of [1.2, 1 / 1.2, 3, 0.4]) {
      const antes = pontoDoPlano(ponteiro, e)
      e = zoomAncorado(e, centroDoQuadro(quadro), passo)
      deslocamento = reancorarArrasto(deslocamento, antes, pontoDoPlano(ponteiro, e))
    }

    const r = posicaoQueAEngineDaria(ponteiro, e, deslocamento)
    perto(r.x, posicaoDoNo.x)
    perto(r.y, posicaoDoNo.y)
  })
})

describe('zoom ancorado no ponteiro: a correção é ZERO por construção (T012 / FR-002)', () => {
  it('o ponto do plano sob o ponteiro não mudou, então nada a corrigir', () => {
    const anterior: Enquadramento = { x: -300, y: -150, zoom: 1.7 }
    const ponteiro = { x: 512, y: 377 }
    const atual = zoomAncorado(anterior, ponteiro, 1.2) // roda/pinça: âncora = ponteiro

    const deslocamento = { x: 88, y: -19 }
    const corrigido = reancorarArrasto(
      deslocamento,
      pontoDoPlano(ponteiro, anterior),
      pontoDoPlano(ponteiro, atual),
    )
    perto(corrigido.x, deslocamento.x)
    perto(corrigido.y, deslocamento.y)
  })

  it('é a asserção natural: roda não precisa de correção, tecla precisa', () => {
    const e: Enquadramento = { x: 0, y: 0, zoom: 1 }
    const ponteiro = { x: 100, y: 100 }
    const d = { x: 5, y: 5 }

    const porRoda = reancorarArrasto(d, pontoDoPlano(ponteiro, e), pontoDoPlano(ponteiro, zoomAncorado(e, ponteiro, 2)))
    expect(porRoda).toEqual(d)

    const porTecla = reancorarArrasto(d, pontoDoPlano(ponteiro, e), pontoDoPlano(ponteiro, zoomAncorado(e, centroDoQuadro(quadro), 2)))
    expect(porTecla).not.toEqual(d)
  })
})

describe('a re-ancoragem é O(1) e pura (T012 / contracts/enquadramento.md §7)', () => {
  it('duas subtrações — não devolve nem lê posição de elemento', () => {
    const r = reancorarArrasto({ x: 10, y: 20 }, { x: 100, y: 200 }, { x: 130, y: 260 })
    expect(r).toEqual({ x: 40, y: 80 })
  })

  it('não muta a entrada', () => {
    const d = { x: 1, y: 2 }
    reancorarArrasto(d, { x: 0, y: 0 }, { x: 9, y: 9 })
    expect(d).toEqual({ x: 1, y: 2 })
  })
})
