// Projeção modelo -> nós/arestas da engine. Herdada do ADR-005/006 com uma só
// mudança: a posição não é mais derivada do índice numa grade fixa — ela vem do
// motor de layout.
//
// A invariante do reuso de objeto continua aqui, e este spike é o quarto dono
// dela: o ADR-004 a fixou por latência de gesto, o ADR-005 por correção do foco
// por teclado, o ADR-006 pelo braço de entrada por texto. Agora ela ganha um
// inimigo novo — o layout global muda a posição de quase todo nó, e posição faz
// parte da chave de cache. Um layout global invalida o cache inteiro por
// construção, e é por isso que `motor=dagre` e `motor=local` medem coisas
// diferentes mesmo com `memo=1`.

import { CAIXA_H, CAIXA_W } from './layout.js'

export { CAIXA_H, CAIXA_W }

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

export function limparCache() {
  cache.clear()
}

export function projetar(modelo, posicoes, memo = true) {
  const nodes = modelo.nos.map((n) => {
    const pos = posicoes.get(n.id) || { x: 0, y: 0 }
    const rotulo = n.rotulo ?? n.id
    const marcado = n.alertas.length > 0
    return comCache(
      n.id,
      `${rotulo}|${n.forma}|${marcado}|${pos.x}|${pos.y}`,
      () => ({
        id: n.id,
        type: 'caixa',
        position: pos,
        width: CAIXA_W,
        height: CAIXA_H,
        data: { rotulo, forma: n.forma, marcado },
      }),
      memo,
    )
  })

  const edges = modelo.conexoes.map((c) =>
    comCache(
      c.id,
      `${c.de}|${c.para}|${c.rotulo}|${c.tipo}|${c.cabeca}`,
      () => ({
        id: c.id,
        source: c.de,
        target: c.para,
        label: c.rotulo || undefined,
        animated: c.tipo === 'pontilhada',
      }),
      memo,
    ),
  )

  return { nodes, edges }
}
