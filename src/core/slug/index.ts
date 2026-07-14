const SAFE_CHARSET_FALLBACK = 'no'

// Unicode combining diacritical marks block: code points 0x0300-0x036F,
// stripped after NFD decomposition so "café"/"cafe" both transliterate to
// "cafe". Filtered by code point (not a regex range) to avoid embedding
// raw combining characters in source.
const COMBINING_MARKS_START = 0x0300
const COMBINING_MARKS_END = 0x036f

function stripCombiningMarks(input: string): string {
  return Array.from(input)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0
      return code < COMBINING_MARKS_START || code > COMBINING_MARKS_END
    })
    .join('')
}

/**
 * Transliterates a label to a safe Mermaid node-id charset: ASCII letters,
 * digits and hyphens. Accents are stripped via Unicode NFD decomposition;
 * anything else is dropped (not replaced with a placeholder), so distinct
 * labels that collapse to the same safe text still need uniqueSlug() to
 * stay distinct (FR-003).
 */
export function deriveSlug(label: string): string {
  const transliterated = stripCombiningMarks(label.normalize('NFD'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return transliterated || SAFE_CHARSET_FALLBACK
}

/**
 * Appends a deterministic numeric suffix (slug, slug-2, slug-3, ...) until
 * the result is absent from existingIds. Never merges two nodes: equal
 * labels always resolve to distinct ids (FR-003).
 */
export function uniqueSlug(baseSlug: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds)
  if (!taken.has(baseSlug)) return baseSlug

  let suffix = 2
  let candidate = `${baseSlug}-${suffix}`
  while (taken.has(candidate)) {
    suffix += 1
    candidate = `${baseSlug}-${suffix}`
  }
  return candidate
}

// Mermaid Flowchart grammar keywords that break parsing when used bare as a
// node id — most notably "end", which the parser lexes as a subgraph-closer
// token whenever it's immediately followed by "-" (so the usual "-2"
// uniqueness suffix can't be used to disambiguate it: "end-2" still breaks).
// A trailing underscore sidesteps the keyword match entirely.
const RESERVED_SLUGS = new Set(['end', 'subgraph', 'graph', 'flowchart', 'class', 'classdef', 'style', 'linkstyle', 'click'])

export function slugify(label: string, existingIds: Iterable<string>): string {
  const base = deriveSlug(label)
  const safeBase = RESERVED_SLUGS.has(base) ? `${base}_` : base
  return uniqueSlug(safeBase, existingIds)
}
