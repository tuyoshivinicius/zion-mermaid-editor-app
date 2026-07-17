import { describe, expect, it, beforeEach } from 'vitest'
import { useEditorStore } from '@/state/editorStore'
import { createEmptyModel } from '@/core/model/types'
import { addNode, connect } from '@/core/model/mutations'
import { generate } from '@/core/generator'

function resetStore() {
  const model = createEmptyModel()
  useEditorStore.setState({
    model,
    lastValidModel: model,
    editorText: generate(model),
    status: 'ok',
    announcement: null,
    connectMode: false,
    connectSourceId: null,
    selection: null,
  })
}

describe('SE — selection (UI-only, ephemeral)', () => {
  beforeEach(() => {
    resetStore()
  })

  it('SE1 — selectNode/selectEdge set a single selection; clearSelection returns to null', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    useEditorStore.setState({ model, lastValidModel: model })

    useEditorStore.getState().selectNode('a')
    expect(useEditorStore.getState().selection).toEqual({ kind: 'node', id: 'a' })

    useEditorStore.getState().selectEdge(model.edges[0].id)
    expect(useEditorStore.getState().selection).toEqual({ kind: 'edge', id: model.edges[0].id })

    useEditorStore.getState().clearSelection()
    expect(useEditorStore.getState().selection).toBeNull()
  })

  it('SE5 — reconcileSelection discards a node selection whose id no longer exists in the model (FR-002a)', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    useEditorStore.setState({ model, lastValidModel: model })
    useEditorStore.getState().selectNode('a')

    useEditorStore.getState().removeNode('a')
    useEditorStore.getState().reconcileSelection()

    expect(useEditorStore.getState().selection).toBeNull()
  })

  it('SE5 — reconcileSelection discards an edge selection whose id no longer exists in the model', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    useEditorStore.setState({ model, lastValidModel: model })
    const edgeId = model.edges[0].id
    useEditorStore.getState().selectEdge(edgeId)

    useEditorStore.getState().removeEdge(edgeId)
    useEditorStore.getState().reconcileSelection()

    expect(useEditorStore.getState().selection).toBeNull()
  })

  it('SE5 — reconcileSelection is a no-op when the selected element still exists', () => {
    const model = addNode(createEmptyModel(), 'A')
    useEditorStore.setState({ model, lastValidModel: model })
    useEditorStore.getState().selectNode('a')

    useEditorStore.getState().reconcileSelection()

    expect(useEditorStore.getState().selection).toEqual({ kind: 'node', id: 'a' })
  })

  it('FR-013 — toggleConnectMode zeroes selection in the same set that zeroes connectSourceId', () => {
    const model = addNode(createEmptyModel(), 'A')
    useEditorStore.setState({ model, lastValidModel: model })
    useEditorStore.getState().selectNode('a')

    useEditorStore.getState().toggleConnectMode()

    expect(useEditorStore.getState().selection).toBeNull()
    expect(useEditorStore.getState().connectSourceId).toBeNull()
  })

  it('SC-009/SE6 — selecting different elements of the same diagram produces byte-identical generated text', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    useEditorStore.setState({ model, lastValidModel: model, editorText: generate(model) })

    const textBeforeSelection = useEditorStore.getState().editorText

    useEditorStore.getState().selectNode('a')
    expect(useEditorStore.getState().editorText).toBe(textBeforeSelection)

    useEditorStore.getState().selectEdge(model.edges[0].id)
    expect(useEditorStore.getState().editorText).toBe(textBeforeSelection)

    useEditorStore.getState().clearSelection()
    expect(useEditorStore.getState().editorText).toBe(textBeforeSelection)
  })
})
