import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ConnectionMode,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  modeloInicial,
  novoId,
  inserirMensagem,
  moverMensagem as moverNoModelo,
  reconectarMensagem,
  moverParticipante,
} from './model.js'
import { derivar, COL_W } from './layout.js'
import { ParticipanteNode, FragmentoNode } from './nos.jsx'
import { MensagemEdge } from './arestas.jsx'
import { AcoesContext } from './acoes.js'

const tiposDeNo = { participante: ParticipanteNode, fragmento: FragmentoNode }
const tiposDeAresta = { mensagem: MensagemEdge }

function Spike() {
  const [modelo, setModelo] = useState(modeloInicial)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Modelo -> vista. Toda mudança do modelo re-deriva a coordenada.
  const derivado = useMemo(() => derivar(modelo), [modelo])
  useEffect(() => {
    setNodes(derivado.nodes)
    setEdges(derivado.edges)
  }, [derivado, setNodes, setEdges])

  // Sonda para o verificador headless ler a verdade sem passar pelo DOM.
  useEffect(() => {
    window.__spike = {
      ...(window.__spike ?? {}),
      modelo,
      ordem: modelo.messages.map((m) => `${m.from}>${m.to}:${m.label}`),
    }
  }, [modelo])

  // Diário de callbacks da engine: mostra QUAL gesto a lib reconheceu.
  const anotar = useCallback((evento, detalhe) => {
    window.__spike = window.__spike ?? {}
    window.__spike.diario = [...(window.__spike.diario ?? []), { evento, detalhe }]
  }, [])

  // A engine dá drag livre em 2D; participante só se move na horizontal.
  // Trava feita à mão, filtrando os changes.
  const aoMudarNos = useCallback(
    (changes) => {
      onNodesChange(
        changes.map((c) =>
          c.type === 'position' && c.position ? { ...c, position: { ...c.position, y: 0 } } : c,
        ),
      )
    },
    [onNodesChange],
  )

  const aoSoltarNo = useCallback(
    (_e, no) => {
      if (no.type !== 'participante') return
      anotar('onNodeDragStop', `${no.id} x=${Math.round(no.position.x)}`)
      setModelo((m) => moverParticipante(m, no.id, Math.round(no.position.x / COL_W)))
    },
    [anotar],
  )

  // Criar mensagem: arrastar de uma âncora de instante para outro participante.
  const aoConectar = useCallback(
    (c) => {
      anotar('onConnect', `${c.source}[${c.sourceHandle}] -> ${c.target}[${c.targetHandle}]`)
      if (!c.sourceHandle) return
      const instante = Number(c.sourceHandle.split('-')[1])
      setModelo((m) =>
        inserirMensagem(m, instante, {
          id: novoId('m'),
          from: c.source,
          to: c.target,
          label: 'nova mensagem',
          arrow: c.source === c.target ? 'self' : 'solid',
        }),
      )
    },
    [anotar],
  )

  // Reconectar destino/origem: gesto nativo da engine (onReconnect).
  const aoReconectar = useCallback(
    (antiga, nova) => {
      anotar('onReconnect', `${antiga.id}: ${antiga.source}->${antiga.target} vira ${nova.source}->${nova.target}`)
      setModelo((m) =>
        reconectarMensagem(m, antiga.id, {
          from: nova.source !== antiga.source ? nova.source : undefined,
          to: nova.target !== antiga.target ? nova.target : undefined,
        }),
      )
    },
    [anotar],
  )

  const acoes = useMemo(
    () => ({
      moverMensagem: (id, alvo) => {
        anotar('rotulo:arrastar', `${id} -> instante ${alvo}`)
        setModelo((m) => moverNoModelo(m, id, alvo))
      },
    }),
    [anotar],
  )

  return (
    <AcoesContext.Provider value={acoes}>
      <div className="app">
        <header>
          <strong>Spike ADR-002</strong> — Sequence no vocabulário nó/aresta do React Flow
          <span className="dica">
            arraste do ponto da lifeline p/ criar · arraste o rótulo p/ reordenar no tempo · arraste
            a ponta da seta p/ reconectar · arraste o participante p/ trocar de coluna
          </span>
        </header>
        <div className="palco">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={tiposDeNo}
            edgeTypes={tiposDeAresta}
            onNodesChange={aoMudarNos}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={aoSoltarNo}
            onConnect={aoConectar}
            onConnectStart={(_e, p) => anotar('onConnectStart', `${p.nodeId}[${p.handleId}]`)}
            onConnectEnd={() => anotar('onConnectEnd', '')}
            onReconnect={aoReconectar}
            onReconnectStart={(_e, edge) => anotar('onReconnectStart', edge.id)}
            onReconnectEnd={(_e, edge) => anotar('onReconnectEnd', edge.id)}
            connectionMode={ConnectionMode.Loose}
            connectionRadius={28}
            reconnectRadius={16}
            nodesConnectable
            elevateEdgesOnSelect
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} color="#e2e8f0" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <aside data-testid="modelo">
          <h2>modelo interno (sem coordenada)</h2>
          <ol>
            {modelo.messages.map((m) => (
              <li key={m.id}>
                <code>
                  {m.from} {m.arrow === 'dashed' ? '-->>' : '->>'} {m.to}: {m.label}
                </code>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </AcoesContext.Provider>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Spike />
    </ReactFlowProvider>
  )
}
