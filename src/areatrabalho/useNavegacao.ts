// AS AFORDÂNCIAS da navegação (contracts/enquadramento.md §5, research §6).
//
// Este hook é a única casa das teclas, do modo hand e da conversa com a engine. As
// contas continuam nas funções puras de `enquadramento.ts`/`areaVisivel.ts`: aqui só
// se APLICA o que elas calculam.
//
// Guarda ÚNICA para todo o teclado: nenhum atalho dispara com o foco em `input`,
// `textarea` ou `contenteditable` — a mesma guarda que o `Canvas` do R1 já usa para
// `Delete`. Letras ficam livres: o alfabeto do repertório de edição é de
// `ciclo-por-teclado` (ADR-005).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReactFlow, useStoreApi } from '@xyflow/react'
import { useSessao } from '../modelo/store'
import { PASSO_ZOOM, TETO_ZOOM } from './faixa'
import {
  alvoAjustar,
  alvoResetar,
  centroDoQuadro,
  pisoCorrente,
  pontoDoPlano,
  preservarCentro,
  reancorarArrasto,
  zoomAncorado,
} from './enquadramento'
import { extensaoDesenhada } from './extensao'
import { cancelarTransito, transitar } from './transito'
import { oclusoesRegistradas, quadroVisivel } from './areaVisivel'
import { deRetanguloDOM, type Enquadramento, type Ponto, type Quadro } from './tipos'

/** O foco está num lugar em que as teclas são de quem digita, não da navegação. */
function focoEmTexto(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true
}

export interface Navegacao {
  /** O modo hand está ativo agora (persistente ou temporário)? Decide `panOnDrag`. */
  handAtivo: boolean
  /** O piso corrente da engine — `min(PISO_ZOOM, zoomCorrente)`, recalculado ao FIM do gesto. */
  minZoom: number
  maxZoom: number
  /** A área visível AGORA: área do diagrama ∩ janela − sobreposições (`FR-011`). */
  quadro(): Quadro
  /** Aplica um enquadramento; `comTransito` interpola até ele (`FR-008`). */
  aplicar(e: Enquadramento, comTransito?: boolean): void
  /** Zoom por controle/atalho: ancorado no CENTRO do quadro (`FR-002`). */
  passoDeZoom(fator: number): void
  /** FR-008 — o diagrama inteiro de volta à área visível, centralizado. */
  ajustarATela(): void
  /** FR-009 — a escala de volta ao natural, SEM recentrar. */
  resetarZoom(): void
  alternarHand(): void
  /** Reconciliação do enquadramento ao FIM do gesto contínuo. */
  aoFimDoGesto(): void
  /** Registra o ponteiro (para a re-ancoragem do `FR-015`) e o arrasto em curso. */
  anotarPonteiro(p: Ponto): void
  arrastoIniciado(deslocamento: Ponto): void
  arrastoTerminado(): void
  /** A correção acumulada a aplicar à posição que a engine dá durante um arrasto. */
  correcaoDoArrasto(): Ponto
}

export function useNavegacao(refArea: React.RefObject<HTMLElement>): Navegacao {
  const { setViewport, getViewport } = useReactFlow()
  const store = useStoreApi()
  const modoHand = useSessao((s) => s.areaDeTrabalho.modoHand)
  const fixarEnquadramento = useSessao((s) => s.fixarEnquadramento)
  const fixarModoHand = useSessao((s) => s.fixarModoHand)

  const [minZoom, setMinZoom] = useState(pisoCorrente(1))

  // O ponteiro e o arrasto em curso: refs, não estado — nada disto re-renderiza
  // os 400 nós (FR-016).
  const ponteiro = useRef<Ponto>({ x: 0, y: 0 })
  const deslocamento = useRef<Ponto | null>(null)
  const correcao = useRef<Ponto>({ x: 0, y: 0 })

  const quadro = useCallback((): Quadro => {
    const el = refArea.current
    if (!el) return { x: 0, y: 0, w: 0, h: 0 }
    return quadroVisivel(
      deRetanguloDOM(el.getBoundingClientRect()),
      { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight },
      oclusoesRegistradas(),
    )
  }, [refArea])

  /**
   * FR-015 — o enquadramento mudou por baixo de um arrasto em curso. A engine
   * recalcula `posição = ponto_do_plano_sob_o_ponteiro − deslocamento_capturado`
   * com o transform NOVO; sem correção o elemento saltaria pela diferença.
   *
   * A correção é acumulada aqui e descontada da posição que a engine entrega
   * (o `deslocamento_capturado` da engine é fechado no `startDrag` e não é
   * escrevível de fora — descontar na saída é a mesma conta, do outro lado).
   */
  const reancorar = useCallback((anterior: Enquadramento, atual: Enquadramento) => {
    const d = deslocamento.current
    if (!d) return
    const antes = pontoDoPlano(ponteiro.current, anterior)
    const agora = pontoDoPlano(ponteiro.current, atual)
    const novo = reancorarArrasto(d, antes, agora)
    correcao.current = {
      x: correcao.current.x + (novo.x - d.x),
      y: correcao.current.y + (novo.y - d.y),
    }
    deslocamento.current = novo
  }, [])

  const aplicar = useCallback(
    (e: Enquadramento, comTransito = false) => {
      // INTERROMPE E ASSUME: todo gesto cancela o trânsito pendente antes de comandar.
      cancelarTransito()
      const de = getViewport()

      // O piso ANTES da aplicação: ajustar à tela pode legitimamente descer abaixo do
      // piso declarado (`FR-008`), e a engine recortaria o valor se o `minZoom` ainda
      // fosse o antigo. `setMinZoom` do store é síncrono. Durante o trânsito o piso
      // acomoda as DUAS pontas, para nenhum quadro intermediário ser recortado.
      const pisoFinal = pisoCorrente(e.zoom)
      const pisoDoCaminho = comTransito ? Math.min(pisoCorrente(de.zoom), pisoFinal) : pisoFinal
      store.getState().setMinZoom(pisoDoCaminho)
      setMinZoom(pisoFinal)

      if (!comTransito) {
        setViewport(e)
        fixarEnquadramento(e)
        reancorar(de, e)
        return
      }

      transitar(de, e, {
        aQuadro: (atual, anteriorDoQuadro) => {
          setViewport(atual)
          reancorar(anteriorDoQuadro, atual) // a âncora do FR-015 vale a cada quadro
        },
        aoFim: () => {
          store.getState().setMinZoom(pisoFinal)
          fixarEnquadramento(e)
        },
      })
    },
    [getViewport, setViewport, fixarEnquadramento, store, reancorar],
  )

  /** FR-002 — sem ponteiro, o zoom ancora no centro da área visível. */
  const passoDeZoom = useCallback(
    (fator: number) => {
      const atual = getViewport()
      aplicar(zoomAncorado(atual, centroDoQuadro(quadro()), fator))
    },
    [getViewport, aplicar, quadro],
  )

  /** FR-008 — devolve o diagrama INTEIRO à área visível, centralizado, com folga. */
  const ajustarATela = useCallback(() => {
    const p = useSessao.getState().projecao
    aplicar(alvoAjustar(extensaoDesenhada(p), quadro()), true)
  }, [aplicar, quadro])

  /** FR-009 — só a escala volta ao natural; o enquadramento NÃO se mexe. */
  const resetarZoom = useCallback(() => {
    aplicar(alvoResetar(getViewport(), quadro()), true)
  }, [aplicar, getViewport, quadro])

  const alternarHand = useCallback(() => {
    fixarModoHand(useSessao.getState().areaDeTrabalho.modoHand === 'off' ? 'persistente' : 'off')
  }, [fixarModoHand])

  /** Reconciliação ao FIM do gesto — nunca por quadro (research §8.1). */
  const aoFimDoGesto = useCallback(() => {
    const v = getViewport()
    fixarEnquadramento(v)
    const piso = pisoCorrente(v.zoom)
    store.getState().setMinZoom(piso)
    setMinZoom(piso)
  }, [getViewport, fixarEnquadramento, store])

  // ── teclado: uma guarda, nenhuma letra ───────────────────────────────────
  useEffect(() => {
    const aoDescer = (e: KeyboardEvent) => {
      if (focoEmTexto(e.target)) return

      // Espaço: o modo hand TEMPORÁRIO (segura e volta ao soltar). Não é letra, e é
      // a convenção universal de "segurar para arrastar a vista".
      if (e.code === 'Space' && !e.repeat) {
        if (useSessao.getState().areaDeTrabalho.modoHand === 'off') {
          e.preventDefault()
          fixarModoHand('temporario')
        }
        return
      }

      // FR-018 — o alcance sem ponteiro. Dígitos com `Shift` e os pares
      // `Ctrl/⌘ + =` / `−` são a convenção do gênero e NÃO disputam letras com o
      // repertório de edição, que é de `ciclo-por-teclado` (ADR-005). `e.code` em vez
      // de `e.key` para a fileira de dígitos valer em qualquer layout.
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'Digit1') {
          e.preventDefault()
          ajustarATela()
          return
        }
        if (e.code === 'Digit0') {
          e.preventDefault()
          resetarZoom()
          return
        }
      }

      const comando = e.ctrlKey || e.metaKey
      if (comando && (e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault()
        passoDeZoom(PASSO_ZOOM)
      } else if (comando && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault()
        passoDeZoom(1 / PASSO_ZOOM)
      }
    }

    const aoSubir = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (useSessao.getState().areaDeTrabalho.modoHand === 'temporario') fixarModoHand('off')
    }

    // A temporária volta a `off` mesmo que a janela perca o foco no meio do gesto
    // (data-model.md §1): senão o modo ficaria preso sem ninguém segurando a tecla.
    const aoPerderFoco = () => {
      if (useSessao.getState().areaDeTrabalho.modoHand === 'temporario') fixarModoHand('off')
    }

    window.addEventListener('keydown', aoDescer)
    window.addEventListener('keyup', aoSubir)
    window.addEventListener('blur', aoPerderFoco)
    return () => {
      window.removeEventListener('keydown', aoDescer)
      window.removeEventListener('keyup', aoSubir)
      window.removeEventListener('blur', aoPerderFoco)
    }
  }, [passoDeZoom, ajustarATela, resetarZoom, fixarModoHand])

  // ── FR-007: o que redimensionar NÃO faz ─────────────────────────────────
  // React Flow mantém `(x, y, zoom)` fixos quando o contêiner muda de tamanho — o
  // que ancora o CANTO SUPERIOR ESQUERDO, não o centro. Um caminho só serve aos DOIS
  // casos (a divisão arrastada e a janela mudando de tamanho), e nenhum deles é o
  // produto reenquadrando por conta própria: é a preservação do que ela escolheu.
  //
  // Medido sobre o quadro DESCONTADO, e não sobre o retângulo bruto, para que a
  // conta concorde com `FR-011`. O `resize` da janela entra porque a área visível
  // encolhe com a página rolada mesmo quando a área do diagrama não muda de tamanho.
  const quadroAnterior = useRef<Quadro | null>(null)
  useEffect(() => {
    const el = refArea.current
    if (!el) return

    const conferir = () => {
      const atual = quadro()
      const anterior = quadroAnterior.current
      quadroAnterior.current = atual
      if (!anterior) return
      if (atual.w === 0 || atual.h === 0 || anterior.w === 0 || anterior.h === 0) return
      if (atual.w === anterior.w && atual.h === anterior.h && atual.x === anterior.x && atual.y === anterior.y) return

      const e = getViewport()
      const alvo = preservarCentro(e, anterior, atual)
      setViewport(alvo)
      fixarEnquadramento(alvo)
    }

    // Coalescido em rAF, e por uma razão medida: `quadro()` LÊ o layout e
    // `setViewport` o ESCREVE. Fazer os dois dentro do callback do observador força
    // um recálculo síncrono por tique, no meio de um gesto contínuo — o arrasto da
    // divisão caía de ~85fps para 48 no envelope, abaixo da barra do `SC-003`. Um
    // quadro por vez tira a leitura de dentro do observador e junta os tiques.
    let pendente = 0
    const acompanhar = () => {
      if (pendente !== 0) return
      pendente = requestAnimationFrame(() => {
        pendente = 0
        conferir()
      })
    }

    // a primeira medida é só referência — não há tamanho anterior a preservar
    const inicial = requestAnimationFrame(() => {
      quadroAnterior.current = quadro()
    })

    const observador = new ResizeObserver(acompanhar)
    observador.observe(el)
    window.addEventListener('resize', acompanhar)
    return () => {
      cancelAnimationFrame(inicial)
      if (pendente !== 0) cancelAnimationFrame(pendente)
      observador.disconnect()
      window.removeEventListener('resize', acompanhar)
    }
  }, [refArea, quadro, getViewport, setViewport, fixarEnquadramento])

  // O ponteiro é anotado no nível da janela: a re-ancoragem precisa dele mesmo
  // quando o gesto de enquadramento chega por tecla, e não por movimento.
  useEffect(() => {
    const aoMover = (ev: PointerEvent) => {
      const el = refArea.current
      if (!el) return
      const r = el.getBoundingClientRect()
      ponteiro.current = { x: ev.clientX - r.x, y: ev.clientY - r.y }
    }
    window.addEventListener('pointermove', aoMover, { passive: true })
    return () => window.removeEventListener('pointermove', aoMover)
  }, [refArea])

  return useMemo(
    () => ({
      handAtivo: modoHand !== 'off',
      minZoom,
      maxZoom: TETO_ZOOM,
      quadro,
      aplicar,
      passoDeZoom,
      ajustarATela,
      resetarZoom,
      alternarHand,
      aoFimDoGesto,
      anotarPonteiro: (p: Ponto) => {
        ponteiro.current = p
      },
      arrastoIniciado: (d: Ponto) => {
        deslocamento.current = d
        correcao.current = { x: 0, y: 0 }
      },
      arrastoTerminado: () => {
        deslocamento.current = null
        correcao.current = { x: 0, y: 0 }
      },
      correcaoDoArrasto: () => correcao.current,
    }),
    [modoHand, minZoom, quadro, aplicar, passoDeZoom, ajustarATela, resetarZoom, alternarHand, aoFimDoGesto],
  )
}
