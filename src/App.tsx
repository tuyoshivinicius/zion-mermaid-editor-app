import { useEffect } from 'react'
import { CodePanel } from '@/components/CodePanel'
import { CanvasPanel } from '@/components/CanvasPanel'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { StatusRegion } from '@/components/StatusRegion'
import { Toolbar } from '@/components/Toolbar'
import { StarterAnnouncer } from '@/components/StarterAnnouncer'
import { useEditorStore } from '@/state/editorStore'

function App() {
  const model = useEditorStore((state) => state.model)
  const reconcileSelection = useEditorStore((state) => state.reconcileSelection)

  // Derived, not commanded (FR-002a): discards the selection whenever its id
  // stops existing in the model — rename, remove, S1 clear, or reinterpreted
  // text — without redefining any of those write paths (Decisão M-store).
  useEffect(() => {
    reconcileSelection()
  }, [model, reconcileSelection])

  return (
    <div className="flex h-screen w-screen">
      <div className="w-1/2 border-r border-border">
        <CodePanel />
      </div>
      <div className="flex w-1/2 flex-col">
        <Toolbar />
        <div className="flex-1">
          <CanvasPanel />
        </div>
        <PropertiesPanel />
      </div>
      <StatusRegion />
      <StarterAnnouncer />
    </div>
  )
}

export default App
