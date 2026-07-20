// Class — a família **nós estruturados** do discovery.
//
// O que muda em relação ao Flowchart do ADR-006, e é a razão de este tipo estar
// no spike: no Flowchart o nó tem `rotulo: string`. Aqui o nó tem **corpo** —
// uma lista ordenada de membros, cada um com visibilidade, tipo e classificador.
// O rótulo deixa de ser folha e vira agregado.
//
// Se o modelo único do ADR-003 se estende, é aqui que ele mostra a primeira
// dobra: `membros` não tem paralelo no vocabulário de nó/aresta.

import { nucleo, normalizarNucleo, porId } from '../../nucleo/modelo.js'

export function vazio() {
  return {
    ...nucleo('classe'),
    direcao: null, // TB/BT/LR/RL — opcional em class diagram
    classes: [],
    // { id, generico, anotacao, membros: [], classesCss: [], estilo, alertas: [] }
    relacoes: [],
    // { id, de, para, linha, pontaDe, pontaPara, cardDe, cardPara, rotulo, alertas: [] }
    namespaces: [], // { id, classes: [] }
    notas: [], // { alvo, texto }
    classDefs: [], // { nome, corpo }
  }
}

/** As oito pontas de relação do class diagram, e o que cada uma significa. */
export const PONTAS = {
  '<|': 'herança',
  '|>': 'herança',
  '*': 'composição',
  o: 'agregação',
  '<': 'associação',
  '>': 'associação',
}

export function garantirClasse(m, id) {
  let c = m.classes.find((x) => x.id === id)
  if (!c) {
    c = {
      id,
      generico: null,
      rotulo: null,
      anotacao: null,
      membros: [],
      classesCss: [],
      estilo: null,
      alertas: [],
    }
    m.classes.push(c)
  }
  return c
}

/**
 * Comparação estrutural. Note o contraste com a sequência: aqui **ordenar é
 * seguro** — a ordem de declaração das classes e relações não muda o diagrama,
 * exatamente como no Flowchart. O corpo da classe é a exceção: `membros` é
 * ordenado e a ordem aparece no desenho, então não é ordenado aqui.
 */
export function normalizar(m) {
  return {
    ...normalizarNucleo(m),
    direcao: m.direcao,
    classes: [...m.classes]
      .map((c) => ({
        id: c.id,
        generico: c.generico,
        rotulo: c.rotulo,
        anotacao: c.anotacao,
        membros: c.membros.map(chaveMembro), // ordem preservada: é semântica
        classesCss: [...c.classesCss].sort(),
        estilo: c.estilo,
      }))
      .sort(porId),
    relacoes: [...m.relacoes]
      .map((r) => ({
        de: r.de,
        para: r.para,
        linha: r.linha,
        pontaDe: r.pontaDe,
        pontaPara: r.pontaPara,
        cardDe: r.cardDe,
        cardPara: r.cardPara,
        rotulo: r.rotulo,
      }))
      .sort((a, b) => (chaveRelacao(a) < chaveRelacao(b) ? -1 : 1)),
    namespaces: [...m.namespaces]
      .map((n) => ({ id: n.id, classes: [...n.classes].sort() }))
      .sort(porId),
    notas: [...m.notas].map((n) => `${n.alvo ?? ''}:${n.texto}`).sort(),
    classDefs: [...m.classDefs].map((c) => `${c.nome}:${c.corpo}`).sort(),
  }
}

export const chaveMembro = (mb) =>
  `${mb.visibilidade ?? ''}${mb.corpo}${mb.classificador ?? ''}:${mb.especie}`

const chaveRelacao = (r) =>
  `${r.de}>${r.para}>${r.linha}>${r.pontaDe}>${r.pontaPara}>${r.cardDe}>${r.cardPara}>${r.rotulo}`

/** Diagrama denso pré-fabricado, para o braço de latência no envelope do ADR-004. */
export function gerarDensoTexto(n, relacoes) {
  const linhas = ['classDiagram']
  for (let i = 1; i <= n; i++) {
    linhas.push(`  class C${i} {`)
    linhas.push(`    +String campo${i}`)
    linhas.push(`    +operar${i}() bool`)
    linhas.push('  }')
  }
  for (let i = 0; i < relacoes; i++) {
    const de = `C${(i % n) + 1}`
    const para = `C${((i * 7 + 1) % n) + 1}`
    if (de !== para) linhas.push(`  ${de} --> ${para} : usa${i}`)
  }
  return linhas.join('\n')
}
