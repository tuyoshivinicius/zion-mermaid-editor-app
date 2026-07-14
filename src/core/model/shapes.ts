/**
 * Bracket delimiters for each Mermaid Flowchart node shape, shared by the
 * import ACL (shape detection) and the generator (shape emission) so both
 * sides of the round-trip agree on the same table (Principle II).
 */
export const SHAPE_DELIMITERS: Record<string, [string, string]> = {
  rect: ['[', ']'],
  round: ['(', ')'],
  stadium: ['([', '])'],
  subroutine: ['[[', ']]'],
  cylinder: ['[(', ')]'],
  circle: ['((', '))'],
  doublecircle: ['(((', ')))'],
  diamond: ['{', '}'],
  hexagon: ['{{', '}}'],
  odd: ['>', ']'],
  trapezoid: ['[/', '\\]'],
  inv_trapezoid: ['[\\', '/]'],
  lean_right: ['[/', '/]'],
  lean_left: ['[\\', '\\]'],
}

export const DEFAULT_SHAPE = 'rect'

/** Mermaid's internal parser uses 'square' for the plain-rectangle shape. */
export function normalizeImportedShape(mermaidType: string | undefined): string {
  if (!mermaidType || mermaidType === 'square') return DEFAULT_SHAPE
  return mermaidType in SHAPE_DELIMITERS ? mermaidType : DEFAULT_SHAPE
}
