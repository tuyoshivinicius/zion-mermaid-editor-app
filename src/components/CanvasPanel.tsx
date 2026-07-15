import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, type Connection, type Edge as RFEdge, type Node as RFNode } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEditorStore } from '@/state/editorStore'
import { layout } from '@/core/layout'
import { FlowNode } from '@/components/FlowNode'

const NODE_TYPES = { flowNode: FlowNode }

export function CanvasPanel() {
  const model = useEditorStore((state) => state.model)
  const connectMode = useEditorStore((state) => state.connectMode)
  const connectSourceId = useEditorStore((state) => state.connectSourceId)
  const handleConnectClick = useEditorStore((state) => state.handleConnectClick)
  const connectNodes = useEditorStore((state) => state.connectNodes)
  const renameNode = useEditorStore((state) => state.renameNode)
  const removeNode = useEditorStore((state) => state.removeNode)
  const removeEdge = useEditorStore((state) => state.removeEdge)

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  // Derived, not commanded: exits edit mode when the node being edited is
  // destroyed (clear, remove-node, ...) — no pointer to content survives
  // the destruction of the content it references (FR-006c).
  useEffect(() => {
    if (editingNodeId && !model.nodes.some((n) => n.id === editingNodeId)) {
      setEditingNodeId(null)
    }
  }, [editingNodeId, model.nodes])

  const positions = useMemo(() => layout(model), [model])

  const nodes: RFNode[] = useMemo(
    () =>
      model.nodes.map((node) => ({
        id: node.id,
        type: 'flowNode',
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        data: {
          label: node.label,
          isConnectSource: connectSourceId === node.id,
          isEditing: editingNodeId === node.id,
          editDraft,
        },
        draggable: false,
      })),
    [model.nodes, positions, connectSourceId, editingNodeId, editDraft],
  )

  const edges: RFEdge[] = useMemo(
    () =>
      model.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? undefined,
      })),
    [model.edges],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) connectNodes(connection.source, connection.target)
    },
    [connectNodes],
  )

  const onNodeClick = useCallback(
    (_event: unknown, node: RFNode) => {
      if (connectMode) handleConnectClick(node.id)
    },
    [connectMode, handleConnectClick],
  )

  /**
   * Centralizes ALL node keyboard interaction for whichever node/edge
   * currently has DOM focus, in the CAPTURE phase (React Flow's own node
   * keydown handling calls stopPropagation() on some keys — observed for
   * Enter — before they'd otherwise bubble up to a plain onKeyDown here).
   * While a rename is in progress, this doubles as the inline editor's
   * input: FlowNode has no real <input> because React Flow repeatedly
   * re-asserts DOM focus on its own node wrapper, so a child input can
   * never reliably keep focus after the first keystroke (Decisão E).
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (editingNodeId) {
        if (event.key === 'Enter') {
          event.preventDefault()
          const trimmed = editDraft.trim()
          const nodeId = editingNodeId
          setEditingNodeId(null)
          const current = model.nodes.find((n) => n.id === nodeId)
          if (trimmed && current && trimmed !== current.label) renameNode(nodeId, trimmed)
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          setEditingNodeId(null)
          return
        }
        if (event.key === 'Backspace') {
          event.preventDefault()
          setEditDraft((d) => d.slice(0, -1))
          return
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          setEditDraft((d) => d + event.key)
          return
        }
        return
      }

      const target = event.target as HTMLElement
      const el = target.closest('[data-id]') as HTMLElement | null
      const id = el?.dataset.id
      if (!id) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (model.nodes.some((n) => n.id === id)) removeNode(id)
        else if (model.edges.some((e) => e.id === id)) removeEdge(id)
        return
      }

      if ((event.key === 'Enter' || event.key === ' ') && model.nodes.some((n) => n.id === id)) {
        event.preventDefault()
        if (connectMode) {
          handleConnectClick(id)
        } else {
          setEditDraft('')
          setEditingNodeId(id)
        }
      }
    },
    [editingNodeId, editDraft, model.nodes, model.edges, removeNode, removeEdge, connectMode, handleConnectClick, renameNode],
  )

  return (
    <div className="h-full w-full" data-testid="canvas-panel" onKeyDownCapture={onKeyDown}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default CanvasPanel
