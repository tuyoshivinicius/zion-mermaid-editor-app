// modelo interno -> mermaid. É a metade da volta que o ADR-002 declarou por
// escrito não ter tocado ("o spike parou na vista: não gerou o código a partir
// do modelo nem leu texto de volta").
//
// O serializador é **normalizador**: dado um modelo, existe um só texto. Isso
// não é preciosismo — é o que faz o ciclo ter ponto fixo, e ponto fixo é o que
// impede o código da Marina de se reescrever sozinho a cada tecla.

import { FORMAS } from './modelo.js'
import { codificar } from './rotulo.js'

export function serializar(m, { indentacao = '  ' } = {}) {
  const fora = []

  if (m.preservado.frontmatter) fora.push(m.preservado.frontmatter)
  for (const d of m.preservado.diretivas) fora.push(d)

  fora.push(`${m.palavraChave} ${m.orientacao}`)

  // Comentários sobrevivem ao ciclo, mas em bloco logo após o cabeçalho:
  // reancorá-los no statement original exigiria posição no modelo, e posição de
  // texto é justamente o que o modelo não guarda.
  for (const c of m.preservado.comentarios) fora.push(indentacao + c.texto)

  const agrupados = new Set()
  colher(m.grupos, agrupados)

  for (const g of m.grupos) fora.push(...emitirGrupo(m, g, indentacao, 1))

  for (const n of m.nos) {
    if (agrupados.has(n.id)) continue
    const def = emitirNo(m, n)
    if (def) fora.push(indentacao + def)
  }

  for (const c of m.conexoes) fora.push(indentacao + emitirConexao(c))

  for (const cd of m.classDefs) fora.push(`${indentacao}classDef ${cd.nome} ${cd.corpo}`)

  const porClasse = new Map()
  for (const n of m.nos) {
    for (const c of n.classes) {
      if (!porClasse.has(c)) porClasse.set(c, [])
      porClasse.get(c).push(n.id)
    }
  }
  for (const [classe, ids] of porClasse) {
    fora.push(`${indentacao}class ${ids.join(',')} ${classe}`)
  }

  for (const n of m.nos) {
    if (n.estilo) fora.push(`${indentacao}style ${n.id} ${n.estilo}`)
  }
  for (const l of m.linkStyles) fora.push(`${indentacao}linkStyle ${l.alvo} ${l.corpo}`)
  for (const c of m.cliques) fora.push(`${indentacao}click ${c.id} ${c.corpo}`)

  return fora.join('\n')
}

function colher(grupos, dentro) {
  for (const g of grupos) {
    for (const id of g.nos) dentro.add(id)
    colher(g.grupos, dentro)
  }
}

function emitirGrupo(m, g, ind, nivel) {
  const pad = ind.repeat(nivel)
  const linhas = []
  const cabeca = g.rotulo != null ? `subgraph ${g.id}[${codificar(g.rotulo).bruto}]` : `subgraph ${g.id}`
  linhas.push(pad + cabeca)
  if (g.direcao) linhas.push(pad + ind + `direction ${g.direcao}`)
  for (const filho of g.grupos) linhas.push(...emitirGrupo(m, filho, ind, nivel + 1))
  for (const id of g.nos) {
    const n = m.nos.find((x) => x.id === id)
    if (!n) continue
    linhas.push(pad + ind + (emitirNo(m, n) || n.id))
  }
  linhas.push(pad + 'end')
  return linhas
}

function emitirNo(m, n) {
  if (n.rotulo == null && n.forma === 'nenhuma') {
    // Nó sem forma nem rótulo só precisa de linha própria se nenhuma conexão o cita.
    const citado = m.conexoes.some((c) => c.de === n.id || c.para === n.id)
    return citado ? null : n.id
  }
  const [abre, fecha] = FORMAS[n.forma] || FORMAS.retangulo
  if (!abre) return n.id
  return `${n.id}${abre}${codificar(n.rotulo ?? '').bruto}${fecha}`
}

function emitirConexao(c) {
  const link = desenharLink(c)
  const rot = c.rotulo != null && c.rotulo !== '' ? `|${codificar(c.rotulo).bruto}|` : ''
  return `${c.de} ${link}${rot} ${c.para}`
}

function desenharLink(c) {
  const cabeca = c.cabeca && c.cabeca !== 'nenhuma' ? c.cabeca : ''
  const cauda = c.cauda && c.cauda !== 'nenhuma' ? c.cauda : ''
  const n = Math.max(1, c.comprimento || 1)
  switch (c.tipo) {
    case 'grossa':
      return `${cauda}${'='.repeat(n + 1)}${cabeca}`
    case 'pontilhada':
      return `${cauda}-${'.'.repeat(n)}-${cabeca}`
    case 'invisivel':
      return '~'.repeat(Math.max(3, n + 2))
    default:
      return `${cauda}${'-'.repeat(n + 1)}${cabeca}`
  }
}
