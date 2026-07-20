import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ReactFlow, Background, ConnectionMode } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { criarElemento, editarRotulo, gerarFlowchart, gerarSequence, serializar } from './modelo.js'
import { derivar } from './derivar.js'
import { CaixaNode, ParticipanteNode } from './nos.jsx'
import { iniciarFps, medirAcao, pararFps, tarefasLongas } from './medir.js'

const nodeTypes = { caixa: CaixaNode, participante: ParticipanteNode }

function lerCfg() {
  const q = new URLSearchParams(location.search)
  const num = (k, padrao) => (q.has(k) ? Number(q.get(k)) : padrao)
  return {
    tipo: q.get('tipo') ?? 'flowchart',
    n: num('n', 100),
    p: num('p', 8),
    m: num('m', 25),
    memo: num('memo', 1) === 1,
    virt: num('virt', 0) === 1,
  }
}

const cfg = lerCfg()

export default function App() {
  const [modelo, setModelo] = useState(() =>
    cfg.tipo === 'flowchart' ? gerarFlowchart(cfg.n) : gerarSequence(cfg.p, cfg.m),
  )

  const { nodes, edges } = useMemo(() => derivar(modelo, cfg.memo), [modelo])
  const codigo = useMemo(() => serializar(modelo), [modelo])

  // O funil do React Flow: só posição é absorvida, e como campo efêmero do
  // modelo (ADR-003). Seleção e dimensão não sujam o documento.
  const onNodesChange = useCallback((changes) => {
    let mexeu = false
    const novas = {}
    for (const c of changes) {
      if (c.type === 'position' && c.position) {
        novas[c.id] = c.position
        mexeu = true
      }
    }
    if (!mexeu) return
    setModelo((m) => ({ ...m, posicoes: { ...m.posicoes, ...novas } }))
  }, [])

  const ref = useRef(null)
  ref.current = { modelo, setModelo }
  const codigoRef = useRef('')
  codigoRef.current = codigo
  const seq = useRef(0)

  useEffect(() => {
    const set = (fn) => ref.current.setModelo(fn)

    window.__spike = {
      cfg,
      pronto: true,

      /** Uma edição de rótulo: gesto -> modelo -> canvas + código, até o paint. */
      editar: (i) => {
        const texto = `editado ${i}-${seq.current++}`
        return medirAcao(() => set((m) => editarRotulo(m, i, texto)))
      },

      /**
       * A mesma edição, mas cronometrando só o trabalho — sem a espera pelo
       * próximo frame. Existe porque a medição até o paint tem piso de 1 frame
       * (~16.7ms a 60Hz) e não distingue "custou 2ms" de "custou 15ms".
       * `js` = derivação + projeção para texto + render/commit do React.
       * `layout` = o recálculo de layout que o navegador é forçado a fazer.
       */
      editarSincrono: (i) => {
        const texto = `sincrono ${i}-${seq.current++}`
        const t0 = performance.now()
        flushSync(() => set((m) => editarRotulo(m, i, texto)))
        const t1 = performance.now()
        void document.documentElement.offsetHeight
        const t2 = performance.now()
        return { js: t1 - t0, layout: t2 - t1, total: t2 - t0 }
      },

      /** O ciclo da Marina: nasce um elemento novo e já conectado. */
      criar: () => medirAcao(() => set((m) => criarElemento(m, seq.current++))),

      /** Digitação: N teclas seguidas no mesmo rótulo, uma medição por tecla. */
      digitar: async (i, teclas) => {
        const amostras = []
        let texto = 'a'
        for (let k = 0; k < teclas; k++) {
          texto += String.fromCharCode(98 + (k % 25))
          const t = texto
          amostras.push(await medirAcao(() => set((m) => editarRotulo(m, i, t))))
        }
        return amostras
      },

      /** Custo puro da projeção modelo -> mermaid (o serializador do ADR-003). */
      serializacao: () => {
        const amostras = []
        for (let k = 0; k < 20; k++) {
          const t0 = performance.now()
          serializar(ref.current.modelo)
          amostras.push(performance.now() - t0)
        }
        return amostras
      },

      /** O que a verdade não carrega: a posição não aparece na projeção. */
      posicaoVazou: () => {
        const m = ref.current.modelo
        const alvo = Object.keys(m.posicoes)[0]
        if (!alvo) return null
        const p = m.posicoes[alvo]
        return serializar(m).includes(String(Math.round(p.x)))
      },

      dom: () => ({
        nos: document.querySelectorAll('.react-flow__node').length,
        arestas: document.querySelectorAll('.react-flow__edge').length,
        handles: document.querySelectorAll('.react-flow__handle').length,
        elementos: document.querySelectorAll('*').length,
        linhasDeCodigo: (document.querySelector('.painel-codigo pre')?.textContent ?? '').split('\n')
          .length,
      }),

      textoDoNo: (id) =>
        document.querySelector(`[data-testid="no-${id}"]`)?.textContent ??
        document.querySelector(`[data-testid="participante-${id}"]`)?.textContent ??
        null,

      codigoContem: (s) => codigoRef.current.includes(s),

      /** "Ajustar o diagrama à tela" do discovery: o pior caso de pintura. */
      ajustarATela: () => medirAcao(() => window.__rf.fitView({ duration: 0 })),
      zoomDeTrabalho: () => window.__rf.setViewport({ x: 60, y: 60, zoom: 1 }),

      tarefasLongas,
      iniciarFps,
      pararFps,
    }
  }, [])

  return (
    <div className="app">
      <div className="canvas">
        <div className="hud">
          {cfg.tipo} · {cfg.tipo === 'flowchart' ? `n=${cfg.n}` : `p=${cfg.p} m=${cfg.m}`} · memo=
          {cfg.memo ? 1 : 0} · virt={cfg.virt ? 1 : 0}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onlyRenderVisibleElements={cfg.virt}
          connectionMode={ConnectionMode.Loose}
          onInit={(inst) => (window.__rf = inst)}
          defaultViewport={{ x: 60, y: 60, zoom: 1 }}
          minZoom={0.02}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>
      <div className="painel-codigo">
        <pre>{codigo}</pre>
      </div>
    </div>
  )
}
