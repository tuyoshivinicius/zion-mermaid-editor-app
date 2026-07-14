import { useEditorStore } from '@/state/editorStore'
import { strings } from '@/strings'

const STATUS_MESSAGES: Record<'invalid' | 'unsupported-type', string> = {
  invalid: strings.status.invalid,
  'unsupported-type': strings.status.unsupportedType,
}

export function StatusRegion() {
  const status = useEditorStore((state) => state.status)
  const announcement = useEditorStore((state) => state.announcement)

  const message = announcement ?? (status === 'ok' ? '' : STATUS_MESSAGES[status])

  return (
    <div role="status" aria-live="polite" className="sr-only" data-testid="status-region">
      {message}
    </div>
  )
}

export default StatusRegion
