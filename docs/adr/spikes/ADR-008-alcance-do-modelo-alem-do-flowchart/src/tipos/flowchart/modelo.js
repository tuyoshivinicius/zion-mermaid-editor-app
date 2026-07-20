// A verdade do spike. Mesma disciplina dos ADR-003/004/005: modelo de domínio
// próprio, agnóstico de vista, **sem coordenada** — a posição é derivada na
// projeção, nunca guardada aqui.
//
// A novidade deste spike é o campo `preservado`: a ADR-003 recomendou guardar
// `%%{init}%%` e frontmatter YAML como **sintaxe preservada** (padrão lossless),
// e registrou por escrito que essa recomendação era *transferência de padrão*,
// não observação sobre mermaid. Aqui ela vira estrutura executável, para que a
// verificação diga se sobrevive ao ciclo.

export function vazio() {
  return {
    palavraChave: 'flowchart', // `flowchart` ou `graph` — mermaid aceita os dois
    orientacao: 'TD',
    preservado: {
      frontmatter: null, // bloco YAML cru, incluindo os `---`
      diretivas: [], // linhas `%%{init: ...}%%` cruas
      comentarios: [], // { indice, texto } — `indice` é a ordem de statement onde apareceu
    },
    nos: [], // { id, rotulo, forma, classes: [], estilo, alertas: [] }
    conexoes: [], // { id, de, para, rotulo, tipo, cabeca, comprimento, estilo, alertas: [] }
    grupos: [], // { id, rotulo, direcao, nos: [], grupos: [] }
    classDefs: [], // { nome, corpo }
    linkStyles: [], // { alvo, corpo }
    cliques: [], // { id, corpo }
  }
}

export const FORMAS = {
  retangulo: ['[', ']'],
  arredondado: ['(', ')'],
  estadio: ['([', '])'],
  subrotina: ['[[', ']]'],
  cilindro: ['[(', ')]'],
  circulo: ['((', '))'],
  circuloDuplo: ['(((', ')))'],
  losango: ['{', '}'],
  hexagono: ['{{', '}}'],
  paralelogramo: ['[/', '/]'],
  paralelogramoAlt: ['[\\', '\\]'],
  trapezio: ['[/', '\\]'],
  trapezioAlt: ['[\\', '/]'],
  assimetrico: ['>', ']'],
  nenhuma: ['', ''], // nó citado sem definição de forma/rótulo
}

export function acharNo(m, id) {
  return m.nos.find((n) => n.id === id) || null
}

export function garantirNo(m, id) {
  let n = acharNo(m, id)
  if (!n) {
    n = { id, rotulo: null, forma: 'nenhuma', classes: [], estilo: null, alertas: [] }
    m.nos.push(n)
  }
  return n
}

/**
 * Comparação estrutural do modelo, ignorando o que é ruído de ordem.
 * É o juiz do round-trip: dois modelos iguais aqui significam que o texto que
 * saiu descreve o mesmo diagrama que o texto que entrou.
 */
export function normalizar(m) {
  return {
    palavraChave: m.palavraChave,
    orientacao: m.orientacao,
    preservado: {
      frontmatter: m.preservado.frontmatter,
      diretivas: [...m.preservado.diretivas].sort(),
    },
    nos: [...m.nos]
      .map((n) => ({
        id: n.id,
        rotulo: n.rotulo,
        forma: n.forma,
        classes: [...n.classes].sort(),
        estilo: n.estilo,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    conexoes: [...m.conexoes]
      .map((c) => ({
        de: c.de,
        para: c.para,
        rotulo: c.rotulo,
        tipo: c.tipo,
        cauda: c.cauda,
        cabeca: c.cabeca,
        comprimento: c.comprimento,
      }))
      .sort((a, b) => (chaveConexao(a) < chaveConexao(b) ? -1 : 1)),
    grupos: [...m.grupos]
      .map(normalizarGrupo)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    classDefs: [...m.classDefs].map((c) => `${c.nome}:${c.corpo}`).sort(),
    linkStyles: [...m.linkStyles].map((l) => `${l.alvo}:${l.corpo}`).sort(),
    cliques: [...m.cliques].map((c) => `${c.id}:${c.corpo}`).sort(),
  }
}

const chaveConexao = (c) =>
  `${c.de}>${c.para}>${c.rotulo}>${c.tipo}>${c.cauda}>${c.cabeca}>${c.comprimento}`

function normalizarGrupo(g) {
  return {
    id: g.id,
    rotulo: g.rotulo,
    direcao: g.direcao,
    nos: [...g.nos].sort(),
    grupos: [...g.grupos].map(normalizarGrupo).sort((a, b) => (a.id < b.id ? -1 : 1)),
  }
}

/** Diagrama denso pré-fabricado — o envelope do ADR-004 (400 nós / 500 conexões). */
export function gerarDensoTexto(n, arestas) {
  const linhas = ['flowchart TD']
  for (let i = 1; i <= n; i++) linhas.push(`  n${i}["Passo ${i}"]`)
  for (let i = 0; i < arestas; i++) {
    const de = `n${(i % n) + 1}`
    const para = `n${((i * 7 + 1) % n) + 1}`
    if (de !== para) linhas.push(`  ${de} --> ${para}`)
  }
  return linhas.join('\n')
}
