import { CodePanel } from '@/components/CodePanel'
import { CanvasPanel } from '@/components/CanvasPanel'
import { StatusRegion } from '@/components/StatusRegion'
import { Toolbar } from '@/components/Toolbar'
import { StarterAnnouncer } from '@/components/StarterAnnouncer'

function App() {
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
      </div>
      <StatusRegion />
      <StarterAnnouncer />
    </div>
  )
}

export default App
