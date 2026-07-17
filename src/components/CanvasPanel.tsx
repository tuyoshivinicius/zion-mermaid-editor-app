import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, Controls, type Connection, type Edge as RFEdge, type Node as RFNode } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEditorStore } from '@/state/editorStore'
import { layout } from '@/core/layout'
import { shapeSize } from '@/core/layout/shape-geometry'
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
  const selection = useEditorStore((state) => state.selection)
  const selectNode = useEditorStore((state) => state.selectNode)
  const selectEdge = useEditorStore((state) => state.selectEdge)
  const clearSelection = useEditorStore((state) => state.clearSelection)

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Derived, not commanded: exits edit mode when the node being edited is
  // destroyed (clear, remove-node, ...) — no pointer to content survives
  // the destruction of the content it references (FR-006c).
  useEffect(() => {
    if (editingNodeId && !model.nodes.some((n) => n.id === editingNodeId)) {
      setEditingNodeId(null)
    }
  }, [editingNodeId, model.nodes])

  const positions = useMemo(() => layout(model), [model])

  // Both this and `edges` below are deliberately independent of `selection`:
  // React Flow re-asserts DOM focus on a node's own wrapper after most
  // re-renders (Decisão E), but not reliably for a node/edge whose `data`/
  // array identity just changed as a *result of* the click that focused it
  // — recomputing this array on every selection change dropped the
  // just-clicked element's focus right before a Delete keystroke arrived.
  // The selected-node/edge highlight is applied imperatively instead (see
  // the effect below), so neither array's identity depends on selection.
  const nodes: RFNode[] = useMemo(
    () =>
      model.nodes.map((node) => {
        const { width, height } = shapeSize(node.shape)
        return {
          id: node.id,
          type: 'flowNode',
          position: positions.get(node.id) ?? { x: 0, y: 0 },
          data: {
            label: node.label,
            shape: node.shape,
            isConnectSource: connectSourceId === node.id,
            isEditing: editingNodeId === node.id,
            editDraft,
          },
          // Both style (actual CSS box) and width/height (told to React
          // Flow up front) so it never has to measure the DOM before
          // computing fitView/edge-anchor geometry (avoids a post-mount
          // reflow that shifted nodes once boxes stopped being uniform).
          style: { width, height },
          width,
          height,
          draggable: false,
        }
      }),
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

  // Imperative selection highlight (FR-002c) — kept out of the `nodes`/
  // `edges` arrays on purpose (see above); toggles a class/attribute
  // directly on the matching DOM node instead of forcing a re-render.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    root.querySelectorAll('[data-testid^="rf__edge-"].edge-selected').forEach((el) => el.classList.remove('edge-selected'))
    root.querySelectorAll('.node-shape.node-selected').forEach((el) => {
      el.classList.remove('node-selected')
      el.removeAttribute('data-selected')
    })
    if (selection?.kind === 'edge') {
      root.querySelector(`[data-testid="rf__edge-${selection.id}"]`)?.classList.add('edge-selected')
    } else if (selection?.kind === 'node') {
      const nodeShapeEl = root.querySelector(`[data-testid="rf__node-${selection.id}"] .node-shape`)
      nodeShapeEl?.classList.add('node-selected')
      nodeShapeEl?.setAttribute('data-selected', 'true')
    }
  }, [selection, nodes, edges])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) connectNodes(connection.source, connection.target)
    },
    [connectNodes],
  )

  const onNodeClick = useCallback(
    (_event: unknown, node: RFNode) => {
      if (connectMode) handleConnectClick(node.id)
      else selectNode(node.id)
    },
    [connectMode, handleConnectClick, selectNode],
  )

  const onEdgeClick = useCallback(
    (_event: unknown, edge: RFEdge) => {
      selectEdge(edge.id)
    },
    [selectEdge],
  )

  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // Keyboard focus establishes selection (FR-002d) — no second step (Enter/
  // Space) so it never collides with rename/connect, which stay on
  // Enter/Space (Decisão Q).
  const onFocusCapture = useCallback(
    (event: React.FocusEvent) => {
      const el = (event.target as HTMLElement).closest('[data-id]') as HTMLElement | null
      const id = el?.dataset.id
      if (!id) return
      if (model.nodes.some((n) => n.id === id)) selectNode(id)
      else if (model.edges.some((e) => e.id === id)) selectEdge(id)
    },
    [model.nodes, model.edges, selectNode, selectEdge],
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

      if (event.key === 'Escape') {
        clearSelection()
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
    [
      editingNodeId,
      editDraft,
      model.nodes,
      model.edges,
      removeNode,
      removeEdge,
      connectMode,
      handleConnectClick,
      renameNode,
      clearSelection,
    ],
  )

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-testid="canvas-panel"
      onKeyDownCapture={onKeyDown}
      onFocusCapture={onFocusCapture}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default CanvasPanel
