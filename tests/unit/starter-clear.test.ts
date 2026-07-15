import { describe, expect, it, beforeEach, vi } from 'vitest'
import { needsClearConfirmation, clearSession } from '@/starter/clear'
import { useEditorStore } from '@/state/editorStore'
import { createEmptyModel } from '@/core/model/types'
import { STARTER_MODEL, STARTER_TEXT } from '@/starter/model'

function resetStore() {
  useEditorStore.setState({
    model: createEmptyModel(),
    lastValidModel: createEmptyModel(),
    editorText: '',
    status: 'ok',
    announcement: null,
    connectMode: false,
    connectSourceId: null,
  })
}

describe('CL1 — pure predicate over the TEXT (FR-007)', () => {
  it('needs no confirmation when the starter is untouched (editorText === canonical)', () => {
    expect(needsClearConfirmation(STARTER_TEXT, STARTER_TEXT)).toBe(false)
  })

  it('needs confirmation for non-parseable text typed over the starter', () => {
    expect(needsClearConfirmation('not mermaid at all !!', STARTER_TEXT)).toBe(true)
  })

  it('needs confirmation for valid-but-non-canonical text (comments, declaration order)', () => {
    const validButDifferent = 'flowchart TD\n  %% comment\n  a[A] --> b[B]'
    expect(needsClearConfirmation(validButDifferent, STARTER_TEXT)).toBe(true)
  })

  it('needs no confirmation when the panel is empty', () => {
    expect(needsClearConfirmation('', STARTER_TEXT)).toBe(false)
  })

  it('needs confirmation when the text differs from a canonical form that is itself non-empty', () => {
    expect(needsClearConfirmation('x', 'y')).toBe(true)
  })
})

describe('CL2 — clearSession restores the integral empty state (FR-006/FR-006a)', () => {
  beforeEach(() => {
    resetStore()
  })

  it('restores model, lastValidModel, editorText, status, connectMode and connectSourceId', () => {
    useEditorStore.setState({
      model: STARTER_MODEL,
      lastValidModel: STARTER_MODEL,
      editorText: STARTER_TEXT,
      status: 'invalid',
      connectMode: true,
      connectSourceId: 'inicio',
    })

    clearSession()

    const state = useEditorStore.getState()
    expect(state.model).toEqual(createEmptyModel())
    expect(state.lastValidModel).toEqual(createEmptyModel())
    expect(state.editorText).toBe('')
    expect(state.status).toBe('ok')
    expect(state.connectMode).toBe(false)
    expect(state.connectSourceId).toBeNull()
  })
})

describe('CL4 — in-flight parse cancelled at the source (FR-006b)', () => {
  beforeEach(() => {
    resetStore()
    vi.useFakeTimers()
  })

  it('a parse armed before clearing does not repopulate the model after the debounce window elapses', async () => {
    useEditorStore.getState().setEditorText('flowchart TD\n  a[A] --> b[B]')

    clearSession()

    await vi.advanceTimersByTimeAsync(200)

    const state = useEditorStore.getState()
    expect(state.model).toEqual(createEmptyModel())
    expect(state.lastValidModel).toEqual(createEmptyModel())
    expect(state.editorText).toBe('')

    vi.useRealTimers()
  })
})
