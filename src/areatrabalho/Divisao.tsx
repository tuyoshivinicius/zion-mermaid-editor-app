// A DIVISÃO entre o editor de código e a área do diagrama (FR-006).
//
// O gesto NÃO passa pelo React: durante o arrasto, a razão é escrita direto na
// variável CSS `--razao-editor` por `ref` — 0 estado React no meio, 0 re-renders dos
// 400 nós (`FR-016`, `SC-003`). Só ao SOLTAR ela é comitada no slot de sessão. É o
// mesmo padrão que o R1 já usa para o arrasto de nó: só o gesto concluído vira
// comando.
//
// O que se comita é a razão QUE ELA ESCOLHEU. O recorte por janela estreita é do
// CSS (`max-width`), na renderização — guardar a razão já recortada faria a janela
// reescrever a escolha dela (contracts/proporcao.md §3).

import { useCallback, useRef } from 'react'
import { MIN_DIAGRAMA, MIN_EDITOR, PROPORCAO_PADRAO } from './faixa'

/**
 * A razão do editor a partir da posição do ponteiro dentro da área de trabalho.
 * SATURA nos mínimos declarados de cada vista: nenhuma das duas é reduzida a nada, e
 * não há prioridade entre elas — nenhuma cede primeiro (`FR-006`, `SC-007`).
 */
export function razaoSaturada(xNaAreaDeTrabalho: number, larguraTotal: number): number {
  if (larguraTotal <= 0) return PROPORCAO_PADRAO // sem largura não há razão a apurar
  const pedido = larguraTotal - xNaAreaDeTrabalho
  const teto = Math.max(MIN_EDITOR, larguraTotal - MIN_DIAGRAMA)
  return Math.min(Math.max(pedido, MIN_EDITOR), teto) / larguraTotal
}

interface Props {
  /** A área de trabalho, de onde saem a largura e a variável CSS do gesto. */
  refAreaDeTrabalho: React.RefObject<HTMLElement>
  /** Comita a razão ao SOLTAR — nunca durante o gesto. */
  aoSoltar(razao: number): void
}

export function Divisao({ refAreaDeTrabalho, aoSoltar }: Props) {
  const arrastando = useRef(false)
  const ultima = useRef(0)

  const aoDescer = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const raiz = refAreaDeTrabalho.current
      if (!raiz) return
      ev.preventDefault()
      ev.currentTarget.setPointerCapture(ev.pointerId)
      arrastando.current = true
      ultima.current = razaoSaturada(ev.clientX - raiz.getBoundingClientRect().x, raiz.clientWidth)
    },
    [refAreaDeTrabalho],
  )

  const aoMover = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const raiz = refAreaDeTrabalho.current
      if (!arrastando.current || !raiz) return
      const r = razaoSaturada(ev.clientX - raiz.getBoundingClientRect().x, raiz.clientWidth)
      ultima.current = r
      // por `ref`, direto no estilo: nenhum re-render acontece por causa deste quadro
      raiz.style.setProperty('--razao-editor', `${(r * 100).toFixed(4)}%`)
    },
    [refAreaDeTrabalho],
  )

  const aoSubir = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!arrastando.current) return
      arrastando.current = false
      ev.currentTarget.releasePointerCapture(ev.pointerId)
      aoSoltar(ultima.current) // só o gesto CONCLUÍDO vira comando
    },
    [aoSoltar],
  )

  return (
    <div
      data-testid="divisao"
      role="separator"
      aria-orientation="vertical"
      aria-label="Proporção entre a área do diagrama e o editor de código"
      onPointerDown={aoDescer}
      onPointerMove={aoMover}
      onPointerUp={aoSubir}
      onPointerCancel={aoSubir}
      className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-muted-foreground/40"
    />
  )
}
