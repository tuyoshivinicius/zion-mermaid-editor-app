// Sequence — o caso extremo do escopo, declarado suspeito desde o ADR-002 e
// repetido pelo ADR-005 e pelo ADR-006.
//
// É aqui que a hipótese do modelo único é mais tensionada, e por duas razões que
// não têm paralelo nas outras duas famílias:
//
//   1. **A ordem é a semântica.** No Flowchart, `conexoes` é um conjunto: trocar
//      duas arestas de lugar não muda o diagrama, e por isso o `normalizar` do
//      ADR-006 pode ordená-las. Aqui, trocar duas mensagens **muda o diagrama**.
//      Nenhuma normalização do núcleo pode ordenar isto.
//   2. **Bloco é intervalo de tempo, não conjunto de nós.** `subgraph` do
//      Flowchart contém ids de nó. `loop`/`alt`/`opt` contêm uma **faixa da
//      sequência**, aninham, e `alt` ainda tem vários ramos (`else`). É o que o
//      ADR-002 chamou de "índices de tempo que a engine desconhece".
//
// A verdade é uma árvore de itens em ordem temporal (`corpo`). A lista plana de
// eventos é derivada, não guardada — mesma disciplina do ADR-003 para posição.

import { nucleo, normalizarNucleo, porId } from '../../nucleo/modelo.js'

export function vazio() {
  return {
    ...nucleo('sequencia'),
    autonumber: false,
    participantes: [], // { id, rotulo, papel: 'participant'|'actor', alertas: [] }
    corpo: [], // itens em ordem temporal — ver `ITENS`
  }
}

// Um item do corpo é um destes:
//   { especie: 'mensagem', de, para, texto, linha, ponta, ativa, desativa, alertas }
//   { especie: 'nota', posicao: 'right of'|'left of'|'over', alvos: [], texto }
//   { especie: 'ativacao'|'desativacao', alvo }
//   { especie: 'bloco', tipo, ramos: [{ rotulo, itens: [] }] }

/** As dez setas do sequenceDiagram, da mais longa para a mais curta. */
export const SETAS = [
  ['<<-->>', { linha: 'tracejada', ponta: 'bidirecional' }],
  ['<<->>', { linha: 'solida', ponta: 'bidirecional' }],
  ['--)', { linha: 'tracejada', ponta: 'aberta' }],
  ['-)', { linha: 'solida', ponta: 'aberta' }],
  ['--x', { linha: 'tracejada', ponta: 'cruz' }],
  ['-x', { linha: 'solida', ponta: 'cruz' }],
  ['-->>', { linha: 'tracejada', ponta: 'seta' }],
  ['->>', { linha: 'solida', ponta: 'seta' }],
  ['-->', { linha: 'tracejada', ponta: 'nenhuma' }],
  ['->', { linha: 'solida', ponta: 'nenhuma' }],
]

export const BLOCOS = {
  loop: { ramoExtra: null },
  alt: { ramoExtra: 'else' },
  opt: { ramoExtra: null },
  par: { ramoExtra: 'and' },
  critical: { ramoExtra: 'option' },
  break: { ramoExtra: null },
  rect: { ramoExtra: null },
}

export function garantirParticipante(m, id, papel = 'participant') {
  let p = m.participantes.find((x) => x.id === id)
  if (!p) {
    p = { id, rotulo: null, papel, alertas: [] }
    m.participantes.push(p)
  }
  return p
}

/**
 * A lista plana de eventos em ordem temporal. **Derivada**, não guardada — é a
 * vista de linha do tempo que um canvas indexaria, e é o que prova que o modelo
 * carrega ordem de verdade.
 */
export function eventosEmOrdem(m) {
  const fora = []
  const andar = (itens) => {
    for (const it of itens) {
      if (it.especie === 'bloco') {
        for (const ramo of it.ramos) andar(ramo.itens)
      } else fora.push(it)
    }
  }
  andar(m.corpo)
  return fora
}

export function contarMensagens(m) {
  return eventosEmOrdem(m).filter((e) => e.especie === 'mensagem').length
}

/**
 * Comparação estrutural.
 *
 * O contraste com as outras duas famílias é o achado, não um detalhe: aqui
 * **nada do corpo é ordenado**. `participantes` também não — a ordem de
 * declaração é a ordem das colunas, e trocá-la troca o desenho.
 */
export function normalizar(m) {
  return {
    ...normalizarNucleo(m),
    autonumber: m.autonumber,
    participantes: m.participantes.map((p) => ({ id: p.id, rotulo: p.rotulo, papel: p.papel })),
    corpo: m.corpo.map(normalizarItem),
  }
}

function normalizarItem(it) {
  if (it.especie === 'bloco') {
    return {
      especie: 'bloco',
      tipo: it.tipo,
      ramos: it.ramos.map((r) => ({ rotulo: r.rotulo, itens: r.itens.map(normalizarItem) })),
    }
  }
  if (it.especie === 'mensagem') {
    return {
      especie: 'mensagem',
      de: it.de,
      para: it.para,
      texto: it.texto,
      linha: it.linha,
      ponta: it.ponta,
      ativa: it.ativa,
      desativa: it.desativa,
    }
  }
  if (it.especie === 'nota') {
    return { especie: 'nota', posicao: it.posicao, alvos: [...it.alvos], texto: it.texto }
  }
  return { especie: it.especie, alvo: it.alvo }
}

/** Diagrama denso pré-fabricado, para o braço de latência no envelope do ADR-004. */
export function gerarDensoTexto(n, mensagens) {
  const linhas = ['sequenceDiagram']
  for (let i = 1; i <= n; i++) linhas.push(`  participant P${i} as Serviço ${i}`)
  for (let i = 0; i < mensagens; i++) {
    const de = `P${(i % n) + 1}`
    const para = `P${((i * 7 + 1) % n) + 1}`
    if (de !== para) linhas.push(`  ${de}->>${para}: chamada ${i}`)
  }
  return linhas.join('\n')
}
