import { useEffect } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { starterWasSeeded } from '@/starter/seed'
import { strings } from '@/strings'

/**
 * Post-mount effect so the live region transitions from empty to the
 * seeding message (FR-017a, Decisão I-bis) — a region born filled is never
 * spoken by assistive tech.
 */
export function StarterAnnouncer() {
  const announce = useEditorStore((state) => state.announce)

  useEffect(() => {
    if (starterWasSeeded()) announce(strings.starter.seeded)
  }, [announce])

  return null
}

export default StarterAnnouncer
