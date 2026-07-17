import { Handle, Position, type NodeProps } from '@xyflow/react'
import { DEFAULT_SHAPE } from '@/core/model/shapes'
import { strings } from '@/strings'

export interface FlowNodeData {
  label: string
  shape?: string
  isConnectSource?: boolean
  isEditing?: boolean
  editDraft?: string
  [key: string]: unknown
}

interface ShapeStyle {
  clipPath?: string
  borderRadius?: string
}

/**
 * One CSS technique per shape family (clip-path for polygonal shapes,
 * border-radius for round/stadium/circle/cylinder) so `SHAPE_STYLES[a]` is
 * never `===` `SHAPE_STYLES[b]` for `a !== b` in the same family (SH1) —
 * the structural proxy the e2e suite asserts on via `data-shape`.
 */
const SHAPE_STYLES: Record<string, ShapeStyle> = {
  rect: {},
  round: { borderRadius: '18px' },
  stadium: { borderRadius: '9999px' },
  subroutine: {},
  cylinder: { borderRadius: '50% 50% 50% 50% / 20% 20% 20% 20%' },
  circle: { borderRadius: '50%' },
  doublecircle: { borderRadius: '50%' },
  diamond: { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  hexagon: { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  odd: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 12% 50%)' },
  trapezoid: { clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' },
  inv_trapezoid: { clipPath: 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)' },
  lean_right: { clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)' },
  lean_left: { clipPath: 'polygon(0% 0%, 80% 0%, 100% 100%, 20% 100%)' },
}

function shapeStyle(shape: string): ShapeStyle {
  return SHAPE_STYLES[shape] ?? SHAPE_STYLES[DEFAULT_SHAPE]
}

/** pt-BR accessible name of the shape (FR-012), surfaced on the node itself — not just in the properties panel's selector. */
function shapeAccessibleName(shape: string): string {
  const names = strings.shapeNames as Record<string, string>
  return names[shape] ?? names[DEFAULT_SHAPE]
}

/**
 * Rename is driven entirely by CanvasPanel's centralized keydown state (see
 * its onKeyDown comment) rather than a real focusable <input> here: React
 * Flow repeatedly re-asserts DOM focus on its own node wrapper, so a child
 * input can never reliably win or keep focus after the initial keystroke.
 */
export function FlowNode({ data }: NodeProps) {
  const { label, shape, isConnectSource, isEditing, editDraft } = data as FlowNodeData
  const resolvedShape = shape ?? DEFAULT_SHAPE

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
      // node-selected (FR-002c) is toggled imperatively by CanvasPanel, not
      // from `data` — this array must stay independent of `selection` so a
      // just-focused node/edge is never dropped by a React Flow re-render
      // triggered by selecting it (see CanvasPanel's nodes/edges useMemo).
      className={`node-shape flex h-full w-full items-center justify-center border px-4 py-2 text-center text-sm shadow-sm ${
        isConnectSource ? 'border-primary ring-2 ring-primary' : 'border-input bg-background'
      } ${resolvedShape === 'subroutine' ? 'shadow-[inset_5px_0_0_-3px_currentColor,inset_-5px_0_0_-3px_currentColor]' : ''} ${
        resolvedShape === 'doublecircle' ? 'shadow-[inset_0_0_0_3px_hsl(var(--background)),inset_0_0_0_5px_currentColor]' : ''
      }`}
      style={shapeStyle(resolvedShape)}
      aria-label={label}
      aria-roledescription={shapeAccessibleName(resolvedShape)}
      data-connect-source={isConnectSource ? 'true' : undefined}
      data-shape={resolvedShape}
    >
      <Handle type="target" position={Position.Top} />
      {label}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default FlowNode
