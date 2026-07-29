// Aresta customizada (R1) — renderiza o texto da conexão + a marca, e um editor de
// texto INLINE (FR-004/FR-005) com a mesma semântica do rótulo do nó: abre por gesto,
// propaga ao vivo, cola `text/plain`, fecha-e-descarta se a aresta some pelo código.
// A identidade da aresta é de sessão (`eN`), nunca escrita no código.

import { memo, useEffect, useRef, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import { useSessao } from '../modelo/store'
import { caminhoDaConexao } from './caminho'

interface DadosAresta {
  texto: string | null
  marcado: boolean
}

function ConexaoBase({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const d = (data ?? { texto: null, marcado: false }) as unknown as DadosAresta
  const editarTexto = useSessao((s) => s.editarTexto)
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editando) ref.current?.focus()
  }, [editando])

  // A MESMA função que mede (`areatrabalho/extensao.ts`) — nunca duas geometrias.
  const { path, labelX, labelY } = caminhoDaConexao({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const abrir = () => {
    setValor(d.texto ?? '')
    setEditando(true)
  }
  const vazio = d.texto == null || d.texto === ''

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="absolute"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            abrir()
          }}
        >
          {editando ? (
            <textarea
              ref={ref}
              data-testid="editor-texto-conexao"
              className="nodrag w-24 resize-none rounded border border-border bg-background px-1 py-0.5 text-center text-xs text-foreground outline-none"
              rows={1}
              value={valor}
              onChange={(e) => {
                setValor(e.target.value)
                editarTexto(id, e.target.value)
              }}
              onPaste={(e) => {
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
            <div
              data-testid="texto-conexao"
              data-marcado={d.marcado ? 'true' : 'false'}
              className={
                'cursor-text whitespace-pre rounded border bg-background px-1.5 py-0.5 text-xs text-foreground ' +
                (d.marcado ? 'border-amber-500' : vazio ? 'border-dashed border-border text-muted-foreground' : 'border-border')
              }
            >
              {vazio ? '＋' : d.texto}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const Conexao = memo(ConexaoBase)
