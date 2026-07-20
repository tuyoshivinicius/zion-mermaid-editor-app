import { memo, useContext } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import { Despacho } from './nos.jsx'

/**
 * Aresta com rótulo editável. O rótulo vive no `EdgeLabelRenderer`, que é uma
 * camada de DOM separada e com `pointer-events: none` por padrão — detalhe que
 * importa para o teclado: o alvo do foco não está dentro do nó nem da aresta.
 */
export const ArestaRotulada = memo(function ArestaRotulada({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  const despachar = useContext(Despacho)

  return (
    <>
      <BaseEdge id={id} path={path} />
      <EdgeLabelRenderer>
        <div
          className="rotulo-conexao"
          data-testid={`conexao-${id}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {data.editando ? (
            <input
              className="entrada"
              data-foco={`input-conexao-${id}`}
              value={data.rotulo}
              onChange={(ev) => despachar({ tipo: 'texto', valor: ev.target.value })}
            />
          ) : (
            data.rotulo || null
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
})
