import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { analisar } from './parser.js'
import { serializar } from './serializar.js'
import { gerarDensoTexto } from './modelo.js'
import { projetar, limparCache, CAIXA_W, CAIXA_H } from './projecao.js'
import { aposPaint } from './medir.js'

const params = new URLSearchParams(location.search)
const num = (k, d) => (params.has(k) ? Number(params.get(k)) : d)

const N = num('n', 0)
const ARESTAS = num('arestas', 0)
const MEMO = num('memo', 1) === 1
const COM_CANVAS = num('canvas', 1) === 1

const INICIAL =
  N > 0
    ? gerarDensoTexto(N, ARESTAS)
    : ['flowchart TD', '  a["Início"] --> b{"Decidir"}', '  b -->|"sim"| c["Segue"]'].join('\n')

function Caixa({ data }) {
  return (
    <div className={'caixa' + (data.marcado ? ' marcada' : '')} style={{ width: CAIXA_W, height: CAIXA_H }}>
      <span className="rotulo">{data.rotulo}</span>
      {data.marcado && <span className="marca" title="caractere que o código não expressa">!</span>}
    </div>
  )
}

const TIPOS = { caixa: Caixa }

/** Reenquadra quando o diagrama muda de tamanho. Existe para a captura mostrar o
 *  que o texto afirma — não faz parte do que está sendo medido. */
function Ajustar({ quantidade }) {
  const fluxo = useReactFlow()
  useEffect(() => {
    fluxo.fitView({ duration: 0, padding: 0.15 })
  }, [quantidade, fluxo])
  return null
}

export default function App() {
  const [texto, setTexto] = useState(INICIAL)
  const inicio = useRef(null)
  const etapas = useRef({ parse: 0, projecao: 0 })

  const { modelo, erros, avisos } = useMemo(() => {
    const t0 = performance.now()
    const r = analisar(texto)
    etapas.current.parse = performance.now() - t0
    return r
  }, [texto])

  const { nodes, edges } = useMemo(() => {
    const t0 = performance.now()
    const r = COM_CANVAS ? projetar(modelo, MEMO) : { nodes: [], edges: [] }
    etapas.current.projecao = performance.now() - t0
    return r
  }, [modelo])

  // A outra vista: o código canônico que sai do modelo. É o que a Marina copia.
  const codigoCanonico = useMemo(() => serializar(modelo), [modelo])

  const aoDigitar = useCallback((e) => {
    inicio.current = performance.now()
    setTexto(e.target.value)
  }, [])

  useEffect(() => {
    if (inicio.current == null) return
    const t0 = inicio.current
    inicio.current = null
    const { parse, projecao } = etapas.current
    aposPaint().then(() => {
      const amostra = { total: performance.now() - t0, parse, projecao }
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
      cenario: { N, ARESTAS, MEMO, COM_CANVAS },
      modelo: () => modelo,
      erros: () => erros,
      avisos: () => avisos,
      texto: () => texto,
      canonico: () => codigoCanonico,
      contarNos: () => modelo.nos.length,
      contarConexoes: () => modelo.conexoes.length,
      zerar: () => {
        window.__spike.amostras = []
      },
      limparCache,
      proximaAmostra: () => new Promise((res) => (window.__spike._resolver = res)),
      pronto: true,
    }
  }, [modelo, erros, avisos, texto, codigoCanonico])

  return (
    <div className="tela">
      <div className="painel">
        <textarea id="codigo" value={texto} onChange={aoDigitar} spellCheck={false} />
        <div className="rodape">
          <span>
            {modelo.nos.length} nós · {modelo.conexoes.length} conexões
          </span>
          <span className={erros.length ? 'erro' : avisos.length ? 'aviso' : 'ok'}>
            {erros.length
              ? `${erros.length} erro(s): L${erros[0].linha} ${erros[0].mensagem}`
              : avisos.length
                ? `${avisos.length} aviso(s): L${avisos[0].linha} ${avisos[0].mensagem}`
                : 'sintaxe ok'}
          </span>
        </div>
      </div>
      <div className="canvas">
        {COM_CANVAS && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={TIPOS}
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
