import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClearAction } from '@/components/ClearAction'
import { useEditorStore } from '@/state/editorStore'
import { createEmptyModel } from '@/core/model/types'

function resetStore(editorText: string) {
  useEditorStore.setState({
    model: createEmptyModel(),
    lastValidModel: createEmptyModel(),
    editorText,
    status: 'ok',
    announcement: null,
    connectMode: false,
    connectSourceId: null,
  })
}

describe('CL6 — clear confirmation dialog accessibility (FR-016)', () => {
  beforeEach(() => {
    resetStore('flowchart TD\n  a[A] --> b[B]')
  })

  it('opens with focus inside, has an accessible name and role', async () => {
    const user = userEvent.setup()
    render(<ClearAction />)

    await user.click(screen.getByTestId('clear-button'))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveAccessibleName()
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  })

  it('Escape cancels, leaves content unchanged, and returns focus to the clear control', async () => {
    const user = userEvent.setup()
    render(<ClearAction />)

    const clearButton = screen.getByTestId('clear-button')
    await user.click(clearButton)
    await screen.findByRole('alertdialog')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(useEditorStore.getState().editorText).toBe('flowchart TD\n  a[A] --> b[B]')
    await waitFor(() => expect(document.activeElement).toBe(clearButton))
  })

  it('cancelling via the Cancel button leaves content unchanged and returns focus to the clear control', async () => {
    const user = userEvent.setup()
    render(<ClearAction />)

    const clearButton = screen.getByTestId('clear-button')
    await user.click(clearButton)
    await screen.findByRole('alertdialog')

    await user.click(screen.getByTestId('clear-dialog-cancel'))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(useEditorStore.getState().editorText).toBe('flowchart TD\n  a[A] --> b[B]')
    await waitFor(() => expect(document.activeElement).toBe(clearButton))
  })

  it('confirming clears the session and returns focus to the clear control', async () => {
    const user = userEvent.setup()
    render(<ClearAction />)

    const clearButton = screen.getByTestId('clear-button')
    await user.click(clearButton)
    await screen.findByRole('alertdialog')

    await user.click(screen.getByTestId('clear-dialog-confirm'))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(useEditorStore.getState().editorText).toBe('')
    await waitFor(() => expect(document.activeElement).toBe(clearButton))
  })
})
