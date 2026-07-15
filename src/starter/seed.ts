import { useEditorStore } from '@/state/editorStore'
import { STARTER_MODEL, STARTER_TEXT } from '@/starter/model'

/**
 * Content a future restorable-draft buffer (RN-06) could return. Nesta
 * fatia existe só como entrada da decisão: nenhum produtor real é
 * construído aqui (FR-011).
 */
export type RestorableDraft = { readonly text: string }

export interface SeedInput {
  restorableDraft: RestorableDraft | null
}

/** Pure (FR-011a): the FR-011 precedence rule lives here, not in main.tsx. */
export function shouldSeedStarter(input: SeedInput): boolean {
  return input.restorableDraft === null
}

let seeded = false

/** Effect: seeds the starter into the store when shouldSeedStarter allows it. Returns whether it seeded. */
export function seedStarter(input: SeedInput): boolean {
  seeded = shouldSeedStarter(input)
  if (seeded) {
    useEditorStore.setState({ model: STARTER_MODEL, lastValidModel: STARTER_MODEL, editorText: STARTER_TEXT })
  }
  return seeded
}

/** Post-fact read of the bootstrap result, consumed only by <StarterAnnouncer /> (FR-017a). */
export function starterWasSeeded(): boolean {
  return seeded
}
