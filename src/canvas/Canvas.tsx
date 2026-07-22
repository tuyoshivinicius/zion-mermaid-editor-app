// Área do diagrama (ADR-002) — vista React Flow, plano rolável. O gesto vira
// descritor discreto de mudança (contracts/change-descriptor.md); a engine NUNCA
// é fonte. R0: duplo-clique no vazio → criar (FR-001); arrastar → arranjo
// (FR-007). `onNodesChange` é filtrado: só o arraste concluído vira `moverNo`.

import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  useNodesState,
  useReactFlow,
  type Node,
  type OnNodeDrag,
} from '@xyflow/react'
import { useSessao } from '../modelo/store'
import { CaixaNo } from './CaixaNo'

export function Canvas() {
  const projecao = useSessao((s) => s.projecao)
  const criarNo = useSessao((s) => s.criarNo)
  const moverNo = useSessao((s) => s.moverNo)
  const { screenToFlowPosition } = useReactFlow()

  const nodeTypes = useMemo(() => ({ caixa: CaixaNo }), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(projecao.nodes as unknown as Node[])

  // A projeção reusa os objetos não mudados (Princípio III); sincroniza a vista.
  useEffect(() => {
    setNodes(projecao.nodes as unknown as Node[])
  }, [projecao, setNodes])

  // Duplo-clique: no vazio → cria (FR-001); SOBRE a caixa → no-op (US1-7).
  const aoDuploClique = useCallback(
    (e: React.MouseEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo.closest('.react-flow__node')) return // sobre a caixa → nada acontece
      const ponto = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      criarNo({ x: Math.round(ponto.x), y: Math.round(ponto.y) })
    },
    [screenToFlowPosition, criarNo],
  )

  // Arrastar (FR-007): grava a posição só ao soltar; zero bytes no editor.
  const aoSoltar: OnNodeDrag<Node> = useCallback(
    (_e, node) => {
      moverNo(node.id, { x: Math.round(node.position.x), y: Math.round(node.position.y) })
    },
    [moverNo],
  )

  // O gesto no plano NÃO rouba o foco do editor (ADR-005/SC-010): impede o
  // mousedown do plano de mover o foco. Arrastar nó continua (o nó não é o plano).
  const preservarFoco = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.react-flow__pane')) e.preventDefault()
  }, [])

  return (
    <div
      className="h-full w-full"
      data-testid="area-diagrama"
      onDoubleClick={aoDuploClique}
      onMouseDown={preservarFoco}
    >
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodesChange={onNodesChange}
        onNodeDragStop={aoSoltar}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable
        fitView={false}
        // Plano rolável (FR-007); zoom/pan-por-arraste/ajustar são `area-de-trabalho` (fora do R0).
        panOnDrag={false}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background />
      </ReactFlow>
    </div>
  )
}
