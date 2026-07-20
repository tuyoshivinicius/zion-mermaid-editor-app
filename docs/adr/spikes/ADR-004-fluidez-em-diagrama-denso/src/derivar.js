// Derivação modelo -> nós/arestas da engine. O canvas é projeção; a engine
// nunca é fonte. Roda a cada mudança do modelo — é justamente esse caminho que
// o spike cronometra.
//
// `memo` liga o reuso do objeto de nó quando nada que a vista enxerga mudou.
// É a variável independente do braço "custo da projeção ingênua": sem ela,
// todo objeto de nó é novo a cada tecla e a engine remonta o mundo inteiro.

export const COL_W = 260
export const ROW_H = 150
export const CAIXA_W = 190
export const CAIXA_H = 64

export const SEQ_COL_W = 220
export const SEQ_ROW_H = 54
export const SEQ_HEAD_H = 48
export const SEQ_CENTRO = 90

export const linhaY = (i) => SEQ_HEAD_H + 30 + i * SEQ_ROW_H

const cache = new Map()

function comCache(chaveId, chave, montar, memo) {
  if (memo) {
    const ant = cache.get(chaveId)
    if (ant && ant.chave === chave) return ant.valor
  }
  const valor = montar()
  if (memo) cache.set(chaveId, { chave, valor })
  return valor
}

export function derivar(modelo, memo) {
  return modelo.tipo === 'flowchart'
    ? derivarFlowchart(modelo, memo)
    : derivarSequence(modelo, memo)
}

function derivarFlowchart(m, memo) {
  const { cols } = m
  const nodes = m.nodes.map((n, i) => {
    const pos = m.posicoes[n.id] ?? {
      x: (i % cols) * COL_W,
      y: Math.floor(i / cols) * ROW_H,
    }
    const chave = `${n.label}|${n.shape}|${pos.x}|${pos.y}`
    return comCache(
      n.id,
      chave,
      () => ({
        id: n.id,
        type: 'caixa',
        position: pos,
        width: CAIXA_W,
        height: CAIXA_H,
        data: { label: n.label, shape: n.shape },
      }),
      memo,
    )
  })

  const edges = m.edges.map((e) =>
    comCache(
      e.id,
      `${e.from}|${e.to}|${e.label}`,
      () => ({
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.label || undefined,
        type: 'default',
      }),
      memo,
    ),
  )

  return { nodes, edges }
}

function derivarSequence(m, memo) {
  const linhas = m.messages.length + 1
  const altura = linhaY(linhas) + 40

  const nodes = m.participants.map((p, i) => {
    const pos = m.posicoes[p.id] ?? { x: i * SEQ_COL_W, y: 0 }
    const chave = `${p.name}|${linhas}|${pos.x}|${pos.y}`
    return comCache(
      p.id,
      chave,
      () => ({
        id: p.id,
        type: 'participante',
        position: pos,
        width: SEQ_CENTRO * 2,
        height: altura,
        data: { name: p.name, linhas, altura },
      }),
      memo,
    )
  })

  const edges = m.messages.map((msg, i) =>
    comCache(
      msg.id,
      `${msg.from}|${msg.to}|${msg.label}|${i}`,
      () => ({
        id: msg.id,
        source: msg.from,
        target: msg.to,
        sourceHandle: `linha-${i}`,
        targetHandle: `linha-${i}`,
        label: msg.label,
        type: 'straight',
      }),
      memo,
    ),
  )

  return { nodes, edges }
}
