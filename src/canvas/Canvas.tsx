// Área do diagrama (ADR-002) — vista React Flow. O gesto vira descritor discreto de
// mudança (contracts/change-descriptor.md); a engine NUNCA é fonte. R0: criar/mover.
// R1: conectar (FR-001), agrupar (FR-002), rotular inline (FR-004), e — US3 — seleção
// retangular por CONTENÇÃO (SelectionMode.Full), mover-seleção, duplicar/excluir/
// adicionar/retirar/desagrupar. `onNodesChange` é filtrado: só o gesto concluído vira
// comando; seleção/hover não sujam o modelo (ADR-003).
//
// R2 (spec 003): a navegação. O modo hand na engine é UMA propriedade —
// `panOnDrag = hand ? [0,1] : [1]` — com `selectionOnDrag` no complemento; o botão do
// meio (índice 1) é o gesto auxiliar explícito do `FR-004`, que move o enquadramento
// sem entrar no modo. `zoomOnScroll` fica DESLIGADO para a rolagem herdada do R0
// continuar (`FR-005`), e `zoomOnPinch` liga o `Ctrl/⌘ + roda` e a pinça, ancorados no
// ponteiro (`FR-002`). O enquadramento é reconciliado no FIM do gesto, nunca por quadro.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  MarkerType,
  SelectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnNodeDrag,
  type Viewport,
} from '@xyflow/react'
import { useSessao } from '../modelo/store'
import { selecaoVazia, type Selecao } from '../modelo/selecao'
import { useNavegacao } from '../areatrabalho/useNavegacao'
import { ControlesEnquadramento } from '../areatrabalho/ControlesEnquadramento'
import { pontoDoPlano } from '../areatrabalho/enquadramento'
import type { Piloto } from '../areatrabalho/tipos'
import { CaixaNo } from './CaixaNo'
import { Conexao } from './Conexao'
import { Agrupamento } from './Agrupamento'

export function Canvas() {
  const projecao = useSessao((s) => s.projecao)
  const criarNo = useSessao((s) => s.criarNo)
  const conectar = useSessao((s) => s.conectar)
  const agrupar = useSessao((s) => s.agrupar)
  const moverSelecao = useSessao((s) => s.moverSelecao)
  const duplicarSelecao = useSessao((s) => s.duplicarSelecao)
  const excluirSelecao = useSessao((s) => s.excluirSelecao)
  const adicionarMembros = useSessao((s) => s.adicionarMembros)
  const retirarMembros = useSessao((s) => s.retirarMembros)
  const desagrupar = useSessao((s) => s.desagrupar)
  const registrarPiloto = useSessao((s) => s.registrarPiloto)
  const { screenToFlowPosition, getInternalNode, getViewport } = useReactFlow()

  const refArea = useRef<HTMLDivElement>(null)
  const nav = useNavegacao(refArea)

  const nodeTypes = useMemo(() => ({ caixa: CaixaNo, agrupamento: Agrupamento }), [])
  const edgeTypes = useMemo(() => ({ conexao: Conexao }), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(projecao.nodes as unknown as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState(projecao.edges as unknown as Edge[])
  const [selecao, setSelecao] = useState<Selecao>(selecaoVazia())

  useEffect(() => {
    setNodes(projecao.nodes as unknown as Node[])
    setEdges(projecao.edges as unknown as Edge[])
  }, [projecao, setNodes, setEdges])

  // O PILOTO (FR-012): a ponte mínima entre o store e a engine. `ciclo-por-teclado`
  // chama `trazerParaAreaVisivel(id)` sem saber que existe React Flow — tudo o que o
  // produto decide é aritmética, e o piloto só APLICA.
  //
  // Registrado UMA vez, e por isso lê a navegação por `ref`: um piloto que mudasse de
  // identidade a cada passo de zoom escreveria no store no meio do gesto contínuo, e
  // reacenderia o gatilho de abertura a cada escrita.
  const navRef = useRef(nav)
  navRef.current = nav
  useEffect(() => {
    const piloto: Piloto = {
      enquadramentoCorrente: () => getViewport(),
      aplicar: (e, comTransito) => navRef.current.aplicar(e, comTransito),
      quadro: () => navRef.current.quadro(),
    }
    registrarPiloto(piloto)
    return () => registrarPiloto(null)
  }, [registrarPiloto, getViewport])

  const aoDuploClique = useCallback(
    (e: React.MouseEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo.closest('.react-flow__node')) return
      const ponto = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      criarNo({ x: Math.round(ponto.x), y: Math.round(ponto.y) })
    },
    [screenToFlowPosition, criarNo],
  )

  const aoConectar = useCallback(
    (c: Connection) => {
      if (c.source && c.target) conectar(c.source, c.target)
    },
    [conectar],
  )

  // Ao soltar um arraste (nó, moldura ou seleção): grava a posição ABSOLUTA de todos
  // os nós-caixa (membros arrastados junto inclusos). Só arranjo — código byte-idêntico.
  const sincronizarPosicoes = useCallback(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const n of nodes) {
      if (n.type !== 'caixa') continue
      const abs = getInternalNode(n.id)?.internals.positionAbsolute ?? n.position
      pos[n.id] = { x: abs.x, y: abs.y }
    }
    if (Object.keys(pos).length > 0) moverSelecao(pos)
  }, [nodes, getInternalNode, moverSelecao])

  // ── FR-015: o arrasto não se interrompe, e o elemento não salta ──────────
  // O arrasto está preso ao ponto do PLANO que pegou, não ao ponto da tela. Quando
  // o enquadramento muda por baixo dele (roda, tecla, controle, trânsito), a
  // re-ancoragem O(1) mantém a posição no plano invariante; o que se aplica aqui é
  // a correção acumulada por ela. Ancorado no ponteiro (`FR-002`) ela dá ZERO, e
  // este caminho não faz nada.
  const aoIniciarArrasto: OnNodeDrag<Node> = useCallback(
    (ev, node) => {
      const r = refArea.current?.getBoundingClientRect()
      const t = 'touches' in ev ? ev.touches[0] : ev
      if (!r || !t) return
      const naArea = { x: t.clientX - r.x, y: t.clientY - r.y }
      nav.anotarPonteiro(naArea)
      const abs = getInternalNode(node.id)?.internals.positionAbsolute ?? node.position
      const capturado = pontoDoPlano(naArea, getViewport())
      nav.arrastoIniciado({ x: capturado.x - abs.x, y: capturado.y - abs.y })
    },
    [nav, getInternalNode, getViewport],
  )

  const aoArrastar: OnNodeDrag<Node> = useCallback(() => {
    const c = nav.correcaoDoArrasto()
    if (c.x === 0 && c.y === 0) return
    setNodes((ns) =>
      ns.map((n) =>
        n.dragging ? { ...n, position: { x: n.position.x - c.x, y: n.position.y - c.y } } : n,
      ),
    )
  }, [nav, setNodes])

  const aoSoltarNo: OnNodeDrag<Node> = useCallback(() => {
    nav.arrastoTerminado()
    sincronizarPosicoes()
  }, [nav, sincronizarPosicoes])

  const aoSoltarSelecao = useCallback(() => {
    nav.arrastoTerminado()
    sincronizarPosicoes()
  }, [nav, sincronizarPosicoes])

  // Reconciliação do enquadramento no FIM do gesto contínuo — nunca por quadro
  // (research §8.1). É aqui que o `minZoom` dinâmico é recalculado.
  const aoFimDoMovimento = useCallback((_e: unknown, _v: Viewport) => nav.aoFimDoGesto(), [nav])

  const aoMudarSelecao = useCallback(({ nodes: ns, edges: es }: { nodes: Node[]; edges: Edge[] }) => {
    setSelecao({
      nos: new Set(ns.filter((n) => n.type === 'caixa').map((n) => n.id)),
      agrupamentos: new Set(ns.filter((n) => n.type === 'agrupamento').map((n) => n.id)),
      conexoes: new Set(es.map((e) => e.id)),
    })
  }, [])

  const membros = () => [...selecao.nos, ...selecao.agrupamentos]
  const temSelecao = selecao.nos.size + selecao.agrupamentos.size + selecao.conexoes.size > 0

  // Excluir por tecla (Delete/Backspace), exceto quando se edita um texto inline.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo && (alvo.tagName === 'TEXTAREA' || alvo.tagName === 'INPUT')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && temSelecao) {
        e.preventDefault()
        excluirSelecao(selecao)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecao, temSelecao, excluirSelecao])

  const preservarFoco = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.react-flow__pane')) e.preventDefault()
  }, [])

  const Botao = ({ tid, onClick, off, children }: { tid: string; onClick: () => void; off?: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      data-testid={tid}
      disabled={off}
      onClick={onClick}
      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground shadow-sm disabled:opacity-40"
    >
      {children}
    </button>
  )

  return (
    <div
      ref={refArea}
      className="relative h-full w-full"
      data-testid="area-diagrama"
      data-modo-hand={nav.handAtivo ? 'on' : 'off'}
      onDoubleClick={aoDuploClique}
      onMouseDown={preservarFoco}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Botao tid="btn-agrupar" off={membros().length === 0} onClick={() => agrupar(membros())}>Agrupar</Botao>
        <Botao tid="btn-duplicar" off={!temSelecao} onClick={() => duplicarSelecao(selecao)}>Duplicar</Botao>
        <Botao tid="btn-excluir" off={!temSelecao} onClick={() => excluirSelecao(selecao)}>Excluir</Botao>
        <Botao tid="btn-adicionar" off={selecao.agrupamentos.size !== 1 || selecao.nos.size === 0} onClick={() => adicionarMembros([...selecao.nos], [...selecao.agrupamentos][0])}>Adicionar</Botao>
        <Botao tid="btn-retirar" off={selecao.nos.size === 0} onClick={() => retirarMembros([...selecao.nos])}>Retirar</Botao>
        <Botao tid="btn-desagrupar" off={selecao.agrupamentos.size === 0} onClick={() => [...selecao.agrupamentos].forEach(desagrupar)}>Desagrupar</Botao>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={aoIniciarArrasto}
        onNodeDrag={aoArrastar}
        onNodeDragStop={aoSoltarNo}
        onSelectionDragStop={aoSoltarSelecao}
        onMoveEnd={aoFimDoMovimento}
        onConnect={aoConectar}
        onSelectionChange={aoMudarSelecao}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'conexao', markerEnd: { type: MarkerType.ArrowClosed } }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable
        elementsSelectable
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null}
        // O `Espaço` é NOSSO (useNavegacao), sob a guarda de foco: o estado do modo
        // hand e o cursor que o declara têm que concordar (`SC-014`).
        panActivationKeyCode={null}
        selectionOnDrag={!nav.handAtivo}
        selectionMode={SelectionMode.Full}
        panOnDrag={nav.handAtivo ? [0, 1] : [1]}
        // FR-003 — no modo hand o arrasto pega o PLANO, esteja o ponteiro sobre
        // espaço vazio ou SOBRE UM ELEMENTO. Sem isto o arrasto que começasse em
        // cima de um nó moveria o nó: o mesmo gesto teria dois destinos, que é
        // exatamente o que o `FR-004` proíbe. Desligar o arrasto de nó desprende o
        // manipulador do elemento e o ponteiro cai no painel, que pan.
        nodesDraggable={!nav.handAtivo}
        panOnScroll
        fitView={false}
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        minZoom={nav.minZoom}
        maxZoom={nav.maxZoom}
      >
        <Background />
      </ReactFlow>
      <ControlesEnquadramento nav={nav} handAtivo={nav.handAtivo} />
    </div>
  )
}
