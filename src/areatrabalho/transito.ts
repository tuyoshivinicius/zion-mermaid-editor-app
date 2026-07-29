// O TRÂNSITO até o destino (contracts/enquadramento.md §6, research §7).
//
// Ajustar à tela é o GESTO DE RECUPERAÇÃO — a pessoa o aciona justamente quando não
// sabe mais onde está. Saltar entrega o destino certo e destrói a única informação de
// que ela precisa: de onde ela veio. Interpolar `(x, y, zoom)` mantém a continuidade
// espacial, que é o que transforma "apareceu outro diagrama" em "a vista viajou até lá".
//
// Três propriedades, e as três são do contrato:
//   1. O DESTINO É O DO SALTO. O alvo é calculado ANTES de o trânsito começar, pela
//      mesma função pura que um salto usaria. O trânsito INTERPOLA; ele não decide.
//   2. INTERROMPE E ASSUME. Existe UM trânsito por vez; qualquer gesto novo cancela o
//      quadro pendente e comanda. 0 enfileiramentos, 0 ignorados (`SC-012`).
//   3. A ÂNCORA DO `FR-015` VALE A CADA QUADRO — daí o gancho `aQuadro`.
//
// Um quadro de trânsito é UM TRANSFORM CSS do painel: 0 reprojeções, 0 re-renders dos
// 400 nós, 0 recomputações de extensão. O trabalho novo por quadro é O(1).

import { DURACAO_TRANSITO } from './faixa'
import type { Enquadramento } from './tipos'

export interface PassosDoTransito {
  /** Aplica um quadro. Recebe também o anterior, para a re-ancoragem do `FR-015`. */
  aQuadro(atual: Enquadramento, anterior: Enquadramento): void
  /** Chamado uma vez, quando o destino é alcançado. Não roda se for interrompido. */
  aoFim?(): void
}

let pendente = 0

/** Suaviza a partida e a chegada sem mover o destino (ease-out cúbico). */
const suavizar = (t: number): number => 1 - (1 - t) ** 3

const interpolar = (de: Enquadramento, para: Enquadramento, t: number): Enquadramento => ({
  x: de.x + (para.x - de.x) * t,
  y: de.y + (para.y - de.y) * t,
  zoom: de.zoom + (para.zoom - de.zoom) * t,
})

/**
 * INTERROMPE E ASSUME: cancela o quadro pendente. Todo gesto de enquadramento chama
 * isto antes de comandar — nada enfileira, e nada é ignorado.
 */
export function cancelarTransito(): void {
  if (pendente !== 0) {
    cancelAnimationFrame(pendente)
    pendente = 0
  }
}

export function transitoEmCurso(): boolean {
  return pendente !== 0
}

/** Transita de `de` até `para` em `DURACAO_TRANSITO`. Um por vez. */
export function transitar(de: Enquadramento, para: Enquadramento, passos: PassosDoTransito): void {
  cancelarTransito()

  const inicio = performance.now()
  let anterior = de

  const quadro = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / DURACAO_TRANSITO)
    // no fim, o estado é EXATAMENTE o do salto — nunca um meio-termo arredondado
    const atual = t >= 1 ? para : interpolar(de, para, suavizar(t))
    passos.aQuadro(atual, anterior)
    anterior = atual
    if (t >= 1) {
      pendente = 0
      passos.aoFim?.()
      return
    }
    pendente = requestAnimationFrame(quadro)
  }

  pendente = requestAnimationFrame(quadro)
}
