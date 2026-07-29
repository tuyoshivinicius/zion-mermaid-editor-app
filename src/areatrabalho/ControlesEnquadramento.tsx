// A BARRA DE ENQUADRAMENTO (FR-001, FR-018) — canto inferior direito da área do
// diagrama, flutuando: afastar · NN % · aproximar · alternância do modo hand.
//
// Ela paga em código o preço que a spec declarou: a faixa que cobre SAI da área
// visível (`FR-011`). Por isso REGISTRA a própria oclusão ao montar e cancela ao
// desmontar — o quadro desconta o que foi declarado, nunca o que foi presumido.
// A spec prefere descontar a sobreposição a proibi-la (research §6).
//
// O indicador `NN %` é coalescido em rAF: o nível é observável por quadro sem que
// um único dos 400 nós re-renderize (`FR-016`).

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStoreApi } from '@xyflow/react'
import { registrarOclusao } from './areaVisivel'
import { PASSO_ZOOM } from './faixa'
import type { Navegacao } from './useNavegacao'

const ID_OCLUSAO = 'barra-enquadramento'

/** O nível corrente em %, atualizado por quadro e coalescido em rAF (`FR-001`). */
function useNivel(): number {
  const store = useStoreApi()
  const [nivel, setNivel] = useState(() => Math.round(store.getState().transform[2] * 100))

  useEffect(() => {
    let pendente = 0
    const publicar = () => {
      pendente = 0
      setNivel(Math.round(store.getState().transform[2] * 100))
    }
    const cancelar = store.subscribe(() => {
      if (pendente === 0) pendente = requestAnimationFrame(publicar)
    })
    return () => {
      cancelar()
      if (pendente !== 0) cancelAnimationFrame(pendente)
    }
  }, [store])

  return nivel
}

// Os ícones são SVG EMBUTIDO, não glifo de fonte: `⛶` e `✋` caem em tofu onde a
// fonte do sistema não os tem, e um controle que a pessoa não consegue identificar
// não é um controle alcançável (`FR-018`). Embutido também é o único jeito que
// respeita o Princípio XIII — 0 requisições de rede em runtime, nem para uma fonte.

const Icone = ({ children }: { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

/** Ajustar à tela: os quatro cantos apontando para fora. */
const IconeAjustar = () => (
  <Icone>
    <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
  </Icone>
)

/** Modo hand: a mão que declara que o arrasto move a vista, não o conteúdo. */
const IconeHand = () => (
  <Icone>
    <path d="M5 8V3.5a1.25 1.25 0 0 1 2.5 0V7m0-.5V3a1.25 1.25 0 0 1 2.5 0v4m0-.5V4.25a1.25 1.25 0 0 1 2.5 0V9.5a4.5 4.5 0 0 1-4.5 4.5H7.5a4 4 0 0 1-3.2-1.6L2.6 10.1a1.2 1.2 0 0 1 1.9-1.45L5 9.5" />
  </Icone>
)

interface Props {
  nav: Navegacao
  handAtivo: boolean
}

export function ControlesEnquadramento({ nav, handAtivo }: Props) {
  const nivel = useNivel()
  const ref = useRef<HTMLDivElement>(null)

  // A oclusão declarada é a FAIXA que a barra cobre, medida da borda inferior da
  // área do diagrama até o topo da barra — não a altura dela sozinha.
  //
  // Observada, e não amostrada uma vez: no primeiro quadro o `clientHeight` do pai
  // ainda pode ser 0, e uma medida de mount perdida faria o quadro deixar de
  // descontar a barra — `FR-008` e `FR-011` passariam a medir contra um retângulo
  // que a barra tapa, que é exatamente o erro que o registro existe para impedir.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelar: (() => void) | null = null

    const declarar = () => {
      const pai = el.offsetParent as HTMLElement | null
      if (!pai || pai.clientHeight === 0) return
      cancelar?.()
      cancelar = registrarOclusao({
        id: ID_OCLUSAO,
        borda: 'baixo',
        espessura: Math.max(0, pai.clientHeight - el.offsetTop),
      })
    }

    declarar()
    const observador = new ResizeObserver(declarar)
    observador.observe(el)
    if (el.offsetParent) observador.observe(el.offsetParent)
    return () => {
      observador.disconnect()
      cancelar?.()
    }
  }, [])

  const Botao = ({
    tid,
    rotulo,
    onClick,
    ativo,
    children,
  }: {
    tid: string
    rotulo: string
    onClick: () => void
    ativo?: boolean
    children: React.ReactNode
  }) => (
    <button
      type="button"
      data-testid={tid}
      aria-label={rotulo}
      aria-pressed={ativo}
      title={rotulo}
      onClick={onClick}
      className={
        'flex h-6 w-6 items-center justify-center rounded text-xs leading-none text-foreground hover:bg-muted ' +
        (ativo ? 'bg-muted ring-1 ring-border' : '')
      }
    >
      {children}
    </button>
  )

  return (
    <div
      ref={ref}
      data-testid="controles-enquadramento"
      className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded border border-border bg-background p-1 shadow-sm"
    >
      <Botao tid="btn-afastar" rotulo="Afastar o zoom" onClick={() => nav.passoDeZoom(1 / PASSO_ZOOM)}>
        −
      </Botao>
      {/*
        O indicador É o botão de resetar: mata dois requisitos com um controle — o
        nível fica legível (`FR-001`) e voltar ao tamanho natural é UM gesto
        (`FR-009`). O caminho sem ponteiro existe em paralelo (`Shift + 0`), então
        ninguém fica preso ao ponteiro (research §6).
      */}
      <button
        type="button"
        data-testid="nivel-zoom"
        data-nivel={nivel}
        aria-label="Resetar o zoom ao tamanho natural"
        title="Resetar o zoom ao tamanho natural"
        onClick={nav.resetarZoom}
        className="min-w-[3.5rem] rounded text-center text-xs tabular-nums text-muted-foreground hover:bg-muted"
      >
        {nivel} %
      </button>
      <Botao tid="btn-aproximar" rotulo="Aproximar o zoom" onClick={() => nav.passoDeZoom(PASSO_ZOOM)}>
        +
      </Botao>
      <Botao tid="btn-ajustar" rotulo="Ajustar o diagrama à tela" onClick={nav.ajustarATela}>
        <IconeAjustar />
      </Botao>
      <Botao
        tid="btn-modo-hand"
        rotulo="Arrastar a área visível"
        ativo={handAtivo}
        onClick={nav.alternarHand}
      >
        <IconeHand />
      </Botao>
    </div>
  )
}
