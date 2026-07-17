import { useState } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { strings } from '@/strings'
import type { Edge, Node } from '@/core/model/types'
import { SHAPE_DELIMITERS } from '@/core/model/shapes'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SHAPE_KEYS = Object.keys(SHAPE_DELIMITERS)

/**
 * Keyed by edge id in the parent (remounts on selection change), so the
 * local draft is naturally reseeded from the model without an effect —
 * normalization (trim, empty -> absence) stays in the mutation (PP3).
 */
function EdgeLabelField({ edge }: { edge: Edge }) {
  const setEdgeLabel = useEditorStore((state) => state.setEdgeLabel)
  const [labelDraft, setLabelDraft] = useState(edge.label ?? '')

  return (
    <label className="flex flex-col gap-1 text-sm">
      {strings.propertiesPanel.labelFieldLabel}
      <input
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={strings.propertiesPanel.labelFieldPlaceholder}
        value={labelDraft}
        onChange={(event) => {
          setLabelDraft(event.target.value)
          setEdgeLabel(edge.id, event.target.value)
        }}
      />
    </label>
  )
}

/** Shape is read/written straight from the model (FR-005a) — no local draft, no normalization to own (Decisão N). */
function NodeShapeField({ node }: { node: Node }) {
  const setNodeShape = useEditorStore((state) => state.setNodeShape)

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>{strings.propertiesPanel.shapeFieldLabel}</span>
      <Select value={node.shape} onValueChange={(shape) => setNodeShape(node.id, shape)}>
        <SelectTrigger aria-label={strings.propertiesPanel.shapeFieldLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SHAPE_KEYS.map((shape) => (
            <SelectItem key={shape} value={shape}>
              {strings.shapeNames[shape as keyof typeof strings.shapeNames]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function PropertiesPanel() {
  const selection = useEditorStore((state) => state.selection)
  const model = useEditorStore((state) => state.model)

  const selectedEdge = selection?.kind === 'edge' ? model.edges.find((e) => e.id === selection.id) : undefined
  const selectedNode = selection?.kind === 'node' ? model.nodes.find((n) => n.id === selection.id) : undefined

  return (
    <div className="flex flex-col gap-2 border-t border-border p-2" data-testid="properties-panel">
      <h2 className="text-sm font-medium">{strings.propertiesPanel.heading}</h2>
      {!selection && <p className="text-sm text-muted-foreground">{strings.propertiesPanel.neutral}</p>}
      {selectedEdge && <EdgeLabelField key={selectedEdge.id} edge={selectedEdge} />}
      {selectedNode && <NodeShapeField key={selectedNode.id} node={selectedNode} />}
    </div>
  )
}

export default PropertiesPanel
