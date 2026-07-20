// O que este spike acrescenta ao ADR-006: a posição.
//
// O modelo do ADR-003/006 não guarda coordenada — de propósito, porque o
// discovery diz que "a posição é conforto de sessão" e que ela "não viaja no
// código". Mas alguma coisa precisa decidir onde a caixa aparece, e até aqui
// isso foi grade fixa em todos os spikes (ADR-004, 005 e 006 dizem isso por
// escrito). Este módulo é o motor de layout entrando no lugar da grade.
//
// Três motores, porque o discovery pede dois no `### Faz` ("layout hierárquico/
// adaptativo") e o terceiro é o braço de controle:
//
//   dagre            — hierárquico. É a família que o mermaid usa por padrão.
//   elk              — adaptativo (`elk.algorithm: layered`). É o que o mermaid
//                      oferece via `@mermaid-js/layout-elk`.
//   elk-interativo   — o mesmo elk, com `elk.interactive`, que lê as posições
//                      atuais como dica de ordenação. Existe para responder à
//                      pergunta que o discovery levanta e nenhum ADR respondeu:
//                      o que acontece com o que a pessoa moveu à mão quando o
//                      layout roda de novo?
//
// Todas as funções devolvem o mesmo formato — um mapa id -> {x, y} no canto
// superior esquerdo (a convenção da engine), mais o custo em ms — para que os
// braços sejam comparáveis entre si sem adaptador no meio.

import dagre from '@dagrejs/dagre'
import ELK from 'elkjs/lib/elk.bundled.js'

export const CAIXA_W = 170
export const CAIXA_H = 52

// Mantidos iguais entre os motores: comparar motor com espaçamento diferente
// mediria o espaçamento, não o motor.
const SEP_NO = 50
const SEP_RANK = 70

/** As quatro orientações que o `### Faz` do discovery exige, por motor. */
export const ORIENTACOES = ['TB', 'BT', 'LR', 'RL']

const DAGRE_RANKDIR = { TB: 'TB', TD: 'TB', BT: 'BT', LR: 'LR', RL: 'RL' }
const ELK_DIRECAO = { TB: 'DOWN', TD: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' }

const agora = () =>
  typeof performance !== 'undefined' ? performance.now() : Number(process.hrtime.bigint()) / 1e6

/**
 * O grafo que os três motores recebem, extraído do modelo do ADR-006.
 * Conexão que aponta para nó inexistente é descartada aqui — o parser tolerante
 * do ADR-006 aceita esse estado durante a digitação, e um motor de layout que
 * recebe aresta órfã quebra.
 */
function grafoDo(modelo) {
  const ids = new Set(modelo.nos.map((n) => n.id))
  return {
    nos: modelo.nos.map((n) => n.id),
    arestas: modelo.conexoes
      .filter((c) => ids.has(c.de) && ids.has(c.para) && c.de !== c.para)
      .map((c, i) => ({ id: c.id || `e${i}`, de: c.de, para: c.para })),
  }
}

// ─── dagre ───────────────────────────────────────────────────────────────────

export function layoutDagre(modelo, { orientacao = 'TB' } = {}) {
  const { nos, arestas } = grafoDo(modelo)
  const t0 = agora()

  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({ rankdir: DAGRE_RANKDIR[orientacao] || 'TB', nodesep: SEP_NO, ranksep: SEP_RANK })
  g.setDefaultEdgeLabel(() => ({}))
  for (const id of nos) g.setNode(id, { width: CAIXA_W, height: CAIXA_H })
  for (const a of arestas) g.setEdge(a.de, a.para, {}, a.id)

  dagre.layout(g)

  const posicoes = new Map()
  for (const id of nos) {
    const n = g.node(id)
    // dagre devolve o centro; a engine quer o canto superior esquerdo.
    posicoes.set(id, { x: n.x - CAIXA_W / 2, y: n.y - CAIXA_H / 2 })
  }
  return { posicoes, ms: agora() - t0, motor: 'dagre' }
}

// ─── elk ─────────────────────────────────────────────────────────────────────

const elk = new ELK()

export async function layoutElk(modelo, { orientacao = 'TB', interativo = false, anteriores = null } = {}) {
  const { nos, arestas } = grafoDo(modelo)
  const t0 = agora()

  const grafo = {
    id: 'raiz',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ELK_DIRECAO[orientacao] || 'DOWN',
      'elk.spacing.nodeNode': String(SEP_NO),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(SEP_RANK),
      // O modo interativo faz o ELK ler a posição atual de cada nó como dica de
      // ordenação, em vez de reordenar do zero. É o braço que responde se o
      // trabalho manual da pessoa sobrevive a um re-layout.
      ...(interativo
        ? {
            'elk.interactive': 'true',
            'elk.layered.cycleBreaking.strategy': 'INTERACTIVE',
            'elk.layered.layering.strategy': 'INTERACTIVE',
            'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
            'elk.layered.nodePlacement.strategy': 'INTERACTIVE',
          }
        : {}),
    },
    children: nos.map((id) => {
      const filho = { id, width: CAIXA_W, height: CAIXA_H }
      if (interativo && anteriores && anteriores.has(id)) {
        const p = anteriores.get(id)
        filho.x = p.x
        filho.y = p.y
      }
      return filho
    }),
    edges: arestas.map((a) => ({ id: a.id, sources: [a.de], targets: [a.para] })),
  }

  const saida = await elk.layout(grafo)
  const posicoes = new Map()
  for (const f of saida.children || []) posicoes.set(f.id, { x: f.x, y: f.y })
  return { posicoes, ms: agora() - t0, motor: interativo ? 'elk-interativo' : 'elk' }
}

// ─── colocação local ─────────────────────────────────────────────────────────

/**
 * O desenho alternativo, e o motivo de ele existir: o ADR-005 provou o ciclo
 * principal por teclado, onde a pessoa cria um nó por vez. Se cada nó novo
 * dispara um layout global, o custo do layout entra dentro do orçamento da
 * tecla — e o diagrama inteiro se reorganiza embaixo da mão dela.
 *
 * A colocação local não roda motor nenhum: põe o nó novo adjacente à origem da
 * conexão que o criou, na direção da orientação, e não toca em mais nada.
 */
export function colocacaoLocal(posicoes, origemId, novoId, { orientacao = 'TB' } = {}) {
  const t0 = agora()
  const base = posicoes.get(origemId) || { x: 0, y: 0 }
  const delta = {
    TB: { x: 0, y: CAIXA_H + SEP_RANK },
    TD: { x: 0, y: CAIXA_H + SEP_RANK },
    BT: { x: 0, y: -(CAIXA_H + SEP_RANK) },
    LR: { x: CAIXA_W + SEP_RANK, y: 0 },
    RL: { x: -(CAIXA_W + SEP_RANK), y: 0 },
  }[orientacao] || { x: 0, y: CAIXA_H + SEP_RANK }

  let alvo = { x: base.x + delta.x, y: base.y + delta.y }
  // Desempate simples: se já tem alguém ali, desloca lateralmente. Não é
  // resolução de colisão de verdade; é o bastante para o nó novo não nascer
  // exatamente em cima de um irmão.
  const ocupado = (p) =>
    [...posicoes.values()].some((q) => Math.abs(q.x - p.x) < CAIXA_W && Math.abs(q.y - p.y) < CAIXA_H)
  let guarda = 0
  while (ocupado(alvo) && guarda++ < 50) {
    if (orientacao === 'LR' || orientacao === 'RL') alvo = { x: alvo.x, y: alvo.y + CAIXA_H + SEP_NO }
    else alvo = { x: alvo.x + CAIXA_W + SEP_NO, y: alvo.y }
  }

  const saida = new Map(posicoes)
  saida.set(novoId, alvo)
  return { posicoes: saida, ms: agora() - t0, motor: 'local' }
}

// ─── comparação de layouts ───────────────────────────────────────────────────

/** Move o conjunto para que o canto superior esquerdo do bounding box seja (0,0). */
export function normalizarTranslacao(posicoes) {
  if (!posicoes.size) return new Map()
  let minX = Infinity
  let minY = Infinity
  for (const p of posicoes.values()) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
  }
  const saida = new Map()
  for (const [id, p] of posicoes) saida.set(id, { x: p.x - minX, y: p.y - minY })
  return saida
}

/**
 * Quanto do diagrama existente se mexeu entre dois layouts.
 *
 * Mede duas vezes de propósito: `movidos` conta qualquer deslocamento, e
 * `movidosNormalizado` desconta a translação do conjunto inteiro. A diferença
 * entre os dois separa "o diagrama foi reorganizado" de "o diagrama inteiro
 * andou de lado" — que uma câmera que acompanha esconde e uma câmera parada não.
 */
export function churn(antes, depois, { tolerancia = 1 } = {}) {
  const comuns = [...antes.keys()].filter((id) => depois.has(id))
  const conta = (a, b) => {
    let movidos = 0
    let somaDist = 0
    const dists = []
    for (const id of comuns) {
      const p = a.get(id)
      const q = b.get(id)
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      dists.push(d)
      if (d > tolerancia) movidos++
      somaDist += d
    }
    return { movidos, distMedia: comuns.length ? somaDist / comuns.length : 0, dists }
  }
  const bruto = conta(antes, depois)
  const norm = conta(normalizarTranslacao(antes), normalizarTranslacao(depois))
  return {
    comuns: comuns.length,
    movidos: bruto.movidos,
    movidosNormalizado: norm.movidos,
    distMedia: bruto.distMedia,
    distMediaNormalizado: norm.distMedia,
    distMaxNormalizado: norm.dists.length ? Math.max(...norm.dists) : 0,
  }
}

/**
 * A ordem de leitura do diagrama, que é o que sobrevive a diferença de escala.
 * Dois layouts com caixas de tamanhos diferentes nunca terão as mesmas
 * coordenadas; podem ter a mesma ordem — e é a ordem que a pessoa reconhece
 * como "é o mesmo diagrama".
 */
export function ordemDeLeitura(posicoes, orientacao = 'TB') {
  const eixoPrincipal = orientacao === 'LR' || orientacao === 'RL' ? 'x' : 'y'
  const eixoSecundario = eixoPrincipal === 'x' ? 'y' : 'x'
  const sinal = orientacao === 'BT' || orientacao === 'RL' ? -1 : 1
  return [...posicoes.entries()]
    .sort((a, b) => {
      const d = sinal * (a[1][eixoPrincipal] - b[1][eixoPrincipal])
      if (Math.abs(d) > 1) return d
      return a[1][eixoSecundario] - b[1][eixoSecundario]
    })
    .map(([id]) => id)
}

/**
 * Pares de caixas que se sobrepõem. É o preço do desenho híbrido: reimpor a
 * posição que a pessoa escolheu por cima de um layout calculado sem ela produz
 * caixa em cima de caixa, e isso precisa ter número.
 */
export function colisoes(posicoes) {
  const itens = [...posicoes.entries()]
  let pares = 0
  for (let i = 0; i < itens.length; i++) {
    for (let j = i + 1; j < itens.length; j++) {
      const a = itens[i][1]
      const b = itens[j][1]
      if (Math.abs(a.x - b.x) < CAIXA_W && Math.abs(a.y - b.y) < CAIXA_H) pares++
    }
  }
  return pares
}

/**
 * O desenho híbrido: roda o layout global e reimpõe por cima as posições que a
 * pessoa escolheu à mão. Preserva o trabalho dela por construção — a pergunta
 * que o spike faz é quanto isso custa em caixa sobreposta.
 */
export function hibrido(calculado, manuais) {
  const saida = new Map(calculado)
  for (const [id, p] of manuais) if (saida.has(id)) saida.set(id, p)
  return saida
}

/** Distância de Kendall-tau normalizada: 0 = mesma ordem, 1 = ordem invertida. */
export function discordanciaDeOrdem(ordemA, ordemB) {
  const comuns = ordemA.filter((id) => ordemB.includes(id))
  const posB = new Map(ordemB.map((id, i) => [id, i]))
  let discordantes = 0
  let pares = 0
  for (let i = 0; i < comuns.length; i++) {
    for (let j = i + 1; j < comuns.length; j++) {
      pares++
      if (posB.get(comuns[i]) > posB.get(comuns[j])) discordantes++
    }
  }
  return { pares, discordantes, taxa: pares ? discordantes / pares : 0 }
}
