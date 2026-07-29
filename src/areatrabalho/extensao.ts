// A EXTENSÃO DESENHADA (contracts/extensao-desenhada.md).
//
// A geometria ÚNICA de `FR-008` e `FR-011`. Enquadrar pelas caixas dos nós deixaria
// um laço, um rótulo de conexão ou uma moldura cortados na borda com o gesto se
// dizendo concluído — e faria "está visível" responder sim para um elemento que
// ajustar à tela acabara de cortar. Por isso os dois requisitos leem DAQUI, e só
// daqui: um segundo cálculo é violação de contrato, não otimização.
//
// SUPERSET, NUNCA RECORTE. Uma curva de Bézier está contida no casco convexo dos
// seus pontos de controle: a caixa pode sobrar, não pode faltar.
//
// Esta função LÊ o arranjo (via projeção) e nunca o escreve — é por isso que
// `SC-002` ("0 elementos mudam de posição") é verdadeiro por assinatura.

import { caminhoDaConexao, pontaDeDestino, pontaDeOrigem } from '../canvas/caminho'
import type { Projecao, RFEdge, RFNode } from '../projecao/projetar'
import type { Pos } from '../modelo/arranjo'
import type { Caixa } from './tipos'

/** Medidor de texto injetável — navegador em runtime, determinístico em teste. */
export type MedirTexto = (texto: string) => { w: number; h: number }

// O respiro do rótulo da conexão: `px-1.5 py-0.5` + a borda de 1px que `Conexao.tsx`
// declara. Declarado aqui porque é geometria do desenho, e quem mede precisa dela.
const RECUO_ROTULO = { x: 6 + 1, y: 2 + 1 }
const ALTURA_LINHA = 16 // `text-xs`: 12px de fonte, 16px de linha

let medidorPadrao: MedirTexto | null = null

/**
 * O medidor de runtime: canvas 2D, sem tocar o DOM da página (nada de `getBBox` nem
 * `getBoundingClientRect` — forçariam layout de 500 arestas dentro da barra de 100ms
 * do `SC-012`, e deixariam de funcionar se a virtualização do ADR-004 fosse ligada).
 * Onde não houver canvas, a largura degrada para uma média por caractere: superset
 * continua sendo superset com folga.
 */
function medirComCanvas(): MedirTexto {
  if (medidorPadrao) return medidorPadrao
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    if (ctx) ctx.font = '12px ui-sans-serif, system-ui, sans-serif'
  } catch {
    ctx = null
  }
  medidorPadrao = ctx
    ? (t: string) => ({ w: ctx!.measureText(t).width, h: ALTURA_LINHA })
    : (t: string) => ({ w: t.length * 7.2, h: ALTURA_LINHA })
  return medidorPadrao
}

function uniao(a: Caixa, b: Caixa): Caixa {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  }
}

function caixaDosPontos(pontos: Pos[]): Caixa {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pontos) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Posição ABSOLUTA de um nó: `position` é relativa ao pai quando há `parentId`. */
function absoluta(porId: Map<string, RFNode>, n: RFNode): Pos {
  let x = n.position.x
  let y = n.position.y
  let pai = n.parentId ? porId.get(n.parentId) : undefined
  while (pai) {
    x += pai.position.x
    y += pai.position.y
    pai = pai.parentId ? porId.get(pai.parentId) : undefined
  }
  return { x, y }
}

// ── o cache, chaveado pela IDENTIDADE REFERENCIAL (ADR-004, Princípio III) ────
// Enquanto a projeção reusa, a extensão reusa junto. A aresta guarda também as
// pontas com que foi medida: o objeto da aresta é reusado quando nada que ELA
// enxerga mudou — e a posição das pontas não é uma dessas coisas.

const cacheNo = new WeakMap<RFNode, Caixa>()
const cacheAresta = new WeakMap<RFEdge, { origem: RFNode; destino: RFNode; caixa: Caixa }>()
const cacheTudo = new WeakMap<Projecao, Caixa | null>()
const cacheIndice = new WeakMap<Projecao, Map<string, RFNode>>()

/**
 * O índice por id, memoizado pela identidade da projeção. Sem isto, perguntar
 * `estaNaAreaVisivel` para os 400 elementos em sequência — que é exatamente o que
 * `ciclo-por-teclado` fará — custaria O(n²) em vez de O(n).
 */
function indexar(p: Projecao): Map<string, RFNode> {
  const guardado = cacheIndice.get(p)
  if (guardado) return guardado
  const m = new Map<string, RFNode>()
  for (const n of p.nodes) m.set(n.id, n)
  cacheIndice.set(p, m)
  return m
}

function extensaoDoNo(porId: Map<string, RFNode>, n: RFNode): Caixa {
  const guardada = cacheNo.get(n)
  if (guardada) return guardada
  const abs = absoluta(porId, n)
  // nó = a caixa dele; agrupamento = a MOLDURA (que `projetar` já calculou)
  const caixa: Caixa = { x: abs.x, y: abs.y, w: n.width, h: n.height }
  cacheNo.set(n, caixa)
  return caixa
}

function extensaoDaAresta(
  porId: Map<string, RFNode>,
  c: RFEdge,
  medir: MedirTexto,
): Caixa | null {
  const origem = porId.get(c.source)
  const destino = porId.get(c.target)
  if (!origem || !destino) return null

  const guardada = cacheAresta.get(c)
  if (guardada && guardada.origem === origem && guardada.destino === destino) return guardada.caixa

  const a = pontaDeOrigem(absoluta(porId, origem))
  const b = pontaDeDestino(absoluta(porId, destino))
  // a MESMA função que `Conexao.tsx` usa para pintar
  const cam = caminhoDaConexao({ sourceX: a.x, sourceY: a.y, targetX: b.x, targetY: b.y })

  let caixa = caixaDosPontos(cam.pontos)

  // o rótulo: caixa centrada em (labelX, labelY). O vazio também desenha ('＋'),
  // então também conta — a extensão é a UNIÃO do traçado com o rótulo.
  const texto = c.data.texto ?? '＋'
  const m = medir(texto)
  const w = m.w + 2 * RECUO_ROTULO.x
  const h = m.h + 2 * RECUO_ROTULO.y
  caixa = uniao(caixa, { x: cam.labelX - w / 2, y: cam.labelY - h / 2, w, h })

  cacheAresta.set(c, { origem, destino, caixa })
  return caixa
}

/** A extensão desenhada de UM elemento — nó, conexão ou agrupamento. Regra única. */
export function extensaoDoElemento(
  p: Projecao,
  id: string,
  medir: MedirTexto = medirComCanvas(),
): Caixa | null {
  const porId = indexar(p)
  const n = porId.get(id)
  if (n) return extensaoDoNo(porId, n)
  const c = p.edges.find((e) => e.id === id)
  return c ? extensaoDaAresta(porId, c, medir) : null
}

/** A extensão desenhada do diagrama INTEIRO. `null` ⇔ diagrama vazio. */
export function extensaoDesenhada(
  p: Projecao,
  medir: MedirTexto = medirComCanvas(),
): Caixa | null {
  if (cacheTudo.has(p)) return cacheTudo.get(p) ?? null

  const porId = indexar(p)
  let tudo: Caixa | null = null
  for (const n of p.nodes) tudo = tudo ? uniao(tudo, extensaoDoNo(porId, n)) : extensaoDoNo(porId, n)
  for (const c of p.edges) {
    const e = extensaoDaAresta(porId, c, medir)
    if (e) tudo = tudo ? uniao(tudo, e) : e
  }

  cacheTudo.set(p, tudo)
  return tudo
}
