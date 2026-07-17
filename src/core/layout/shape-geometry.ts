import { DEFAULT_SHAPE } from '@/core/model/shapes'

export interface ShapeSize {
  width: number
  height: number
}

/**
 * Pure, deterministic per-shape box for legibility (FR-006a). Ephemeral —
 * consumed by layout/index.ts (dagre) and CanvasPanel (React Flow node
 * style), never by generator/ or mermaid-acl/ (Principle V / SH4, enforced
 * by tests/contract/no-coordinates.test.ts).
 */
const SHAPE_SIZES: Record<string, ShapeSize> = {
  rect: { width: 172, height: 40 },
  round: { width: 172, height: 40 },
  stadium: { width: 180, height: 44 },
  subroutine: { width: 180, height: 40 },
  cylinder: { width: 172, height: 70 },
  circle: { width: 100, height: 100 },
  doublecircle: { width: 120, height: 120 },
  diamond: { width: 180, height: 110 },
  hexagon: { width: 190, height: 70 },
  odd: { width: 180, height: 50 },
  trapezoid: { width: 190, height: 56 },
  inv_trapezoid: { width: 190, height: 56 },
  lean_right: { width: 190, height: 50 },
  lean_left: { width: 190, height: 50 },
}

// A fresh object every call: dagre's graphlib mutates whatever object
// graph.setNode() is given (adding computed rank/order/x/y) — sharing one
// object across every node of the same shape would let one node's computed
// position leak into every other node sharing that reference.
export function shapeSize(shape: string): ShapeSize {
  const size = SHAPE_SIZES[shape] ?? SHAPE_SIZES[DEFAULT_SHAPE]
  return { ...size }
}
