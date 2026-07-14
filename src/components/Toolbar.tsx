import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/state/editorStore'
import { strings } from '@/strings'

export function Toolbar() {
  const [label, setLabel] = useState('')
  const addNode = useEditorStore((state) => state.addNode)
  const connectMode = useEditorStore((state) => state.connectMode)
  const toggleConnectMode = useEditorStore((state) => state.toggleConnectMode)

  function handleAdd() {
    const trimmed = label.trim()
    if (!trimmed) return
    addNode(trimmed)
    setLabel('')
  }

  return (
    <div className="flex items-center gap-2 border-b border-border p-2" data-testid="toolbar">
      <input
        data-testid="new-node-label"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={strings.toolbar.newNodeLabelPlaceholder}
        aria-label={strings.toolbar.newNodeLabelPlaceholder}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') handleAdd()
        }}
      />
      <Button type="button" onClick={handleAdd} data-testid="add-node-button">
        {strings.toolbar.addNodeButton}
      </Button>
      <Button
        type="button"
        variant={connectMode ? 'default' : 'outline'}
        aria-pressed={connectMode}
        onClick={toggleConnectMode}
        data-testid="connect-mode-button"
      >
        {strings.toolbar.connectModeButton}
      </Button>
    </div>
  )
}

export default Toolbar
