import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { gerarDenso, serializar, vazio } from './modelo.js'
import { CAIXA_W, CAIXA_H, posicaoDoIndice, projetar } from './projecao.js'
import { alvoDeFoco, estadoInicial, reduzir } from './teclado.js'
import { CaixaNode, Despacho } from './nos.jsx'
import { ArestaRotulada } from './arestas.jsx'
import { aposPaint } from './medir.js'

const nodeTypes = { caixa: CaixaNode }
const edgeTypes = { rotulada: ArestaRotulada }

function lerCfg() {
  const q = new URLSearchParams(location.search)
  const num = (k, padrao) => (q.has(k) ? Number(q.get(k)) : padrao)
  return {
    n: num('n', 0), // diagrama denso pré-fabricado (0 = começa vazio)
    arestas: num('arestas', 0),
    memo: num('memo', 1) === 1, // reuso do objeto de nó (invariante do ADR-004)
    a11y: num('a11y', 0) === 1, // teclado nativo da engine LIGADO (braço de conflito)
    rot: num('rot', 1), // desenho da aresta: 1 própria · 0 embutida · 2 híbrida
    cam: num('cam', 0) === 1, // a câmera acompanha o elemento que o teclado criou
  }
}

const cfg = lerCfg()

// As teclas que a máquina de estados consome. Fora desta lista, a tecla é do
// navegador (ou do input, quando o foco está num rótulo).
const CONTROLE = new Set([
  'n',
  'c',
  'Enter',
  'Escape',
  'Delete',
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

export default function App() {
  const [estado, despachar] = useReducer(
    reduzir,
    cfg.n ? gerarDenso(cfg.n, cfg.arestas) : vazio(),
    estadoInicial,
  )

  const { nodes, edges } = useMemo(
    () =>
      projetar(estado.modelo, cfg.memo, {
        noEditando: estado.noEditando,
        conexaoEditando: estado.conexaoEditando,
        noFocado: estado.noFocado,
        alvo: estado.alvo,
      },
      cfg.rot),
    [estado],
  )

  const codigo = useMemo(() => serializar(estado.modelo), [estado.modelo])

  // Diário: qual callback da engine disparou. É o que separa "a lib entregou
  // esse gesto" de "eu escrevi esse gesto" — mesmo protocolo do spike ADR-002.
  const diario = useRef([])
  const anotar = useCallback((nome) => diario.current.push(nome), [])

  const latencias = useRef([])
  const estadoRef = useRef(estado)
  estadoRef.current = estado

  // Todo caminho de teclado é cronometrado do keydown até depois do paint —
  // tecla de controle e tecla de texto, que é a mais frequente das duas.
  const despacharMedido = useCallback(async (acao) => {
    const t0 = performance.now()
    despachar(acao)
    await aposPaint()
    latencias.current.push({ tipo: acao.tipo, ms: performance.now() - t0 })
  }, [])

  // O único ouvinte de teclado do produto. Fica em `capture` no window para
  // enxergar a tecla antes de a engine reagir a ela.
  useEffect(() => {
    const aoTeclar = (ev) => {
      const alvo = ev.target
      const ehInput = alvo && alvo.tagName === 'INPUT'
      const k = ev.key

      // Dentro de um rótulo em edição, só Enter e Escape são do produto; o resto
      // é texto e tem que chegar intacto ao input.
      if (ehInput && k !== 'Enter' && k !== 'Escape') return
      if (!CONTROLE.has(k)) return

      ev.preventDefault()
      ev.stopPropagation()
      despacharMedido({ tipo: 'tecla', key: k })
    }
    window.addEventListener('keydown', aoTeclar, true)
    return () => window.removeEventListener('keydown', aoTeclar, true)
  }, [despacharMedido])

  // O foco do DOM segue o estado da máquina. Sem isto o ciclo por teclado morre
  // no primeiro elemento: a engine não move foco por conta própria.
  //
  // O `perseguir` não é zelo: a engine monta o nó num commit **posterior** ao da
  // mudança do modelo (ela mede o container antes de renderizar filhos). No
  // commit em que o estado diz "edite o rótulo de n7", o input de n7 ainda não
  // existe no DOM — e como a mudança está dentro da engine, nenhuma dependência
  // de efeito nossa acorda depois. Só sobra tentar de novo por frame.
  const alvo = alvoDeFoco(estado)
  const tentativas = useRef(0)
  useEffect(() => {
    let vivo = true
    let n = 0
    const perseguir = () => {
      if (!vivo) return
      const el = document.querySelector(`[data-foco="${alvo}"]`)
      if (el) {
        if (document.activeElement !== el) el.focus({ preventScroll: true })
        tentativas.current = Math.max(tentativas.current, n)
        return
      }
      if (n++ < 10) requestAnimationFrame(perseguir)
    }
    perseguir()
    return () => {
      vivo = false
    }
  }, [alvo, nodes, edges])

  // A câmera não vem de graça: a engine posiciona o que recebe e não tem noção
  // de "traga o elemento novo para a tela". O braço `cam=1` mede o contorno,
  // que é a API pública `setCenter` chamada pelo produto a cada troca de foco.
  useEffect(() => {
    if (!cfg.cam || !window.__rf) return
    const i = estadoRef.current.modelo.nos.findIndex((n) => n.id === estado.noFocado)
    if (i < 0) return
    const p = posicaoDoIndice(i)
    window.__rf.setCenter(p.x + CAIXA_W / 2, p.y + CAIXA_H / 2, {
      zoom: window.__rf.getZoom(),
      duration: 0,
    })
  }, [estado.noFocado])

  useEffect(() => {
    window.__spike = {
      cfg,
      pronto: true,
      modelo: () => estadoRef.current.modelo,
      estado: () => ({
        modo: estadoRef.current.modo,
        noFocado: estadoRef.current.noFocado,
        noEditando: estadoRef.current.noEditando,
        conexaoEditando: estadoRef.current.conexaoEditando,
        alvo: estadoRef.current.alvo,
      }),
      codigo: () => serializar(estadoRef.current.modelo),
      diario: () => diario.current.slice(),
      limparDiario: () => (diario.current = []),
      latencias: () => latencias.current.slice(),
      limparLatencias: () => (latencias.current = []),

      /** Onde o foco do DOM está, na linguagem da máquina de estados. */
      foco: () => document.activeElement?.getAttribute?.('data-foco') ?? null,

      /** Quantos frames o foco teve que esperar o DOM que a engine monta. */
      framesDeEsperaDoFoco: () => tentativas.current,

      /** A verdade não pode ter ganho coordenada (disciplina do ADR-003). */
      coordenadaVazou: () => {
        const t = JSON.stringify(estadoRef.current.modelo)
        return /"x"\s*:|"y"\s*:|"position"/.test(t)
      },

      /** O nó nasceu onde a pessoa consegue ver? A câmera não é do teclado. */
      dentroDaViewport: (id) => {
        const el = document.querySelector(`[data-testid="no-${id}"]`)
        const palco = document.querySelector('.react-flow')
        if (!el || !palco) return null
        const a = el.getBoundingClientRect()
        const b = palco.getBoundingClientRect()
        return a.top >= b.top && a.bottom <= b.bottom && a.left >= b.left && a.right <= b.right
      },

      posicaoDoNo: (id) => {
        const el = document.querySelector(`[data-testid="no-${id}"]`)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y) }
      },

      dom: () => ({
        nos: document.querySelectorAll('.react-flow__node').length,
        arestas: document.querySelectorAll('.react-flow__edge').length,
        inputs: document.querySelectorAll('input.entrada').length,
      }),
    }
  }, [])

  return (
    <Despacho.Provider value={despacharMedido}>
      <div className="app">
        <div className="canvas">
          <div className="hud" data-testid="hud">
            modo={estado.modo} · foco={estado.noFocado ?? '—'} · memo={cfg.memo ? 1 : 0} · a11y=
            {cfg.a11y ? 1 : 0} · nós={estado.modelo.nos.length}
          </div>
          <div className="palco" data-foco="palco" tabIndex={0}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={() => anotar('onNodesChange')}
              onEdgesChange={() => anotar('onEdgesChange')}
              onConnect={() => anotar('onConnect')}
              onConnectStart={() => anotar('onConnectStart')}
              onReconnect={() => anotar('onReconnect')}
              onSelectionChange={() => anotar('onSelectionChange')}
              // O braço `a11y=1` deixa o teclado nativo da engine ligado, com os
              // defaults dela (setas movem o nó focado, Backspace apaga).
              disableKeyboardA11y={!cfg.a11y}
              deleteKeyCode={cfg.a11y ? 'Backspace' : null}
              nodesFocusable={cfg.a11y}
              edgesFocusable={cfg.a11y}
              onInit={(inst) => (window.__rf = inst)}
              defaultViewport={{ x: 60, y: 60, zoom: 1 }}
              minZoom={0.05}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
            </ReactFlow>
          </div>
        </div>
        <div className="painel-codigo">
          <pre data-testid="codigo">{codigo}</pre>
        </div>
      </div>
    </Despacho.Provider>
  )
}
