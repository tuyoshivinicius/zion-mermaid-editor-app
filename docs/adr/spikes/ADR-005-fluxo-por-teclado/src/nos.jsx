import { createContext, memo, useContext } from 'react'
import { Handle, Position } from '@xyflow/react'

/** O canal do texto digitado até o modelo. Não passa pela engine. */
export const Despacho = createContext(() => {})

export const CaixaNode = memo(function CaixaNode({ id, data }) {
  const despachar = useContext(Despacho)
  const classes = ['caixa', data.focado && 'focado', data.alvo && 'alvo'].filter(Boolean).join(' ')
  return (
    <div className={classes} data-testid={`no-${id}`} data-foco={`no-${id}`} tabIndex={-1}>
      <Handle type="target" position={Position.Top} />
      {data.editando ? (
        <input
          className="entrada"
          data-foco={`input-no-${id}`}
          value={data.rotulo}
          onChange={(ev) => despachar({ tipo: 'texto', valor: ev.target.value })}
        />
      ) : (
        <span className="caixa-rotulo">{data.rotulo || ' '}</span>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
