// Derivação modelo -> vocabulário da engine (nós + arestas com coordenada).
// Roda a cada mudança do modelo. É a camada que o spike quer medir: quanto
// código próprio é preciso escrever para traduzir "sequência temporal" em
// "grafo posicionado".

export const COL_W = 220 // passo entre colunas
export const NODE_W = 160 // largura do nó participante
export const CENTRO = NODE_W / 2 // x da lifeline dentro do nó
export const HEAD_H = 48 // altura da caixa do participante
export const TOPO = 56 // folga entre a caixa e a primeira mensagem
export const ROW_H = 64 // passo vertical entre mensagens
export const RODAPE = 72

export const colunaX = (i) => i * COL_W
export const linhaY = (i) => HEAD_H + TOPO + i * ROW_H

/** Instante mais próximo de uma coordenada y da tela do fluxo. */
export const yParaLinha = (y) => Math.round((y - HEAD_H - TOPO) / ROW_H)

export function alturaLifeline(modelo) {
  return linhaY(Math.max(modelo.messages.length - 1, 0)) + RODAPE
}

export function derivar(modelo) {
  const alt = alturaLifeline(modelo)
  const nLinhas = modelo.messages.length + 1 // +1 = ancoragem para criar no fim
  const colDe = new Map(modelo.participants.map((p, i) => [p.id, i]))

  const fragmentos = modelo.fragments.map((f) => {
    const x = -28
    const largura = (modelo.participants.length - 1) * COL_W + NODE_W + 56
    const y = linhaY(f.from) - 34
    const altura = linhaY(f.to) - linhaY(f.from) + 62
    return {
      id: f.id,
      type: 'fragmento',
      position: { x, y },
      data: { kind: f.kind, label: f.label },
      style: { width: largura, height: altura },
      draggable: false,
      selectable: false,
      zIndex: -1,
    }
  })

  const participantes = modelo.participants.map((p, i) => ({
    id: p.id,
    type: 'participante',
    position: { x: colunaX(i), y: 0 },
    data: {
      name: p.name,
      altura: alt,
      linhas: nLinhas,
      ativacoes: modelo.activations.filter((a) => a.participant === p.id),
    },
    style: { width: NODE_W, height: alt },
    zIndex: 1,
  }))

  const arestas = modelo.messages.map((m, i) => {
    const auto = m.from === m.to
    return {
      id: m.id,
      type: 'mensagem',
      source: m.from,
      target: m.to,
      sourceHandle: `linha-${i}`,
      targetHandle: `linha-${i}`,
      reconnectable: true,
      zIndex: 2,
      data: {
        label: m.label,
        arrow: auto ? 'self' : m.arrow,
        instante: i,
        auto,
        paraEsquerda: (colDe.get(m.to) ?? 0) < (colDe.get(m.from) ?? 0),
      },
    }
  })

  return { nodes: [...fragmentos, ...participantes], edges: arestas }
}
