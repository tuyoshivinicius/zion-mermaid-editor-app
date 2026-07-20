// Projeção modelo -> nós/arestas da engine. Idêntica em disciplina à do ADR-005:
// o canvas é vista, a engine nunca é fonte, e a posição nasce aqui (derivada do
// índice) porque não existe no modelo.
//
// O reuso de objeto é a invariante que o ADR-004 fixou por latência e o ADR-005
// reencontrou por correção. Aqui ela é braço de medição: `memo=0` responde
// quanto do custo da tecla é projeção e quanto é a engine.

export const COL_W = 220
export const ROW_H = 120
export const CAIXA_W = 170
export const CAIXA_H = 52

// Grade quadrada, limitada a 20 colunas. Diagrama pequeno cabe na tela (a
// captura precisa mostrar o que afirma); o cenário denso continua em 20 colunas,
// igual ao que o ADR-004 mediu.
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

export function projetar(modelo, memo = true) {
  const cols = colunasPara(modelo.nos.length)
  const nodes = modelo.nos.map((n, i) => {
    const pos = posicaoDoIndice(i, cols)
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
