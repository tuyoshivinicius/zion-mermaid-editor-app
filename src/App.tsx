// Tela única (ADR-001): área do diagrama | editor de código + botão copiar.
// Monta a projeção do store. É a casca do walking skeleton.

import { ReactFlowProvider } from '@xyflow/react'
import { Canvas } from './canvas/Canvas'
import { EditorCodigo } from './editor/EditorCodigo'
import { BotaoCopiar } from './editor/BotaoCopiar'

export default function App() {
  return (
    <div className="flex h-full w-full">
      <section className="h-full min-w-0 flex-1 border-r border-border" aria-label="Área do diagrama">
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </section>
      <section className="flex h-full w-[42%] min-w-[320px] flex-col" aria-label="Editor de código">
        <div className="min-h-0 flex-1">
          <EditorCodigo />
        </div>
        <div className="flex items-center justify-end border-t border-border p-2">
          <BotaoCopiar />
        </div>
      </section>
    </div>
  )
}
