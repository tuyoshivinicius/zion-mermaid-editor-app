import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { linhaY, SEQ_CENTRO, SEQ_HEAD_H } from './derivar.js'

/** Nó de flowchart: dois handles, o caso comum e barato. */
export const CaixaNode = memo(function CaixaNode({ id, data }) {
  return (
    <div className={`caixa ${data.shape}`} data-testid={`no-${id}`}>
      <Handle type="target" position={Position.Top} />
      <span className="caixa-rotulo">{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})

/**
 * Nó de participante do Sequence, no desenho que o spike ADR-002 provou:
 * a coluna inteira é um nó e cada instante do tempo é um Handle. É esse
 * `participantes x (mensagens + 1)` que este spike põe na balança.
 */
export const ParticipanteNode = memo(function ParticipanteNode({ id, data }) {
  const { name, altura, linhas } = data
  return (
    <div className="participante" style={{ height: altura }}>
      <div className="participante-caixa" data-testid={`participante-${id}`}>
        {name}
      </div>
      <div
        className="lifeline"
        style={{ left: SEQ_CENTRO - 1, top: SEQ_HEAD_H, height: altura - SEQ_HEAD_H }}
      />
      {Array.from({ length: linhas }, (_, r) => (
        <Handle
          key={r}
          id={`linha-${r}`}
          type="source"
          position={Position.Right}
          className="ancora"
          style={{ left: SEQ_CENTRO, top: linhaY(r), transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  )
})
