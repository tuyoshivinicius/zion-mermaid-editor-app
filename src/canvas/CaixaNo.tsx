// Nó retangular customizado — o shape do vocabulário. Consome a projeção; a marca
// de expressividade/digitação aparece por `data.marcado`. R1: handles conectáveis
// (FR-001) + editor de rótulo INLINE (FR-004/FR-005): abre por gesto, propaga ao
// vivo (sem confirmação), cola `text/plain` (o textarea já descarta formatação), e
// fecha-e-descarta sozinho se o nó some pelo código (o componente desmonta com ele).

import { memo, useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '../ui/utils'
import { useSessao } from '../modelo/store'
import type { DadosCaixa } from '../projecao/projetar'

function CaixaNoBase({ id, data }: NodeProps) {
  const d = data as unknown as DadosCaixa
  const editarTexto = useSessao((s) => s.editarTexto)
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editando) ref.current?.focus()
  }, [editando])

  const abrir = () => {
    setValor(d.rotulo)
    setEditando(true)
  }

  return (
    <div
      data-testid="caixa-no"
      data-marcado={d.marcado ? 'true' : 'false'}
      onDoubleClick={(e) => {
        e.stopPropagation()
        abrir()
      }}
      className={cn(
        'relative flex h-full w-full items-center justify-center rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm',
        d.marcado ? 'border-amber-500' : 'border-border',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-muted-foreground" />
      {editando ? (
        <textarea
          ref={ref}
          data-testid="editor-rotulo"
          className="nodrag h-full w-full resize-none bg-transparent text-center text-sm text-foreground outline-none"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value)
            editarTexto(id, e.target.value) // propaga ao vivo (FR-004)
          }}
          onPaste={(e) => {
            // FR-005/SC-003: entra só `text/plain` — nenhuma formatação da origem sobrevive.
            e.preventDefault()
            const ta = e.currentTarget
            const puro = e.clipboardData.getData('text/plain')
            const novo = valor.slice(0, ta.selectionStart) + puro + valor.slice(ta.selectionEnd)
            setValor(novo)
            editarTexto(id, novo)
          }}
          onBlur={() => setEditando(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditando(false)
          }}
        />
      ) : (
        <span className="truncate whitespace-pre">{d.rotulo}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-muted-foreground" />
    </div>
  )
}

export const CaixaNo = memo(CaixaNoBase)
