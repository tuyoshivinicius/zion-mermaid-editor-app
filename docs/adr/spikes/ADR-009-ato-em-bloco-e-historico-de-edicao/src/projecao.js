// Projeção modelo -> nós/arestas da engine, agora **agnóstica de família**.
//
// É a peça que responde à metade prática da pergunta do ADR-008: se o canvas
// consegue ser um só para os três tipos, ou se cada família exige a sua vista.
// A projeção não sabe de que tipo é o documento — pede a vista genérica ao
// registro e desenha o que vier.
//
// O reuso de objeto continua sendo a invariante que o ADR-004 fixou por
// latência, o ADR-005 por correção de foco e o ADR-006 reencontrou na entrada
// por texto. `memo=0` continua sendo braço de medição, não conveniência.

import { vista } from './registro.js'

export const COL_W = 240
export const ROW_H = 150
export const CAIXA_W = 190
export const CAIXA_H = 52

const colunasPara = (n) => Math.min(20, Math.max(3, Math.ceil(Math.sqrt(n * 1.6))))

export const posicaoDoIndice = (i, cols) => ({
  x: (i % cols) * COL_W,
  y: Math.floor(i / cols) * ROW_H,
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

export function limparCache() {
  cache.clear()
}

/**
 * Única alteração deste spike sobre a projeção do ADR-008: o terceiro argumento.
 *
 * `posicoes` é a sobreposição de estado de sessão que o ADR-007 fixou — a
 * posição que a pessoa arrastou, que vive fora do modelo e não viaja no código.
 * Ela entra **na chave do cache**, e não por fora dele: sobrepor posição depois
 * de projetar remontaria todo nó a cada render e quebraria a invariante de reuso
 * do ADR-004 justamente no gesto mais frequente.
 */
export function projetar(modelo, memo = true, posicoes = null) {
  const v = vista(modelo)
  const cols = colunasPara(v.nos.length)

  const nodes = v.nos.map((n, i) => {
    const pos = (posicoes && posicoes[n.id]) || posicaoDoIndice(i, cols)
    // O corpo do nó entra na chave de cache: em Class, mudar um membro tem que
    // remontar o nó, e nas outras famílias `linhas` é vazio e não custa nada.
    const chave = `${n.rotulo}|${n.linhas.join('')}|${n.marcado}|${pos.x}|${pos.y}`
    return comCache(
      n.id,
      chave,
      () => ({
        id: n.id,
        type: 'caixa',
        position: pos,
        width: CAIXA_W,
        height: CAIXA_H + n.linhas.length * 16,
        data: { rotulo: n.rotulo, linhas: n.linhas, marcado: n.marcado },
      }),
      memo,
    )
  })

  const edges = v.ligacoes.map((c) =>
    comCache(
      c.id,
      `${c.de}|${c.para}|${c.rotulo}|${c.instante ?? ''}`,
      () => ({
        id: c.id,
        source: c.de,
        target: c.para,
        label: c.rotulo || undefined,
      }),
      memo,
    ),
  )

  return { nodes, edges }
}
