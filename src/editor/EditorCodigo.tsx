// Editor de código (ADR-003) — vista e produtor de comandos. `<textarea>`
// controlado, SEM realce (o piso de latência do ADR-006; realce é
// `codigo-de-entrada`). Debounce SÓ no caminho texto→modelo (research §6).
// Revela a linha nova de um gesto SEM roubar foco nem mover o cursor
// (ADR-005 / FR-002 / SC-010).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSessao } from '../modelo/store'

const DEBOUNCE_MS = 24
const ALTURA_LINHA = 20 // px por linha (casado com o CSS abaixo)

export function EditorCodigo() {
  const textoEditor = useSessao((s) => s.textoEditor)
  const ultimaOrigem = useSessao((s) => s.ultimaOrigem)
  const revelar = useSessao((s) => s.revelar)
  const aplicarTexto = useSessao((s) => s.aplicarTexto)

  const [valor, setValor] = useState(textoEditor)
  const [flash, setFlash] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cursorPreservado = useRef<{ inicio: number; fim: number } | null>(null)

  // Um gesto no diagrama (origem canvas) escreveu o texto cirurgicamente: a vista
  // do editor reflete, sem que o eco reescreva o que a pessoa digita (ADR-003).
  // O append é no fim → o cursor da pessoa (antes) não se move (SC-010): guardamos
  // sua posição para restaurá-la após a troca de valor.
  useEffect(() => {
    if (ultimaOrigem !== 'canvas') return
    const ta = ref.current
    if (ta && document.activeElement === ta) {
      cursorPreservado.current = { inicio: ta.selectionStart, fim: ta.selectionEnd }
    }
    setValor(textoEditor)
  }, [textoEditor, ultimaOrigem])

  // Restaura o cursor DEPOIS que o novo valor foi ao DOM (append no fim não mexe
  // no que está antes) — sem chamar focus() (SC-010).
  useLayoutEffect(() => {
    const ta = ref.current
    const alvo = cursorPreservado.current
    if (ta && alvo) {
      ta.selectionStart = alvo.inicio
      ta.selectionEnd = alvo.fim
      cursorPreservado.current = null
    }
  }, [valor])

  // Revelar a linha nova: ajusta scrollTop + flash transitório. NÃO chama focus()
  // nem toca em selectionStart/End (SC-010).
  useEffect(() => {
    if (!revelar) return
    const ta = ref.current
    if (ta) ta.scrollTop = Math.max(0, revelar.linha * ALTURA_LINHA - ta.clientHeight / 2)
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 350)
    return () => clearTimeout(t)
  }, [revelar])

  const aoDigitar = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const novo = e.target.value
      setValor(novo) // exibição imediata (o valor é da pessoa)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => aplicarTexto(novo), DEBOUNCE_MS) // texto→modelo ao vivo
    },
    [aplicarTexto],
  )

  return (
    <textarea
      ref={ref}
      data-testid="editor-codigo"
      className={
        'h-full w-full resize-none bg-background p-3 font-mono text-sm leading-5 text-foreground outline-none transition-colors ' +
        (flash ? 'bg-muted' : '')
      }
      spellCheck={false}
      value={valor}
      onChange={aoDigitar}
    />
  )
}
