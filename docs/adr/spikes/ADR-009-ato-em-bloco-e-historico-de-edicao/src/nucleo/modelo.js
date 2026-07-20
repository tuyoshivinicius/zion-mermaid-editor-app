// O núcleo do modelo interno — a parte que o ADR-003 decidiu e o ADR-006 provou
// **só para Flowchart**. Este spike existe para descobrir quanto dela sobrevive
// quando o mesmo modelo tem que servir nós estruturados (Class) e sequência
// temporal (Sequence).
//
// A hipótese sob teste, escrita antes de rodar: existe um núcleo comum às três
// famílias, e o que varia é só o **vocabulário de agregados** de cada uma. Se a
// hipótese cair, cai por aqui — algum dos campos abaixo vai precisar de exceção
// por tipo, e a exceção é o achado.
//
// O que o núcleo promete, herdado dos ADRs anteriores:
//   - **sem coordenada** (ADR-003/004/005): posição nasce na projeção, nunca aqui
//   - **lossless quanto ao conteúdo** (ADR-003/006): o que não vira estrutura
//     vira sintaxe preservada, nunca desaparece calado
//   - **duas listas de severidade** (ADR-006): `erros` derruba o statement,
//     `avisos` sinaliza sem derrubar nada

/** Os três campos que toda família carrega, seja qual for o tipo de diagrama. */
export function nucleo(tipo) {
  return {
    tipo, // 'flowchart' | 'classe' | 'sequencia'
    preservado: {
      frontmatter: null, // bloco YAML cru, incluindo os `---`
      diretivas: [], // linhas `%%{init: ...}%%` cruas
      comentarios: [], // { indice, texto } — `indice` é a ordem de statement
    },
  }
}

/** Normalização do que é comum. Cada família compõe a sua por cima desta. */
export function normalizarNucleo(m) {
  return {
    tipo: m.tipo,
    preservado: {
      frontmatter: m.preservado.frontmatter,
      diretivas: [...m.preservado.diretivas].sort(),
    },
  }
}

/** Acha ou cria por id, preservando a ordem de aparição. */
export function garantir(lista, id, montar) {
  let achado = lista.find((x) => x.id === id)
  if (!achado) {
    achado = montar(id)
    lista.push(achado)
  }
  return achado
}

export const porId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

export const idValido = (id) => /^[^\s\[\](){}<>|"]+$/.test(id)

/**
 * `%%` só inicia comentário fora de aspas. Comportamento comum às três famílias
 * — o mermaid trata comentário no nível do documento, não do tipo.
 */
export function acharComentario(linha) {
  let aspas = false
  for (let i = 0; i < linha.length - 1; i++) {
    const c = linha[i]
    if (c === '"') aspas = !aspas
    else if (!aspas && c === '%' && linha[i + 1] === '%') return i
  }
  return -1
}

const RE_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/
const RE_DIRETIVA = /^%%\{[\s\S]*?\}%%$/

/**
 * O preâmbulo que as três famílias compartilham: frontmatter YAML, diretivas
 * `%%{init}%%` e comentários. Devolve as linhas já limpas, para a família só
 * cuidar do que é dela.
 *
 * É a primeira medida do quanto o núcleo realmente serve: se cada tipo
 * precisasse do seu próprio tratamento de preâmbulo, não haveria núcleo.
 */
export function lerPreambulo(texto, modelo) {
  let corpo = texto
  let deslocamento = 0

  const fm = RE_FRONTMATTER.exec(corpo)
  if (fm) {
    modelo.preservado.frontmatter = corpo.slice(0, fm[0].length).replace(/\r?\n$/, '')
    deslocamento = modelo.preservado.frontmatter.split('\n').length
    corpo = corpo.slice(fm[0].length)
  }

  const linhas = corpo.split(/\r?\n/).map((crua, i) => ({ crua, n: i + 1 + deslocamento }))
  return linhas
}

/** Classifica uma linha como preâmbulo (e a consome) ou como statement da família. */
export function consumirLinhaComum(linha, modelo, ordem) {
  let t = linha.trim()
  if (!t) return { consumida: true, texto: '' }

  if (RE_DIRETIVA.test(t)) {
    modelo.preservado.diretivas.push(t)
    return { consumida: true, texto: '' }
  }
  if (t.startsWith('%%')) {
    modelo.preservado.comentarios.push({ indice: ordem, texto: t })
    return { consumida: true, texto: '' }
  }
  const pos = acharComentario(t)
  if (pos >= 0) {
    modelo.preservado.comentarios.push({ indice: ordem, texto: t.slice(pos).trim() })
    t = t.slice(0, pos).trim()
    if (!t) return { consumida: true, texto: '' }
  }
  return { consumida: false, texto: t }
}

/** Emite o preâmbulo na saída. Espelho de `lerPreambulo`. */
export function emitirPreambulo(m, indentacao) {
  const fora = []
  if (m.preservado.frontmatter) fora.push(m.preservado.frontmatter)
  for (const d of m.preservado.diretivas) fora.push(d)
  return fora
}

/** Comentários vão em bloco após o cabeçalho — mesma limitação medida no ADR-006. */
export function emitirComentarios(m, indentacao) {
  return m.preservado.comentarios.map((c) => indentacao + c.texto)
}

/**
 * Tira **exatamente um** espaço separador — nem zero, nem todos.
 *
 * Em Class (rótulo de relação) e em Sequence (texto de mensagem e de nota) o
 * texto corre até o fim da linha. `trim()` ali apagaria espaço nas bordas que a
 * pessoa colou de fora, que é o que o discovery proíbe apagar em silêncio; não
 * tirar nenhum faria a forma canônica `A->>B: texto` reanalisar como " texto" e
 * o ciclo perderia o ponto fixo. Tirar um resolve os dois.
 */
export function semSeparador(t) {
  return t.startsWith(' ') ? t.slice(1) : t
}
