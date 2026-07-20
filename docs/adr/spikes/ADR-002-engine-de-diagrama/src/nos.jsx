import { Handle, Position } from '@xyflow/react'
import { CENTRO, HEAD_H, linhaY, ROW_H } from './layout.js'

/**
 * Participante = 1 nó da engine. A caixa do topo é o participante; a lifeline
 * é desenhada dentro do MESMO nó, e cada instante do tempo vira um Handle.
 * É assim que a coluna temporal entra no vocabulário nó/aresta da lib.
 */
export function ParticipanteNode({ id, data }) {
  const { name, altura, linhas, ativacoes } = data
  return (
    <div className="participante" style={{ height: altura }}>
      <div className="participante-caixa" data-testid={`participante-${id}`}>
        {name}
      </div>

      {/* lifeline */}
      <div className="lifeline" style={{ left: CENTRO - 1, top: HEAD_H, height: altura - HEAD_H }} />

      {/* barras de ativação */}
      {ativacoes.map((a) => (
        <div
          key={a.id}
          className="ativacao"
          data-testid={`ativacao-${a.id}`}
          style={{
            left: CENTRO - 7,
            top: linhaY(a.from) - 12,
            height: Math.max(linhaY(a.to) - linhaY(a.from) + 24, 24),
          }}
        />
      ))}

      {/* um handle por instante: é o que permite arrastar uma mensagem nova */}
      {Array.from({ length: linhas }, (_, r) => (
        <Handle
          key={r}
          id={`linha-${r}`}
          type="source"
          position={Position.Right}
          data-testid={`ancora-${id}-${r}`}
          className="ancora"
          style={{ left: CENTRO, top: linhaY(r), transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  )
}

/** Fragmento alt/loop: um nó decorativo, atrás de tudo, sem interação. */
export function FragmentoNode({ data }) {
  return (
    <div className="fragmento">
      <span className="fragmento-tag">{data.kind}</span>
      <span className="fragmento-rotulo">[{data.label}]</span>
    </div>
  )
}

export const ALTURA_LINHA = ROW_H
