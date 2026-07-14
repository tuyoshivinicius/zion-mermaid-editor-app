import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface FlowNodeData {
  label: string
  isConnectSource?: boolean
  isEditing?: boolean
  editDraft?: string
  [key: string]: unknown
}

/**
 * Rename is driven entirely by CanvasPanel's centralized keydown state (see
 * its onKeyDown comment) rather than a real focusable <input> here: React
 * Flow repeatedly re-asserts DOM focus on its own node wrapper, so a child
 * input can never reliably win or keep focus after the initial keystroke.
 */
export function FlowNode({ data }: NodeProps) {
  const { label, isConnectSource, isEditing, editDraft } = data as FlowNodeData

  if (isEditing) {
    return (
      <div
        className="rounded-md border border-primary bg-background px-4 py-2 text-sm shadow-sm ring-2 ring-primary"
        data-testid="flow-node-editing"
      >
        {editDraft}
        <span aria-hidden="true">|</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-md border px-4 py-2 text-sm shadow-sm ${
        isConnectSource ? 'border-primary ring-2 ring-primary' : 'border-input bg-background'
      }`}
      aria-label={label}
      data-connect-source={isConnectSource ? 'true' : undefined}
    >
      <Handle type="target" position={Position.Top} />
      {label}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default FlowNode
