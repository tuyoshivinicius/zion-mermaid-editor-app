// Projeção modelo -> nós/arestas da engine. O canvas é vista; a engine nunca é
// fonte (ADR-002/ADR-003). A posição nasce aqui, derivada do índice — não existe
// no modelo.
//
// `memo` liga o reuso do objeto de nó quando nada que a vista enxerga mudou. É
// restrição de arquitetura fixada pelo ADR-004, e aqui vira variável
// independente: o braço `memo=0` responde se o foco do teclado sobrevive quando
// a projeção devolve objeto novo a cada tecla.

export const COLS = 5
export const COL_W = 260
export const ROW_H = 150
export const CAIXA_W = 190
export const CAIXA_H = 64

export const posicaoDoIndice = (i) => ({
  x: (i % COLS) * COL_W,
  y: Math.floor(i / COLS) * ROW_H,
})

const cache = new Map()

function comCache(id, chave, montar, memo) {
  if (memo) {
    const ant = cache.get(id)
    if (ant && ant.chave === chave) return ant.valor
  }
  const valor = montar()
  if (memo) cache.set(id, { chave, valor })
  return valor
}

/**
 * @param foco  descritor do estado de teclado que a vista precisa enxergar:
 *              { noEditando, conexaoEditando, noFocado, alvo }
 */
export function projetar(modelo, memo, foco, rotulavel = 1) {
  const nodes = modelo.nos.map((n, i) => {
    const pos = posicaoDoIndice(i)
    const editando = foco.noEditando === n.id
    const focado = foco.noFocado === n.id
    const alvo = foco.alvo === n.id
    const chave = `${n.rotulo}|${pos.x}|${pos.y}|${editando}|${focado}|${alvo}`
    return comCache(
      n.id,
      chave,
      () => ({
        id: n.id,
        type: 'caixa',
        position: pos,
        width: CAIXA_W,
        height: CAIXA_H,
        data: { rotulo: n.rotulo, editando, focado, alvo },
      }),
      memo,
    )
  })

  // Três desenhos de aresta, porque a medição precisa separar de quem é o custo:
  //   1 (própria)  — componente + portal de rótulo em TODAS as conexões.
  //   0 (embutida) — aresta da engine em todas; braço de controle, não serve ao
  //                  produto porque o rótulo deixa de ser editável.
  //   2 (híbrida)  — embutida em todas, própria só na que está em edição.
  const edges = modelo.conexoes.map((c) => {
    const editando = foco.conexaoEditando === c.id
    const propria = rotulavel === 1 || (rotulavel === 2 && editando)
    return comCache(
      c.id,
      `${c.de}|${c.para}|${c.rotulo}|${editando}|${propria}`,
      () =>
        propria
          ? {
              id: c.id,
              source: c.de,
              target: c.para,
              type: 'rotulada',
              data: { rotulo: c.rotulo, editando },
            }
          : {
              id: c.id,
              source: c.de,
              target: c.para,
              type: 'default',
              label: c.rotulo || undefined,
            },
      memo,
    )
  })

  return { nodes, edges }
}
