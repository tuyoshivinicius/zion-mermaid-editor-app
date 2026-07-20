// modelo interno -> mermaid (classDiagram).
//
// Mesma obrigação do ADR-006: **normalizador com ponto fixo**. Dado um modelo
// existe um só texto, e reanalisar esse texto devolve o mesmo texto — é o que
// impede o código da Marina de se reescrever sozinho a cada tecla.
//
// A ordem de declaração das classes é preservada (não é ordenada alfabeticamente).
// Para isso o bloco `namespace` é emitido na posição da sua primeira classe, e
// não num bloco separado no fim: é o que faz a ordem sobreviver à ida e volta.

import { emitirPreambulo, emitirComentarios } from '../../nucleo/modelo.js'
import { codificar, codificarSemAspas } from '../../nucleo/rotulo.js'

export function serializar(m, { indentacao = '  ' } = {}) {
  const fora = emitirPreambulo(m, indentacao)
  fora.push('classDiagram')
  fora.push(...emitirComentarios(m, indentacao))

  if (m.direcao) fora.push(`${indentacao}direction ${m.direcao}`)

  const nsDaClasse = new Map()
  for (const ns of m.namespaces) for (const id of ns.classes) nsDaClasse.set(id, ns)

  const emitidas = new Set()
  const nsEmitidos = new Set()

  for (const c of m.classes) {
    if (emitidas.has(c.id)) continue
    const ns = nsDaClasse.get(c.id)
    if (ns && !nsEmitidos.has(ns.id)) {
      nsEmitidos.add(ns.id)
      fora.push(`${indentacao}namespace ${ns.id} {`)
      for (const id of ns.classes) {
        const filha = m.classes.find((x) => x.id === id)
        if (!filha) continue
        emitidas.add(id)
        fora.push(...emitirClasse(filha, indentacao, 2))
      }
      fora.push(`${indentacao}}`)
      continue
    }
    if (ns) continue
    emitidas.add(c.id)
    fora.push(...emitirClasse(c, indentacao, 1))
  }

  for (const r of m.relacoes) fora.push(indentacao + emitirRelacao(r))

  for (const n of m.notas) {
    const alvo = n.alvo ? `for ${n.alvo} ` : ''
    fora.push(`${indentacao}note ${alvo}${codificar(n.texto ?? '').bruto}`)
  }

  for (const cd of m.classDefs) fora.push(`${indentacao}classDef ${cd.nome} ${cd.corpo}`)

  // `cssClass` agrupado por nome de classe CSS: é a forma canônica, e reanalisar
  // devolve o mesmo agrupamento.
  const porCss = new Map()
  for (const c of m.classes) {
    for (const nome of c.classesCss) {
      if (!porCss.has(nome)) porCss.set(nome, [])
      porCss.get(nome).push(c.id)
    }
  }
  for (const [nome, ids] of porCss) {
    fora.push(`${indentacao}cssClass "${ids.join(',')}" ${nome}`)
  }

  for (const c of m.classes) {
    if (c.estilo) fora.push(`${indentacao}style ${c.id} ${c.estilo}`)
  }

  return fora.join('\n')
}

/**
 * `class Nome~T~["rótulo"]` com corpo quando há membro ou anotação.
 *
 * Toda classe vira uma declaração explícita, mesmo a que só aparece numa
 * relação. É deliberado: é o que garante que a ordem de `m.classes` sobreviva
 * ao ciclo — sem isso, uma classe citada só na relação renasceria na posição da
 * relação e o texto não teria ponto fixo.
 */
function emitirClasse(c, ind, nivel) {
  const pad = ind.repeat(nivel)
  const generico = c.generico ? `~${c.generico}~` : ''
  const rotulo = c.rotulo != null ? `[${codificar(c.rotulo).bruto}]` : ''
  const cabeca = `class ${c.id}${generico}${rotulo}`

  if (!c.membros.length && !c.anotacao) return [pad + cabeca]

  const linhas = [`${pad}${cabeca} {`]
  if (c.anotacao) linhas.push(`${pad}${ind}<<${c.anotacao}>>`)
  for (const mb of c.membros) linhas.push(pad + ind + emitirMembro(mb))
  linhas.push(`${pad}}`)
  return linhas
}

function emitirMembro(mb) {
  return `${mb.visibilidade ?? ''}${mb.corpo}${mb.classificador ?? ''}`
}

function emitirRelacao(r) {
  const pontaDe = r.pontaDe && r.pontaDe !== 'nenhuma' ? r.pontaDe : ''
  const pontaPara = r.pontaPara && r.pontaPara !== 'nenhuma' ? r.pontaPara : ''
  const linha = r.linha === 'tracejada' ? '..' : '--'
  const cardDe = r.cardDe != null ? ` "${r.cardDe}"` : ''
  const cardPara = r.cardPara != null ? `"${r.cardPara}" ` : ''
  const rotulo = r.rotulo != null && r.rotulo !== '' ? ` : ${codificarSemAspas(r.rotulo).bruto}` : ''
  return `${r.de}${cardDe} ${pontaDe}${linha}${pontaPara} ${cardPara}${r.para}${rotulo}`
}
