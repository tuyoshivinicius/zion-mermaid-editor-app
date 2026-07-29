// O GERADOR DE CAMINHO DO TRAÇADO — uma função, dois consumidores.
//
// Quem PINTA (`Conexao.tsx`) e quem MEDE (`areatrabalho/extensao.ts`) chamam a
// mesma função. Não existe estado em que o desenho arqueia para fora e a medida não
// sabe — que é exatamente o defeito que o edge case "o que passa da caixa do nó"
// descreve (contracts/extensao-desenhada.md, Invariante 2).
//
// Quando laço e arestas paralelas ganharem desenho próprio, o gerador muda AQUI e a
// medida acompanha no mesmo commit, sem alterar o contrato.
//
// A curva é a cúbica de Bézier da engine, reproduzida ponto a ponto para que os
// PONTOS DE CONTROLE fiquem disponíveis a quem mede — `getBezierPath` devolve só o
// `d` do path. O teste `extensao` assere que o `d` daqui é byte-idêntico ao dela.

import { Position } from '@xyflow/react'
import { CAIXA_H, CAIXA_W } from '../projecao/projetar'
import type { Pos } from '../modelo/arranjo'

export interface Caminho {
  /** O `d` do `<path>` do SVG. */
  path: string
  /** Onde o rótulo da conexão é ancorado (centro visual da curva). */
  labelX: number
  labelY: number
  /** Os quatro pontos da cúbica: início, os dois de controle, e fim. */
  pontos: Pos[]
}

interface Extremos {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: Position
  targetPosition?: Position
  curvature?: number
}

function deslocamentoDeControle(distancia: number, curvatura: number): number {
  if (distancia >= 0) return 0.5 * distancia
  return curvatura * 25 * Math.sqrt(-distancia)
}

function controle(pos: Position, x1: number, y1: number, x2: number, y2: number, c: number): Pos {
  switch (pos) {
    case Position.Left:
      return { x: x1 - deslocamentoDeControle(x1 - x2, c), y: y1 }
    case Position.Right:
      return { x: x1 + deslocamentoDeControle(x2 - x1, c), y: y1 }
    case Position.Top:
      return { x: x1, y: y1 - deslocamentoDeControle(y1 - y2, c) }
    default:
      return { x: x1, y: y1 + deslocamentoDeControle(y2 - y1, c) }
  }
}

/** O caminho da conexão: o traçado que se pinta e os pontos que se medem. */
export function caminhoDaConexao({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  curvature = 0.25,
}: Extremos): Caminho {
  const co = controle(sourcePosition, sourceX, sourceY, targetX, targetY, curvature)
  const cd = controle(targetPosition, targetX, targetY, sourceX, sourceY, curvature)

  // t=0.5 da cúbica — o mesmo ponto que a engine usa para ancorar o rótulo
  const labelX = sourceX * 0.125 + co.x * 0.375 + cd.x * 0.375 + targetX * 0.125
  const labelY = sourceY * 0.125 + co.y * 0.375 + cd.y * 0.375 + targetY * 0.125

  return {
    path: `M${sourceX},${sourceY} C${co.x},${co.y} ${cd.x},${cd.y} ${targetX},${targetY}`,
    labelX,
    labelY,
    pontos: [{ x: sourceX, y: sourceY }, co, cd, { x: targetX, y: targetY }],
  }
}

// Onde a conexão nasce e onde ela chega, no PLANO. O `CaixaNo` declara os handles em
// `Position.Top` (destino) e `Position.Bottom` (origem); estas duas funções são a
// leitura geométrica daquela declaração, para que quem mede não precise do DOM.

/** A ponta de ORIGEM: o meio da borda de baixo da caixa. */
export function pontaDeOrigem(posicaoAbsoluta: Pos): Pos {
  return { x: posicaoAbsoluta.x + CAIXA_W / 2, y: posicaoAbsoluta.y + CAIXA_H }
}

/** A ponta de DESTINO: o meio da borda de cima da caixa. */
export function pontaDeDestino(posicaoAbsoluta: Pos): Pos {
  return { x: posicaoAbsoluta.x + CAIXA_W / 2, y: posicaoAbsoluta.y }
}
