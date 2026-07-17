import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { useEditorStore } from '@/state/editorStore'
import { createEmptyModel } from '@/core/model/types'
import { addNode, connect } from '@/core/model/mutations'
import { generate } from '@/core/generator'
import { strings } from '@/strings'
import { SHAPE_DELIMITERS } from '@/core/model/shapes'

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

describe('PP1/PP2 — PropertiesPanel neutral state (FR-003/FR-003a/SC-013)', () => {
  beforeEach(() => {
    resetStore()
  })

  it('shows a neutral state when nothing is selected', () => {
    render(<PropertiesPanel />)

    expect(screen.getByText(strings.propertiesPanel.neutral)).toBeInTheDocument()
    expect(screen.queryByLabelText(strings.propertiesPanel.labelFieldLabel)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(strings.propertiesPanel.shapeFieldLabel)).not.toBeInTheDocument()
  })

  it('is not a template-choice surface — no starter/template offering appears', () => {
    render(<PropertiesPanel />)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('PP3 — PropertiesPanel edge label editing (FR-004/004a/004b)', () => {
  beforeEach(() => {
    resetStore()
  })

  function selectFirstEdge() {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    useEditorStore.setState({ model, lastValidModel: model, editorText: generate(model) })
    useEditorStore.getState().selectEdge(model.edges[0].id)
    return model
  }

  it('shows an empty field when the selected edge has no label yet', () => {
    selectFirstEdge()
    render(<PropertiesPanel />)

    const input = screen.getByLabelText(strings.propertiesPanel.labelFieldLabel) as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('shows the current label when the selected edge already has one', () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    model = { ...model, edges: [{ ...model.edges[0], label: 'Sim' }] }
    useEditorStore.setState({ model, lastValidModel: model, editorText: generate(model) })
    useEditorStore.getState().selectEdge(model.edges[0].id)

    render(<PropertiesPanel />)

    const input = screen.getByLabelText(strings.propertiesPanel.labelFieldLabel) as HTMLInputElement
    expect(input.value).toBe('Sim')
  })

  it('typing a label rewrites exactly the edge line in editorText (≤ same tick, no debounce)', async () => {
    const user = userEvent.setup()
    selectFirstEdge()
    render(<PropertiesPanel />)

    const input = screen.getByLabelText(strings.propertiesPanel.labelFieldLabel)
    await user.type(input, 'Sim')

    expect(useEditorStore.getState().editorText).toMatch(/-->\|Sim\|/)
  })

  it('clearing the label removes the edge label (line has no |...|)', async () => {
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    model = { ...model, edges: [{ ...model.edges[0], label: 'Sim' }] }
    useEditorStore.setState({ model, lastValidModel: model, editorText: generate(model) })
    useEditorStore.getState().selectEdge(model.edges[0].id)

    const user = userEvent.setup()
    render(<PropertiesPanel />)

    const input = screen.getByLabelText(strings.propertiesPanel.labelFieldLabel)
    await user.clear(input)

    expect(useEditorStore.getState().editorText).toMatch(/a --> b/)
    expect(useEditorStore.getState().editorText).not.toMatch(/\|/)
  })
})

describe('PP4/PP5 — PropertiesPanel shape selector (FR-005/005a/012)', () => {
  beforeEach(() => {
    resetStore()
  })

  function selectFirstNode() {
    const model = addNode(createEmptyModel(), 'A')
    useEditorStore.setState({ model, lastValidModel: model, editorText: generate(model) })
    useEditorStore.getState().selectNode('a')
    return model
  }

  it('PP4/FR-005a — indicates the node\'s current shape (rect -> "Retângulo")', () => {
    selectFirstNode()
    render(<PropertiesPanel />)

    const select = screen.getByLabelText(strings.propertiesPanel.shapeFieldLabel)
    expect(select).toHaveTextContent(strings.shapeNames.rect)
  })

  it('PP4 — offers exactly the 14 shapes of SHAPE_DELIMITERS, each with a pt-BR accessible name', async () => {
    const user = userEvent.setup()
    selectFirstNode()
    render(<PropertiesPanel />)

    await user.click(screen.getByLabelText(strings.propertiesPanel.shapeFieldLabel))

    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(Object.keys(SHAPE_DELIMITERS).length)
    for (const shape of Object.keys(SHAPE_DELIMITERS)) {
      expect(screen.getByRole('option', { name: strings.shapeNames[shape as keyof typeof strings.shapeNames] })).toBeInTheDocument()
    }
  })

  it('PP4/SC-005 — choosing a shape rewrites exactly the node line (id/label and edges intact)', async () => {
    const user = userEvent.setup()
    let model = addNode(createEmptyModel(), 'A')
    model = addNode(model, 'B')
    model = connect(model, 'a', 'b')
    useEditorStore.setState({ model, lastValidModel: model, editorText: generate(model) })
    useEditorStore.getState().selectNode('a')

    render(<PropertiesPanel />)

    await user.click(screen.getByLabelText(strings.propertiesPanel.shapeFieldLabel))
    await user.click(screen.getByRole('option', { name: strings.shapeNames.diamond }))

    expect(useEditorStore.getState().model.nodes.find((n) => n.id === 'a')?.shape).toBe('diamond')
    expect(useEditorStore.getState().editorText).toMatch(/a\{A\}/)
    expect(useEditorStore.getState().editorText).toMatch(/a --> b/)
  })
})
