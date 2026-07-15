import { createEmptyModel } from '@/core/model/types'
import { cancelPendingParse, useEditorStore } from '@/state/editorStore'

/** Pure string comparison against the canonical text — never reads the model (CL1/FR-007). */
export function needsClearConfirmation(editorText: string, canonicalText: string): boolean {
  return editorText !== '' && editorText !== canonicalText
}

/** Restores the integral empty state S0 nasce with, UI-only state included (CL2/CL3). */
export function clearSession(): void {
  cancelPendingParse()
  useEditorStore.setState({
    model: createEmptyModel(),
    lastValidModel: createEmptyModel(),
    editorText: '',
    status: 'ok',
    connectMode: false,
    connectSourceId: null,
  })
}
