import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useEditorStore } from '@/state/editorStore'
import { createEmptyModel } from '@/core/model/types'
import { StatusRegion } from '@/components/StatusRegion'
import { StarterAnnouncer } from '@/components/StarterAnnouncer'
import { seedStarter } from '@/starter/seed'
import { strings } from '@/strings'

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

describe('SC-013 — seeding announcement transitions the live region (Decisão I-bis)', () => {
  beforeEach(() => {
    resetStore()
  })

  it('does not contain the seeding message before StarterAnnouncer mounts, and does contain it after', () => {
    seedStarter({ restorableDraft: null })

    const { rerender } = render(<StatusRegion />)
    expect(screen.getByTestId('status-region')).not.toHaveTextContent(strings.starter.seeded)

    rerender(
      <>
        <StatusRegion />
        <StarterAnnouncer />
      </>,
    )

    expect(screen.getByTestId('status-region')).toHaveTextContent(strings.starter.seeded)
  })

  it('does not announce when the starter was not seeded', () => {
    seedStarter({ restorableDraft: { text: 'x' } })

    render(
      <>
        <StatusRegion />
        <StarterAnnouncer />
      </>,
    )

    expect(screen.getByTestId('status-region')).not.toHaveTextContent(strings.starter.seeded)
  })
})
