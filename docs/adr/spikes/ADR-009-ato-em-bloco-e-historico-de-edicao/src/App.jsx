import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, Handle, Position, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { analisar, serializar, contar, TIPOS } from './registro.js'
import { projetar, limparCache, CAIXA_W } from './projecao.js'
import { aposPaint } from './medir.js'
import { criarHistorico, estadoInicial, idsDosNos, repetir } from './comandos.js'

const params = new URLSearchParams(location.search)
const num = (k, d) => (params.has(k) ? Number(params.get(k)) : d)
const txt = (k, d) => params.get(k) || d

const TIPO = txt('tipo', 'flowchart')
const N = num('n', 0)
const LIGACOES = num('ligacoes', 0)
const MEMO = num('memo', 1) === 1
const COM_CANVAS = num('canvas', 1) === 1
// Os braços deste spike:
const MODO = txt('historico', 'inverso') // inverso | referencia | clone
const LOTE = num('lote', 1) === 1 // 0 = o ato em bloco como N transações
const COALESCER = num('coalescer', 1) === 1 // 0 = uma entrada por tecla
const POSICAO_NO_HISTORICO = num('posicaoNoHistorico', 1) === 1
const LIMITE = num('limite', 0)

const SEMENTES = {
  flowchart: ['flowchart TD', '  a["Início"] --> b{"Decidir"}', '  b -->|"sim"| c["Segue"]'].join('\n'),
  classe: ['classDiagram', '  class Pedido {', '    +String id', '    +confirmar() bool', '  }', '  class Cliente', '  Cliente "1" --> "*" Pedido : faz'].join('\n'),
  sequencia: ['sequenceDiagram', '  participant Alice', '  participant Bob', '  Alice->>Bob: Ola Bob', '  Bob-->>Alice: Ola Alice'].join('\n'),
}

const INICIAL = N > 0 ? TIPOS[TIPO].gerarDensoTexto(N, LIGACOES) : SEMENTES[TIPO]

function Caixa({ data }) {
  return (
    <div className={'caixa' + (data.marcado ? ' marcada' : '')} style={{ width: CAIXA_W }}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <span className="rotulo">{data.rotulo}</span>
      {data.linhas.length > 0 && (
        <span className="corpo">
          {data.linhas.map((l, i) => (
            <span key={i} className="membro">
              {l}
            </span>
          ))}
        </span>
      )}
      {data.marcado && <span className="marca">!</span>}
    </div>
  )
}

const TIPOS_DE_NO = { caixa: Caixa }

function Ajustar({ quantidade }) {
  const fluxo = useReactFlow()
  useEffect(() => {
    fluxo.fitView({ duration: 0, padding: 0.15 })
  }, [quantidade, fluxo])
  return null
}

export default function App() {
  const historico = useRef(null)
  if (historico.current == null) {
    historico.current = criarHistorico({
      modo: MODO,
      limite: LIMITE,
      coalescer: COALESCER,
      posicaoNoHistorico: POSICAO_NO_HISTORICO,
    })
  }

  const [estado, setEstado] = useState(() => estadoInicial(INICIAL))
  // O texto que a pessoa vê. Não é derivado a cada render: quando a origem da
  // transação é o próprio editor, ele **não é reescrito** (ADR-003, "origem de
  // transação"). Quando a origem é o canvas ou o desfazer, ele é.
  const [texto, setTexto] = useState(INICIAL)

  const vivo = useRef(estado)
  const inicio = useRef(null)
  const etapas = useRef({ comando: 0, parse: 0, projecao: 0, serializacao: 0 })

  const { nodes, edges } = useMemo(() => {
    const t0 = performance.now()
    const r = COM_CANVAS ? projetar(estado.modelo, MEMO, estado.posicoes) : { nodes: [], edges: [] }
    etapas.current.projecao = performance.now() - t0
    return r
  }, [estado])

  const numeros = useMemo(() => contar(estado.modelo), [estado])

  /**
   * O único caminho de mutação do app. Canvas, teclado e editor de código passam
   * por aqui — é o que faz o histórico ser um só.
   */
  const despachar = useCallback((especie, arg, { reescreverTexto = true } = {}) => {
    if (inicio.current == null) inicio.current = performance.now()
    const t0 = performance.now()
    const novo = historico.current.aplicar(vivo.current, especie, arg, { agora: performance.now() })
    // Soma, não atribui: no braço de controle o mesmo gesto dispara N
    // transações, e sobrescrever mediria só a última.
    etapas.current.comando += performance.now() - t0
    vivo.current = novo
    setEstado(novo)
    if (reescreverTexto) {
      const t1 = performance.now()
      const codigo = serializar(novo.modelo)
      etapas.current.serializacao += performance.now() - t1
      setTexto(codigo)
    }
    return novo
  }, [])

  const andar = useCallback((direcao) => {
    if (inicio.current == null) inicio.current = performance.now()
    const t0 = performance.now()
    const novo = direcao === 'desfazer' ? historico.current.desfazer(vivo.current) : historico.current.refazer(vivo.current)
    etapas.current.comando += performance.now() - t0
    vivo.current = novo
    setEstado(novo)
    const t1 = performance.now()
    const codigo = serializar(novo.modelo)
    etapas.current.serializacao = performance.now() - t1
    setTexto(codigo)
    return novo
  }, [])

  const aoDigitar = useCallback(
    (e) => {
      const v = e.target.value
      if (inicio.current == null) inicio.current = performance.now()
      const t0 = performance.now()
      const modelo = analisar(v).modelo
      etapas.current.parse += performance.now() - t0
      setTexto(v) // a vista de origem não é reescrita
      despachar('documento', { texto: v, modelo }, { reescreverTexto: false })
    },
    [despachar],
  )

  useEffect(() => {
    if (inicio.current == null) return
    const t0 = inicio.current
    inicio.current = null
    const { comando, parse, projecao, serializacao } = etapas.current
    etapas.current = { comando: 0, parse: 0, projecao: 0, serializacao: 0 }
    aposPaint().then(() => {
      const amostra = { total: performance.now() - t0, comando, parse, projecao, serializacao }
      const s = window.__spike
      s.amostras.push(amostra)
      if (s._resolver) {
        const r = s._resolver
        s._resolver = null
        r(amostra)
      }
    })
  }, [estado, texto, nodes, edges])

  useEffect(() => {
    const ids = () => idsDosNos(vivo.current.modelo)
    window.__spike = {
      ...(window.__spike || {}),
      amostras: (window.__spike && window.__spike.amostras) || [],
      cenario: { TIPO, N, LIGACOES, MEMO, MODO, LOTE, COALESCER, POSICAO_NO_HISTORICO, LIMITE },

      // ── os atos ────────────────────────────────────────────────────────────
      /** O ato em bloco: uma alteração sobre uma seleção inteira. */
      atoEmBloco(quantos, valor, especie = 'rotular') {
        const alvos = ids().slice(0, quantos)
        if (LOTE) despachar(especie, { ids: alvos, valor })
        // O braço de controle reescreve o texto **uma vez só**, igual ao braço
        // em lote. Sem isso, o controle pagaria N serializações e a diferença
        // medida não seria a da transação, que é o que está em jogo.
        else alvos.forEach((id, i) => despachar(especie, { ids: [id], valor }, { reescreverTexto: i === alvos.length - 1 }))
        return alvos.length
      },
      repetirEm(quantos) {
        const alvos = ids().slice(0, quantos)
        if (inicio.current == null) inicio.current = performance.now()
        const r = repetir(historico.current, vivo.current, alvos, { agora: performance.now() })
        vivo.current = r.estado
        setEstado(r.estado)
        setTexto(serializar(r.estado.modelo))
        return r.feito && r.feito.especie
      },
      criar: (id, rotulo) => despachar('criar', { id, rotulo }),
      remover: (quantos) => despachar('remover', { ids: ids().slice(0, quantos) }),
      mover: (id, para) => despachar('mover', { id, para }, { reescreverTexto: false }),
      colar: (t) => {
        if (inicio.current == null) inicio.current = performance.now()
        const t0 = performance.now()
        const modelo = analisar(t).modelo
        etapas.current.parse += performance.now() - t0
        setTexto(t)
        despachar('documento', { texto: t, modelo }, { reescreverTexto: false })
      },
      desfazer: () => andar('desfazer'),
      refazer: () => andar('refazer'),

      // ── o que se lê do estado ──────────────────────────────────────────────
      modelo: () => vivo.current.modelo,
      posicoes: () => vivo.current.posicoes,
      texto: () => texto,
      codigo: () => serializar(vivo.current.modelo),
      rotuloDe: (id) => {
        const n = vivo.current.modelo[TIPO === 'flowchart' ? 'nos' : TIPO === 'classe' ? 'classes' : 'participantes'].find((x) => x.id === id)
        return n ? n.rotulo : null
      },
      formaDe: (id) => {
        const n = (vivo.current.modelo.nos || []).find((x) => x.id === id)
        return n ? n.forma : null
      },
      ids,
      contarNos: () => numeros.nos,
      contarLigacoes: () => numeros.ligacoes,
      contarNoCanvas: () => document.querySelectorAll('.react-flow__node').length,
      historico: () => ({
        tamanho: historico.current.tamanho(),
        podeDesfazer: historico.current.podeDesfazer(),
        podeRefazer: historico.current.podeRefazer(),
        bytesLogicos: historico.current.bytesLogicos(),
        modo: historico.current.modo,
      }),

      zerar: () => {
        window.__spike.amostras = []
      },
      limparCache,
      proximaAmostra: () => new Promise((res) => (window.__spike._resolver = res)),
      pronto: true,
    }
  }, [estado, texto, numeros, despachar, andar])

  const h = historico.current

  return (
    <div className="tela">
      <div className="painel">
        <textarea id="codigo" value={texto} onChange={aoDigitar} spellCheck={false} />
        <div className="rodape">
          <span>
            {TIPOS[estado.modelo.tipo || 'flowchart'].rotulo} · {numeros.nos} nós · {numeros.ligacoes} ligações
          </span>
          <span className={h.podeDesfazer() ? 'ok' : 'aviso'}>
            histórico {h.modo}: {h.tamanho()}
          </span>
        </div>
      </div>
      <div className="canvas">
        {COM_CANVAS && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={TIPOS_DE_NO}
            fitView
            nodesDraggable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Ajustar quantidade={nodes.length} />
            <Background />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
