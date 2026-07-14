import { create } from 'zustand'
import { createEmptyModel, type GraphModel } from '@/core/model/types'
import { importFlowchart } from '@/core/mermaid-acl'
import * as mutations from '@/core/model/mutations'
import { generate } from '@/core/generator'

export type EditorStatus = 'ok' | 'invalid' | 'unsupported-type'

// Decisão C: orçamento de debounce ≤ 80ms dentro do teto de 150ms p95.
const INPUT_DEBOUNCE_MS = 80

export interface EditorState {
  /** Canonical graph model — single source of truth (data-model.md). */
  model: GraphModel
  /** Transitory textarea overlay; may diverge from `model` while invalid (FR-012). */
  editorText: string
  /** Last model that successfully parsed/mutated, kept when editorText is invalid. */
  lastValidModel: GraphModel
  status: EditorStatus
  /** Transient announcement (e.g. copy result) that overrides the status message briefly. */
  announcement: string | null
  /** UI-only (never serialized): toolbar "modo conectar" state (FR-014/Decisão E). */
  connectMode: boolean
  connectSourceId: string | null
  /**
   * Origin = text: user input → debounce → parse. Rewrites editorText
   * immediately (so typing stays responsive) and applies the parsed model
   * asynchronously once the debounce settles (Decisão B).
   */
  setEditorText: (text: string) => void
  announce: (message: string) => void
  /** Origin = canvas: pure mutation → generate → editorText (Decisão B). */
  addNode: (label: string) => void
  renameNode: (id: string, newLabel: string) => void
  removeNode: (id: string) => void
  removeEdge: (id: string) => void
  connectNodes: (sourceId: string, targetId: string) => void
  toggleConnectMode: () => void
  /** Click handler for connect-mode: 1st call sets the source, 2nd call (different node) connects and exits the mode. */
  handleConnectClick: (nodeId: string) => void
}

const ANNOUNCEMENT_TIMEOUT_MS = 3000
let announcementTimer: ReturnType<typeof setTimeout> | undefined

let debounceTimer: ReturnType<typeof setTimeout> | undefined

async function applyParsedText(text: string, set: (partial: Partial<EditorState>) => void) {
  const result = await importFlowchart(text)
  if (result.ok) {
    set({ model: result.model, lastValidModel: result.model, status: 'ok' })
  } else {
    set({ status: result.reason })
  }
}

/**
 * Applies a pure model mutation and rewrites editorText from the result.
 * Writes editorText directly (never through setEditorText/debounce), so
 * this can never re-enter the text→model parse path (Decisão B anti-loop).
 */
function applyMutation(
  mutate: (model: GraphModel) => GraphModel,
  set: (partial: Partial<EditorState>) => void,
  get: () => EditorState,
) {
  const nextModel = mutate(get().model)
  const nextText = generate(nextModel)
  set({
    model: nextModel,
    lastValidModel: nextModel,
    status: 'ok',
    ...(nextText === get().editorText ? {} : { editorText: nextText }),
  })
}

export const useEditorStore = create<EditorState>((set, get) => ({
  model: createEmptyModel(),
  editorText: '',
  lastValidModel: createEmptyModel(),
  status: 'ok',
  announcement: null,
  connectMode: false,
  connectSourceId: null,
  setEditorText: (text) => {
    set({ editorText: text })
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      void applyParsedText(text, set)
    }, INPUT_DEBOUNCE_MS)
  },
  announce: (message) => {
    set({ announcement: message })
    if (announcementTimer) clearTimeout(announcementTimer)
    announcementTimer = setTimeout(() => set({ announcement: null }), ANNOUNCEMENT_TIMEOUT_MS)
  },
  addNode: (label) => applyMutation((m) => mutations.addNode(m, label), set, get),
  renameNode: (id, newLabel) => applyMutation((m) => mutations.renameNode(m, id, newLabel), set, get),
  removeNode: (id) => applyMutation((m) => mutations.removeNode(m, id), set, get),
  removeEdge: (id) => applyMutation((m) => mutations.removeEdge(m, id), set, get),
  connectNodes: (sourceId, targetId) => applyMutation((m) => mutations.connect(m, sourceId, targetId), set, get),
  toggleConnectMode: () => set((state) => ({ connectMode: !state.connectMode, connectSourceId: null })),
  handleConnectClick: (nodeId) => {
    const { connectMode, connectSourceId, connectNodes } = get()
    if (!connectMode) return
    if (!connectSourceId) {
      set({ connectSourceId: nodeId })
      return
    }
    if (connectSourceId !== nodeId) {
      connectNodes(connectSourceId, nodeId)
    }
    set({ connectMode: false, connectSourceId: null })
  },
}))

// Exposed for tests that need to await the debounced parse without a timer mock.
export function _flushEditorTextForTests(): Promise<void> {
  const { editorText } = useEditorStore.getState()
  if (debounceTimer) clearTimeout(debounceTimer)
  return applyParsedText(editorText, useEditorStore.setState)
}
