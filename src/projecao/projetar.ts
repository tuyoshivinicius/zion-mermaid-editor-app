// Projeção modelo → vista da engine (ADR-004). O canvas é vista; a engine nunca é
// fonte; a coordenada nasce aqui (derivada do arranjo, não do modelo estrutural).
//
// A INVARIANTE DE REUSO é portão (Princípio III), não otimização: o objeto de vista
// de um elemento é reusado (identidade referencial) quando nada que a vista enxerga
// mudou. R1: TRÊS famílias de objeto — nó, aresta e nó-container (agrupamento) —,
// cada uma com o seu cache. A moldura é ARRANJO (efêmera): posição/tamanho derivam do
// arranjo dos membros, nunca do modelo estrutural (Princípio V).

import type { Modelo, No, Conexao, Agrupamento } from '../modelo/modelo'
import { paiDe, membrosTransitivos, acharNo } from '../modelo/modelo'
import type { Arranjo, Pos } from '../modelo/arranjo'
import { ORIGEM } from '../modelo/arranjo'

export const CAIXA_W = 170
export const CAIXA_H = 52
const FOLGA = 28 // respiro da moldura em torno dos membros
const FAIXA_TITULO = 34 // espaço extra no topo para o título
const MOLDURA_VAZIA = { w: 220, h: 132 } // bloco vazio escrito à mão (M5)

export interface DadosCaixa {
  rotulo: string
  forma: 'retangulo'
  marcado: boolean
}

export interface DadosAgrupamento {
  titulo: string
  marcado: boolean
}

export interface RFNode {
  id: string
  type: 'caixa' | 'agrupamento'
  position: Pos
  width: number
  height: number
  parentId?: string
  extent?: 'parent'
  data: DadosCaixa | DadosAgrupamento
}

export interface RFEdge {
  id: string
  type: 'conexao'
  source: string
  target: string
  data: { texto: string | null; marcado: boolean }
}

export interface Projecao {
  nodes: RFNode[]
  edges: RFEdge[]
}

const cacheNo = new Map<string, { chave: string; valor: RFNode }>()
const cacheAgrup = new Map<string, { chave: string; valor: RFNode }>()
const cacheAresta = new Map<string, { chave: string; valor: RFEdge }>()

export function limparCacheProjecao(): void {
  cacheNo.clear()
  cacheAgrup.clear()
  cacheAresta.clear()
}

/** Moldura ABSOLUTA de um agrupamento: bounding box dos nós-membro transitivos + folga. */
function moldura(modelo: Modelo, g: Agrupamento, absNo: Map<string, Pos>, arranjo: Arranjo): {
  x: number; y: number; w: number; h: number
} {
  const folhas = membrosTransitivos(modelo, g.id).filter((id) => acharNo(modelo, id) != null)
  if (folhas.length === 0) {
    // Bloco vazio (M5): a moldura é arranjo puro — posição lembrada, senão a origem.
    const p = arranjo.porId.get(g.id) ?? ORIGEM
    return { x: p.x, y: p.y, w: MOLDURA_VAZIA.w, h: MOLDURA_VAZIA.h }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const id of folhas) {
    const p = absNo.get(id) ?? ORIGEM
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + CAIXA_W)
    maxY = Math.max(maxY, p.y + CAIXA_H)
  }
  return {
    x: minX - FOLGA,
    y: minY - FOLGA - FAIXA_TITULO,
    w: maxX - minX + 2 * FOLGA,
    h: maxY - minY + 2 * FOLGA + FAIXA_TITULO,
  }
}

export function projetar(modelo: Modelo, arranjo: Arranjo): Projecao {
  // Posições absolutas dos nós (do arranjo).
  const absNo = new Map<string, Pos>()
  for (const n of modelo.nos) absNo.set(n.id, arranjo.porId.get(n.id) ?? ORIGEM)

  // Molduras absolutas dos agrupamentos (derivadas dos membros).
  const absMold = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const g of modelo.agrupamentos) absMold.set(g.id, moldura(modelo, g, absNo, arranjo))

  const nodes: RFNode[] = []
  const presentesNo = new Set<string>()
  const presentesAgrup = new Set<string>()

  const posRelativa = (absX: number, absY: number, paiId: string | undefined): Pos => {
    if (!paiId) return { x: absX, y: absY }
    const mp = absMold.get(paiId)
    return mp ? { x: absX - mp.x, y: absY - mp.y } : { x: absX, y: absY }
  }

  const emitirNoVista = (n: No): void => {
    presentesNo.add(n.id)
    const pai = paiDe(modelo, n.id)
    const parentId = pai?.id
    const abs = absNo.get(n.id) ?? ORIGEM
    const position = posRelativa(abs.x, abs.y, parentId)
    const rotulo = n.rotulo ?? n.id
    const marcado = n.alertas.length > 0
    const chave = `${rotulo}|retangulo|${marcado}|${parentId ?? ''}|${position.x}|${position.y}`
    const ant = cacheNo.get(n.id)
    if (ant && ant.chave === chave) {
      nodes.push(ant.valor)
      return
    }
    const valor: RFNode = {
      id: n.id,
      type: 'caixa',
      position,
      width: CAIXA_W,
      height: CAIXA_H,
      ...(parentId ? { parentId } : {}),
      data: { rotulo, forma: 'retangulo', marcado },
    }
    cacheNo.set(n.id, { chave, valor })
    nodes.push(valor)
  }

  const emitirAgrupVista = (g: Agrupamento): void => {
    presentesAgrup.add(g.id)
    const pai = paiDe(modelo, g.id)
    const parentId = pai?.id
    const m = absMold.get(g.id)!
    const position = posRelativa(m.x, m.y, parentId)
    const titulo = g.titulo ?? g.id
    const marcado = g.alertas.length > 0
    const chave = `${titulo}|${marcado}|${parentId ?? ''}|${position.x}|${position.y}|${m.w}|${m.h}`
    const ant = cacheAgrup.get(g.id)
    let valor: RFNode
    if (ant && ant.chave === chave) {
      valor = ant.valor
    } else {
      valor = {
        id: g.id,
        type: 'agrupamento',
        position,
        width: m.w,
        height: m.h,
        ...(parentId ? { parentId } : {}),
        data: { titulo, marcado },
      }
      cacheAgrup.set(g.id, { chave, valor })
    }
    // pai ANTES de filho: empurra a moldura, depois desce nos membros
    nodes.push(valor)
    for (const idMembro of g.membros) {
      const filho = modelo.agrupamentos.find((x) => x.id === idMembro)
      if (filho) emitirAgrupVista(filho)
      else {
        const no = acharNo(modelo, idMembro)
        if (no) emitirNoVista(no)
      }
    }
  }

  // Agrupamentos de topo (não-membros) primeiro, recursivo; depois os nós soltos.
  for (const g of modelo.agrupamentos) {
    if (paiDe(modelo, g.id) == null) emitirAgrupVista(g)
  }
  for (const n of modelo.nos) {
    if (paiDe(modelo, n.id) == null) emitirNoVista(n)
  }

  // Arestas — referenciam as pontas por id (não têm posição própria).
  const presentesAresta = new Set<string>()
  const edges = modelo.conexoes.map((c: Conexao) => {
    presentesAresta.add(c.id)
    const marcado = c.alertas.length > 0
    const chave = `${c.origem}|${c.destino}|${c.texto ?? ''}|${marcado}|${c.conectivo}`
    const ant = cacheAresta.get(c.id)
    if (ant && ant.chave === chave) return ant.valor
    const valor: RFEdge = {
      id: c.id,
      type: 'conexao',
      source: c.origem,
      target: c.destino,
      data: { texto: c.texto, marcado },
    }
    cacheAresta.set(c.id, { chave, valor })
    return valor
  })

  // Higiene: descarta do cache o que sumiu.
  for (const id of cacheNo.keys()) if (!presentesNo.has(id)) cacheNo.delete(id)
  for (const id of cacheAgrup.keys()) if (!presentesAgrup.has(id)) cacheAgrup.delete(id)
  for (const id of cacheAresta.keys()) if (!presentesAresta.has(id)) cacheAresta.delete(id)

  return { nodes, edges }
}
