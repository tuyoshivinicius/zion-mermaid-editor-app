// Área do diagrama (ADR-002) — vista React Flow. O gesto vira descritor discreto de
// mudança (contracts/change-descriptor.md); a engine NUNCA é fonte. R0: criar/mover.
// R1: conectar (FR-001), agrupar (FR-002), rotular inline (FR-004), e — US3 — seleção
// retangular por CONTENÇÃO (SelectionMode.Full), mover-seleção, duplicar/excluir/
// adicionar/retirar/desagrupar. `onNodesChange` é filtrado: só o gesto concluído vira
// comando; seleção/hover não sujam o modelo (ADR-003).

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  MarkerType,
  SelectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnNodeDrag,
} from '@xyflow/react'
import { useSessao } from '../modelo/store'
import { selecaoVazia, type Selecao } from '../modelo/selecao'
import { CaixaNo } from './CaixaNo'
import { Conexao } from './Conexao'
import { Agrupamento } from './Agrupamento'

export function Canvas() {
  const projecao = useSessao((s) => s.projecao)
  const criarNo = useSessao((s) => s.criarNo)
  const conectar = useSessao((s) => s.conectar)
  const agrupar = useSessao((s) => s.agrupar)
  const moverSelecao = useSessao((s) => s.moverSelecao)
  const duplicarSelecao = useSessao((s) => s.duplicarSelecao)
  const excluirSelecao = useSessao((s) => s.excluirSelecao)
  const adicionarMembros = useSessao((s) => s.adicionarMembros)
  const retirarMembros = useSessao((s) => s.retirarMembros)
  const desagrupar = useSessao((s) => s.desagrupar)
  const { screenToFlowPosition, getInternalNode } = useReactFlow()

  const nodeTypes = useMemo(() => ({ caixa: CaixaNo, agrupamento: Agrupamento }), [])
  const edgeTypes = useMemo(() => ({ conexao: Conexao }), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(projecao.nodes as unknown as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState(projecao.edges as unknown as Edge[])
  const [selecao, setSelecao] = useState<Selecao>(selecaoVazia())

  useEffect(() => {
    setNodes(projecao.nodes as unknown as Node[])
    setEdges(projecao.edges as unknown as Edge[])
  }, [projecao, setNodes, setEdges])

  const aoDuploClique = useCallback(
    (e: React.MouseEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo.closest('.react-flow__node')) return
      const ponto = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      criarNo({ x: Math.round(ponto.x), y: Math.round(ponto.y) })
    },
    [screenToFlowPosition, criarNo],
  )

  const aoConectar = useCallback(
    (c: Connection) => {
      if (c.source && c.target) conectar(c.source, c.target)
    },
    [conectar],
  )

  // Ao soltar um arraste (nó, moldura ou seleção): grava a posição ABSOLUTA de todos
  // os nós-caixa (membros arrastados junto inclusos). Só arranjo — código byte-idêntico.
  const sincronizarPosicoes = useCallback(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const n of nodes) {
      if (n.type !== 'caixa') continue
      const abs = getInternalNode(n.id)?.internals.positionAbsolute ?? n.position
      pos[n.id] = { x: abs.x, y: abs.y }
    }
    if (Object.keys(pos).length > 0) moverSelecao(pos)
  }, [nodes, getInternalNode, moverSelecao])

  const aoSoltarNo: OnNodeDrag<Node> = useCallback(() => sincronizarPosicoes(), [sincronizarPosicoes])

  const aoMudarSelecao = useCallback(({ nodes: ns, edges: es }: { nodes: Node[]; edges: Edge[] }) => {
    setSelecao({
      nos: new Set(ns.filter((n) => n.type === 'caixa').map((n) => n.id)),
      agrupamentos: new Set(ns.filter((n) => n.type === 'agrupamento').map((n) => n.id)),
      conexoes: new Set(es.map((e) => e.id)),
    })
  }, [])

  const membros = () => [...selecao.nos, ...selecao.agrupamentos]
  const temSelecao = selecao.nos.size + selecao.agrupamentos.size + selecao.conexoes.size > 0

  // Excluir por tecla (Delete/Backspace), exceto quando se edita um texto inline.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo && (alvo.tagName === 'TEXTAREA' || alvo.tagName === 'INPUT')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && temSelecao) {
        e.preventDefault()
        excluirSelecao(selecao)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecao, temSelecao, excluirSelecao])

  const preservarFoco = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.react-flow__pane')) e.preventDefault()
  }, [])

  const Botao = ({ tid, onClick, off, children }: { tid: string; onClick: () => void; off?: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      data-testid={tid}
      disabled={off}
      onClick={onClick}
      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground shadow-sm disabled:opacity-40"
    >
      {children}
    </button>
  )

  return (
    <div
      className="relative h-full w-full"
      data-testid="area-diagrama"
      onDoubleClick={aoDuploClique}
      onMouseDown={preservarFoco}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Botao tid="btn-agrupar" off={membros().length === 0} onClick={() => agrupar(membros())}>Agrupar</Botao>
        <Botao tid="btn-duplicar" off={!temSelecao} onClick={() => duplicarSelecao(selecao)}>Duplicar</Botao>
        <Botao tid="btn-excluir" off={!temSelecao} onClick={() => excluirSelecao(selecao)}>Excluir</Botao>
        <Botao tid="btn-adicionar" off={selecao.agrupamentos.size !== 1 || selecao.nos.size === 0} onClick={() => adicionarMembros([...selecao.nos], [...selecao.agrupamentos][0])}>Adicionar</Botao>
        <Botao tid="btn-retirar" off={selecao.nos.size === 0} onClick={() => retirarMembros([...selecao.nos])}>Retirar</Botao>
        <Botao tid="btn-desagrupar" off={selecao.agrupamentos.size === 0} onClick={() => [...selecao.agrupamentos].forEach(desagrupar)}>Desagrupar</Botao>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={aoSoltarNo}
        onSelectionDragStop={sincronizarPosicoes}
        onConnect={aoConectar}
        onSelectionChange={aoMudarSelecao}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'conexao', markerEnd: { type: MarkerType.ArrowClosed } }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable
        elementsSelectable
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null}
        selectionOnDrag
        selectionMode={SelectionMode.Full}
        panOnDrag={false}
        panOnScroll
        fitView={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background />
      </ReactFlow>
    </div>
  )
}
