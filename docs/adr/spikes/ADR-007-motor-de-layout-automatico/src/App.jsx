// As duas vistas do ADR-006, agora com o motor de layout no meio.
//
// O que muda em relação ao ADR-006: a posição deixa de ser grade fixa. E é aí
// que a decisão aparece, porque existe mais de um lugar para pendurar o layout:
//
//   motor=dagre    layout global recalculado a cada mudança do modelo
//   motor=local    layout global só na carga; nó novo entra por colocação local
//   motor=hibrido  layout global, com a posição movida à mão reimposta por cima
//
// Os três produzem o mesmo diagrama e sensações de uso diferentes. Este arquivo
// existe para medir a diferença, não para escolher com bom gosto.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, Handle, Position, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { analisar } from './parser.js'
import { serializar } from './serializar.js'
import { gerarDensoTexto } from './modelo.js'
import { projetar, limparCache, CAIXA_W, CAIXA_H } from './projecao.js'
import { colisoes, colocacaoLocal, hibrido, layoutDagre } from './layout.js'
import { aposPaint } from './medir.js'

const params = new URLSearchParams(location.search)
const num = (k, d) => (params.has(k) ? Number(params.get(k)) : d)
const txt = (k, d) => (params.has(k) ? params.get(k) : d)

const N = num('n', 0)
const ARESTAS = num('arestas', 0)
const MEMO = num('memo', 1) === 1
const MOTOR = txt('motor', 'dagre') // dagre | local | hibrido
const ORIENTACAO = txt('orientacao', 'TB')

const INICIAL =
  N > 0
    ? gerarDensoTexto(N, ARESTAS)
    : [
        'flowchart TD',
        '  a["Início"] --> b{"Decidir"}',
        '  b -->|"sim"| c["Segue"]',
        '  b -->|"não"| d["Para"]',
        '  c --> e["Fim"]',
        '  d --> e',
      ].join('\n')

// Os handles existem para a aresta ter onde ancorar — sem eles a engine não
// desenha conexão nenhuma, e uma captura de layout sem aresta não prova layout.
// Eles seguem a orientação: em LR a aresta entra pela esquerda e sai pela
// direita, que é o que faz o desenho ler como o do mermaid.
const LADOS = {
  TB: [Position.Top, Position.Bottom],
  TD: [Position.Top, Position.Bottom],
  BT: [Position.Bottom, Position.Top],
  LR: [Position.Left, Position.Right],
  RL: [Position.Right, Position.Left],
}

function Caixa({ data }) {
  const [entra, sai] = LADOS[ORIENTACAO] || LADOS.TB
  return (
    <div className={'caixa' + (data.marcado ? ' marcada' : '')} style={{ width: CAIXA_W, height: CAIXA_H }}>
      <Handle type="target" position={entra} />
      <span className="rotulo">{data.rotulo}</span>
      <Handle type="source" position={sai} />
    </div>
  )
}

const TIPOS = { caixa: Caixa }

/** Reenquadra quando o diagrama muda de tamanho — serve à captura, não à medição. */
function Ajustar({ quantidade, motor }) {
  const fluxo = useReactFlow()
  useEffect(() => {
    fluxo.fitView({ duration: 0, padding: 0.12 })
  }, [quantidade, motor, fluxo])
  return null
}

export default function App() {
  const [texto, setTexto] = useState(INICIAL)
  // O que a pessoa moveu à mão. É o "conforto de sessão" do discovery virando
  // estado: vive fora do modelo e nunca chega ao código.
  const [manuais, setManuais] = useState(() => new Map())
  const inicio = useRef(null)
  const etapas = useRef({ parse: 0, layout: 0, projecao: 0 })
  const posicoesRef = useRef(new Map())

  const { modelo, erros, avisos } = useMemo(() => {
    const t0 = performance.now()
    const r = analisar(texto)
    etapas.current.parse = performance.now() - t0
    return r
  }, [texto])

  const posicoes = useMemo(() => {
    const t0 = performance.now()
    const anteriores = posicoesRef.current
    let saida

    if (MOTOR === 'local' && anteriores.size) {
      // Nó que já tinha posição mantém a posição; nó novo entra ao lado de quem
      // o criou. Nenhum motor roda.
      saida = new Map(anteriores)
      const conhecidos = new Set(anteriores.keys())
      for (const n of modelo.nos) {
        if (conhecidos.has(n.id)) continue
        const origem = modelo.conexoes.find((c) => c.para === n.id && conhecidos.has(c.de))
        saida = colocacaoLocal(saida, origem ? origem.de : modelo.nos[0].id, n.id, {
          orientacao: ORIENTACAO,
        }).posicoes
      }
      for (const id of [...saida.keys()]) {
        if (!modelo.nos.some((n) => n.id === id)) saida.delete(id)
      }
    } else {
      saida = layoutDagre(modelo, { orientacao: ORIENTACAO }).posicoes
    }

    if (MOTOR === 'hibrido' && manuais.size) saida = hibrido(saida, manuais)
    if (MOTOR === 'local' && manuais.size) saida = hibrido(saida, manuais)

    etapas.current.layout = performance.now() - t0
    posicoesRef.current = saida
    return saida
  }, [modelo, manuais])

  const { nodes, edges } = useMemo(() => {
    const t0 = performance.now()
    const r = projetar(modelo, posicoes, MEMO)
    etapas.current.projecao = performance.now() - t0
    return r
  }, [modelo, posicoes])

  const codigoCanonico = useMemo(() => serializar(modelo), [modelo])

  const aoDigitar = useCallback((e) => {
    inicio.current = performance.now()
    setTexto(e.target.value)
  }, [])

  /** Arrastar é o gesto que cria posição manual. */
  const aoMover = useCallback((_, no) => {
    setManuais((m) => new Map(m).set(no.id, { x: no.position.x, y: no.position.y }))
  }, [])

  useEffect(() => {
    if (inicio.current == null) return
    const t0 = inicio.current
    inicio.current = null
    const { parse, layout, projecao } = etapas.current
    aposPaint().then(() => {
      const amostra = { total: performance.now() - t0, parse, layout, projecao }
      const s = window.__spike
      s.amostras.push(amostra)
      if (s._resolver) {
        const r = s._resolver
        s._resolver = null
        r(amostra)
      }
    })
  }, [texto, nodes, edges])

  useEffect(() => {
    window.__spike = {
      ...(window.__spike || {}),
      amostras: (window.__spike && window.__spike.amostras) || [],
      cenario: { N, ARESTAS, MEMO, MOTOR, ORIENTACAO },
      modelo: () => modelo,
      texto: () => texto,
      canonico: () => codigoCanonico,
      posicoes: () => Object.fromEntries(posicoes),
      colisoes: () => colisoes(posicoes),
      contarNos: () => modelo.nos.length,
      erros: () => erros,
      avisos: () => avisos,

      /** O gesto do ciclo principal do ADR-005: criar um nó ligado a outro. */
      criarNo: (origemId, novoId) => {
        inicio.current = performance.now()
        setTexto((t) => `${t}\n  ${origemId} --> ${novoId}["Novo"]`)
      },

      /** Arrastar, sem mouse — para o braço do arranjo manual ser reprodutível. */
      moverNo: (id, x, y) => setManuais((m) => new Map(m).set(id, { x, y })),

      zerar: () => {
        window.__spike.amostras = []
      },
      limparCache,
      proximaAmostra: () => new Promise((res) => (window.__spike._resolver = res)),
      pronto: true,
    }
  }, [modelo, texto, codigoCanonico, posicoes, erros, avisos])

  return (
    <div className="tela">
      <div className="painel">
        <textarea id="codigo" value={texto} onChange={aoDigitar} spellCheck={false} />
        <div className="rodape">
          <span>
            {modelo.nos.length} nós · {modelo.conexoes.length} conexões
          </span>
          <span>
            motor <b>{MOTOR}</b> · {ORIENTACAO} · {manuais.size} movidos à mão
          </span>
        </div>
      </div>
      <div className="canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={TIPOS}
          fitView
          onNodeDragStop={aoMover}
          proOptions={{ hideAttribution: true }}
        >
          <Ajustar quantidade={nodes.length} motor={MOTOR} />
          <Background />
        </ReactFlow>
      </div>
    </div>
  )
}
