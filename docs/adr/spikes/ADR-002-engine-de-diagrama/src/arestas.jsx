import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, useReactFlow } from '@xyflow/react'
import { ROW_H } from './layout.js'
import { useAcoes } from './acoes.js'

const LARGURA_AUTO = 46 // largura do laço da auto-mensagem
const ALTURA_AUTO = 30

/**
 * Mensagem = 1 aresta da engine. O caminho é horizontal (não é curva de grafo),
 * e o rótulo é arrastável na vertical para REORDENAR NO TEMPO — gesto que a
 * engine não oferece, porque no vocabulário dela aresta não tem posição.
 */
export function MensagemEdge({ id, sourceX, sourceY, targetX, targetY, data, selected }) {
  const { moverMensagem } = useAcoes()
  const { getZoom } = useReactFlow()
  const [arrasto, setArrasto] = useState(null) // { dy, alvo }

  const desloc = arrasto ? arrasto.dy : 0
  const y = sourceY + desloc

  let path
  let rotuloX
  let rotuloY
  let seta

  if (data.auto) {
    const x = sourceX
    path = `M ${x} ${y} h ${LARGURA_AUTO} v ${ALTURA_AUTO} h ${-LARGURA_AUTO}`
    rotuloX = x + LARGURA_AUTO + 10
    rotuloY = y + ALTURA_AUTO / 2
    seta = { x, y: y + ALTURA_AUTO, dir: -1 }
  } else {
    path = `M ${sourceX} ${y} L ${targetX} ${y}`
    rotuloX = (sourceX + targetX) / 2
    rotuloY = y
    seta = { x: targetX, y, dir: data.paraEsquerda ? -1 : 1 }
  }

  const tracejado = data.arrow === 'dashed'

  const aoDescer = (e) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrasto({ dy: 0, alvo: data.instante, y0: e.clientY })
  }
  const aoMover = (e) => {
    if (!arrasto) return
    e.stopPropagation()
    const dyTela = e.clientY - arrasto.y0
    const dyFluxo = dyTela / getZoom()
    setArrasto({ ...arrasto, dy: dyFluxo, alvo: data.instante + Math.round(dyFluxo / ROW_H) })
  }
  const aoSubir = (e) => {
    if (!arrasto) return
    e.stopPropagation()
    e.currentTarget.releasePointerCapture(e.pointerId)
    const alvo = arrasto.alvo
    setArrasto(null)
    if (alvo !== data.instante) moverMensagem(id, alvo)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: selected ? '#2563eb' : '#334155',
          strokeWidth: selected ? 2.5 : 1.6,
          strokeDasharray: tracejado ? '6 4' : undefined,
          fill: 'none',
        }}
      />
      {/* ponta de seta desenhada à mão: marker-end não acompanha caminho customizado */}
      <path
        d={`M ${seta.x} ${seta.y} l ${-9 * seta.dir} -5 l 0 10 z`}
        fill={selected ? '#2563eb' : '#334155'}
      />
      <EdgeLabelRenderer>
        <div
          className={`rotulo${arrasto ? ' arrastando' : ''}`}
          data-testid={`mensagem-${id}`}
          data-instante={data.instante}
          style={{ transform: `translate(-50%, -50%) translate(${rotuloX}px, ${rotuloY - 14}px)` }}
          onPointerDown={aoDescer}
          onPointerMove={aoMover}
          onPointerUp={aoSubir}
        >
          <span className="rotulo-ordem">{data.instante + 1}</span>
          {data.label}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
