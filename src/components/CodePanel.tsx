import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/state/editorStore'
import { strings } from '@/strings'

export function CodePanel() {
  const editorText = useEditorStore((state) => state.editorText)
  const status = useEditorStore((state) => state.status)
  const setEditorText = useEditorStore((state) => state.setEditorText)
  const announce = useEditorStore((state) => state.announce)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(editorText)
      announce(strings.copy.success)
    } catch {
      // Fallback (FR-005): keep the text selectable for manual copy.
      textareaRef.current?.select()
      announce(strings.copy.failure)
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-2 p-2">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={handleCopy} data-testid="copy-button">
          {strings.copy.button}
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        data-testid="code-input"
        className="h-full w-full flex-1 resize-none rounded-md border border-input bg-background p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={editorText}
        onChange={(event) => setEditorText(event.target.value)}
        aria-label={strings.codePanel.ariaLabel}
        spellCheck={false}
      />
      {status === 'invalid' && (
        <p className="text-sm text-destructive" data-testid="invalid-indicator">
          {strings.status.invalid}
        </p>
      )}
      {status === 'unsupported-type' && (
        <p className="text-sm text-destructive" data-testid="unsupported-type-indicator">
          {strings.status.unsupportedType}
        </p>
      )}
    </div>
  )
}

export default CodePanel
