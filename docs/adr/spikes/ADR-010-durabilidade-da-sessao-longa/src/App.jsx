import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, Handle, Position, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { analisar, serializar, contar, TIPOS } from './registro.js'
import { projetar, limparCache, CAIXA_W } from './projecao.js'
import { aposPaint } from './medir.js'
import { criarHistorico, estadoInicial, idsDosNos } from './comandos.js'
import { CHAVE, empacotar, desempacotar, armazemSincrono, armazemAssincrono, criarAgendador } from './persistencia.js'

const params = new URLSearchParams(location.search)
const num = (k, d) => (params.has(k) ? Number(params.get(k)) : d)
const txt = (k, d) => params.get(k) || d

const TIPO = txt('tipo', 'flowchart')
const N = num('n', 0)
const LIGACOES = num('ligacoes', 0)
const MEMO = num('memo', 1) === 1
const LIMITE = num('limite', 0)
// Os braços deste spike:
const FORMATO = txt('formato', 'modelo') // texto | modelo
const QUANDO = txt('quando', 'ocioso') // ato | ocioso | intervalo | nunca
const ARMAZEM = txt('armazem', 'sync') // sync (localStorage) | async (IndexedDB)
const JANELA = num('janela', 1000)
const INTERVALO = num('intervalo', 5000)
const RESTAURAR = num('restaurar', 1) === 1

const SEMENTES = {
  flowchart: ['flowchart TD', '  a["Início"] --> b{"Decidir"}', '  b -->|"sim"| c["Segue"]'].join('\n'),
  classe: ['classDiagram', '  class Pedido {', '    +String id', '    +confirmar() bool', '  }', '  class Cliente', '  Cliente "1" --> "*" Pedido : faz'].join('\n'),
  sequencia: ['sequenceDiagram', '  participant Alice', '  participant Bob', '  Alice->>Bob: Ola Bob', '  Bob-->>Alice: Ola Alice'].join('\n'),
}

const INICIAL = N > 0 ? TIPOS[TIPO].gerarDensoTexto(N, LIGACOES) : SEMENTES[TIPO]
const armazem = ARMAZEM === 'async' ? armazemAssincrono : armazemSincrono

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

/** O que a aba encontrou ao abrir: rascunho restaurado, ausente ou ilegível. */
let aberturaDaAba = { restaurado: false, aviso: null, formato: FORMATO }

export default function App() {
  const historico = useRef(null)
  if (historico.current == null) historico.current = criarHistorico({ modo: 'inverso', limite: LIMITE })

  const [estado, setEstado] = useState(() => {
    if (RESTAURAR && ARMAZEM === 'sync') {
      const { estado: guardado, aviso } = desempacotar(armazem.ler(CHAVE), FORMATO, analisar)
      aberturaDaAba = { restaurado: !!guardado, aviso, formato: FORMATO }
      if (guardado) return guardado
    }
    return estadoInicial(INICIAL)
  })
  const [texto, setTexto] = useState(() => serializar(estado.modelo))

  const vivo = useRef(estado)
  const inicio = useRef(null)
  const etapas = useRef({ comando: 0, parse: 0, projecao: 0, serializacao: 0, gravacao: 0 })

  // O agendador vive fora do render: é ele que decide *quando* o custo de gravar
  // entra no caminho da pessoa.
  const agendador = useRef(null)
  if (agendador.current == null) {
    agendador.current = criarAgendador({
      politica: QUANDO,
      janelaMs: JANELA,
      intervaloMs: INTERVALO,
      gravar: async (dados) => {
        const t0 = performance.now()
        const ms = await armazem.gravar(CHAVE, dados)
        // Na política `ato` a gravação acontece dentro do gesto medido; nas
        // outras, fora dele. Somar aqui só tem efeito quando é dentro.
        etapas.current.gravacao += performance.now() - t0
        return ms
      },
    })
  }

  const marcarParaGravar = useCallback((novo) => {
    if (QUANDO === 'nunca') return
    agendador.current.aoMudar(() => empacotar(novo, FORMATO, serializar))
  }, [])

  const { nodes, edges } = useMemo(() => {
    const t0 = performance.now()
    const r = projetar(estado.modelo, MEMO, estado.posicoes)
    etapas.current.projecao = performance.now() - t0
    return r
  }, [estado])

  const numeros = useMemo(() => contar(estado.modelo), [estado])

  const despachar = useCallback(
    (especie, arg, { reescreverTexto = true } = {}) => {
      if (inicio.current == null) inicio.current = performance.now()
      const t0 = performance.now()
      const novo = historico.current.aplicar(vivo.current, especie, arg, { agora: performance.now() })
      etapas.current.comando += performance.now() - t0
      vivo.current = novo
      setEstado(novo)
      if (reescreverTexto) {
        const t1 = performance.now()
        const codigo = serializar(novo.modelo)
        etapas.current.serializacao += performance.now() - t1
        setTexto(codigo)
      }
      marcarParaGravar(novo)
      return novo
    },
    [marcarParaGravar],
  )

  const andar = useCallback(
    (direcao) => {
      if (inicio.current == null) inicio.current = performance.now()
      const novo = direcao === 'desfazer' ? historico.current.desfazer(vivo.current) : historico.current.refazer(vivo.current)
      vivo.current = novo
      setEstado(novo)
      setTexto(serializar(novo.modelo))
      marcarParaGravar(novo)
      return novo
    },
    [marcarParaGravar],
  )

  const aoDigitar = useCallback(
    (e) => {
      const v = e.target.value
      if (inicio.current == null) inicio.current = performance.now()
      const t0 = performance.now()
      const modelo = analisar(v).modelo
      etapas.current.parse += performance.now() - t0
      setTexto(v)
      despachar('documento', { texto: v, modelo }, { reescreverTexto: false })
    },
    [despachar],
  )

  // Restauração assíncrona: o armazém que não bloqueia também não responde a
  // tempo de montar a tela, e isso é parte do que se está medindo.
  useEffect(() => {
    if (!RESTAURAR || ARMAZEM !== 'async') return
    armazemAssincrono.ler(CHAVE).then((cru) => {
      const { estado: guardado, aviso } = desempacotar(cru, FORMATO, analisar)
      aberturaDaAba = { restaurado: !!guardado, aviso, formato: FORMATO }
      if (guardado) {
        vivo.current = guardado
        setEstado(guardado)
        setTexto(serializar(guardado.modelo))
      }
    })
  }, [])

  useEffect(() => {
    if (inicio.current == null) return
    const t0 = inicio.current
    inicio.current = null
    const e = etapas.current
    const copia = { comando: e.comando, parse: e.parse, projecao: e.projecao, serializacao: e.serializacao, gravacao: e.gravacao }
    etapas.current = { comando: 0, parse: 0, projecao: 0, serializacao: 0, gravacao: 0 }
    aposPaint().then(() => {
      const amostra = { total: performance.now() - t0, ...copia }
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
      cenario: { TIPO, N, LIGACOES, MEMO, FORMATO, QUANDO, ARMAZEM, JANELA, INTERVALO, RESTAURAR, LIMITE },
      abertura: () => aberturaDaAba,

      atoEmBloco(quantos, valor) {
        const alvos = ids().slice(0, quantos)
        despachar('rotular', { ids: alvos, valor })
        return alvos.length
      },
      mover: (id, para) => despachar('mover', { id, para }, { reescreverTexto: false }),
      criar: (id, rotulo) => despachar('criar', { id, rotulo }),
      colar: (t) => {
        if (inicio.current == null) inicio.current = performance.now()
        const modelo = analisar(t).modelo
        setTexto(t)
        despachar('documento', { texto: t, modelo }, { reescreverTexto: false })
      },
      desfazer: () => andar('desfazer'),
      refazer: () => andar('refazer'),

      /**
       * A sessão longa **pelo app inteiro**: cada ato passa pelo comando, pelo
       * histórico, pela projeção, pelo render e pela persistência, e devolve o
       * tempo de cada um. É o que separa "o modelo aguenta" de "o produto
       * aguenta".
       */
      async sessaoLonga(atos, tamanhoSelecao = 5) {
        const tempos = []
        for (let i = 0; i < atos; i++) {
          const espera = window.__spike.proximaAmostra()
          const alvos = ids()
          if (i % 10 === 7) {
            window.__spike.mover(alvos[i % alvos.length], { x: (i * 37) % 2000, y: (i * 53) % 1200 })
          } else {
            const de = i % Math.max(1, alvos.length - tamanhoSelecao)
            despachar('rotular', { ids: alvos.slice(de, de + tamanhoSelecao), valor: `Sessão ${i}` })
          }
          tempos.push((await espera).total)
        }
        return tempos
      },

      modelo: () => vivo.current.modelo,
      posicoes: () => vivo.current.posicoes,
      codigo: () => serializar(vivo.current.modelo),
      rotuloDe: (id) => {
        const lista = vivo.current.modelo.nos || vivo.current.modelo.classes || vivo.current.modelo.participantes
        const n = lista.find((x) => x.id === id)
        return n ? n.rotulo : null
      },
      ids,
      contarNos: () => numeros.nos,
      contarNoCanvas: () => document.querySelectorAll('.react-flow__node').length,
      historico: () => ({ tamanho: historico.current.tamanho(), podeDesfazer: historico.current.podeDesfazer() }),
      persistencia: () => ({
        ...agendador.current.estado(),
        politica: QUANDO,
        formato: FORMATO,
        armazem: armazem.nome,
        bytes: empacotar(vivo.current, FORMATO, serializar).length,
      }),
      gravarAgora: () => armazem.gravar(CHAVE, empacotar(vivo.current, FORMATO, serializar)),
      lerRascunho: () => armazem.ler(CHAVE),
      escreverRascunho: (cru) => armazem.gravar(CHAVE, cru),
      limparRascunho: () => localStorage.removeItem(CHAVE),

      zerar: () => {
        window.__spike.amostras = []
      },
      limparCache,
      proximaAmostra: () => new Promise((res) => (window.__spike._resolver = res)),
      pronto: true,
    }
  }, [estado, texto, numeros, despachar, andar])

  const p = agendador.current.estado()

  return (
    <div className="tela">
      <div className="painel">
        <textarea id="codigo" value={texto} onChange={aoDigitar} spellCheck={false} />
        <div className="rodape">
          <span>
            {TIPOS[estado.modelo.tipo || 'flowchart'].rotulo} · {numeros.nos} nós · {Object.keys(estado.posicoes).length} posições
          </span>
          <span className={aberturaDaAba.restaurado ? 'ok' : 'aviso'}>
            {aberturaDaAba.restaurado ? 'rascunho restaurado' : aberturaDaAba.aviso || 'sessão nova'} · {QUANDO}/{FORMATO} · {p.gravacoes} gravações
          </span>
        </div>
      </div>
      <div className="canvas">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={TIPOS_DE_NO} fitView nodesDraggable={false} proOptions={{ hideAttribution: true }}>
          <Ajustar quantidade={nodes.length} />
          <Background />
        </ReactFlow>
      </div>
    </div>
  )
}
