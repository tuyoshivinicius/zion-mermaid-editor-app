// mermaid (classDiagram) -> modelo interno.
//
// Escrito sob as mesmas duas obrigações que o ADR-006 provou serem requisito, e
// não polimento:
//
//   1. **Tolerante a erro.** Estado de digitação é estado legítimo: corpo de
//      classe ainda sem `}`, membro pela metade, seta com um lado só. O nó que
//      já estava na prévia não pode sumir enquanto a pessoa digita.
//   2. **Nunca calar.** O que não vira estrutura vira `erro` (derruba o
//      statement) ou `aviso` (sinaliza sem derrubar) — nunca desaparece.
//
// O que este parser NÃO lê, e acusa erro em vez de sumir: `click`/`link`/
// `callback`, `note` com markdown de várias linhas, e o dialeto `classDiagram-v2`
// com sintaxe de shape v11.

import { vazio, garantirClasse } from './modelo.js'
import { lerPreambulo, consumirLinhaComum, idValido, semSeparador } from '../../nucleo/modelo.js'
import { decodificar, decodificarSemAspas } from '../../nucleo/rotulo.js'

const RE_CABECALHO = /^classDiagram(-v2)?$/i
const RE_DIRECAO = /^direction\s+(TB|TD|BT|RL|LR)$/i
const RE_CLASSE = /^class\s+(.+)$/i
const RE_NAMESPACE = /^namespace\s+(\S+)\s*\{?$/i
const RE_ANOTACAO_SOLTA = /^<<(.+?)>>\s*(\S+)?$/
const RE_NOTA_PARA = /^note\s+for\s+(\S+)\s+(.*)$/i
const RE_NOTA = /^note\s+(.*)$/i
const RE_ESTILO = /^style\s+(\S+)\s+(.+)$/i
const RE_CSSCLASS = /^cssClass\s+"([^"]*)"\s+(\S+)$/i
const RE_CLASSDEF = /^classDef\s+(\S+)\s+(.+)$/i
const RE_NAO_LIDO = /^(click|link|callback)\b/i

// Ponta esquerda, linha, ponta direita. A linha (`--` ou `..`) é obrigatória, o
// que impede um `o` ou um `<` soltos dentro de um identificador de virarem seta.
const RE_SETA = /(<\||\*|o|<)?(--|\.\.)(\|>|\*|o|>)?/

export function analisar(texto, { tolerante = true } = {}) {
  const modelo = vazio()
  const erros = []
  const avisos = []
  const ctx = { tolerante, avisos, erros }

  const linhas = lerPreambulo(texto, modelo)
  let viuCabecalho = false
  let ordem = 0
  let corpoAberto = null // classe com `{` ainda sem `}`
  let namespaceAberto = null

  for (const { crua, n } of linhas) {
    const comum = consumirLinhaComum(crua, modelo, ordem)
    if (comum.consumida) continue
    const s = comum.texto
    ordem++

    if (!viuCabecalho) {
      if (RE_CABECALHO.test(s)) {
        viuCabecalho = true
        continue
      }
      erros.push({
        linha: n,
        trecho: s,
        mensagem: 'diagrama sem cabeçalho: esperava `classDiagram` na primeira linha útil',
      })
      viuCabecalho = true // recuperação, não abandono
    }

    try {
      const r = aplicar(modelo, s, n, ctx, { corpoAberto, namespaceAberto })
      corpoAberto = r.corpoAberto
      namespaceAberto = r.namespaceAberto
    } catch (e) {
      erros.push({ linha: n, trecho: s, mensagem: e.message })
    }
  }

  // Corpo aberto ao fim do documento é o estado normal de quem está digitando a
  // classe. Estrito, isso é erro; tolerante, é aviso e a classe fica com os
  // membros já digitados.
  if (corpoAberto) {
    const achado = {
      linha: null,
      trecho: `class ${corpoAberto.id}`,
      mensagem: 'corpo da classe sem `}`',
    }
    if (tolerante) {
      avisos.push(achado)
      marcarEmDigitacao(corpoAberto, 'corpo da classe ainda sem fechamento no código')
    } else erros.push(achado)
  }
  if (namespaceAberto) {
    erros.push({ linha: null, trecho: `namespace ${namespaceAberto.id}`, mensagem: 'namespace sem `}`' })
  }

  return { modelo, erros, avisos }
}

function marcarEmDigitacao(alvo, detalhe) {
  if (!alvo.alertas.some((a) => a.tipo === 'em-digitacao')) {
    alvo.alertas.push({ tipo: 'em-digitacao', detalhe })
  }
}

function aplicar(m, s, n, ctx, estado) {
  let { corpoAberto, namespaceAberto } = estado

  // ─── dentro do corpo de uma classe: membros e anotação ────────────────────
  if (corpoAberto) {
    if (s === '}' || s.startsWith('}')) return { corpoAberto: null, namespaceAberto }
    const anot = RE_ANOTACAO_SOLTA.exec(s)
    if (anot && !anot[2]) {
      corpoAberto.anotacao = anot[1].trim()
      return { corpoAberto, namespaceAberto }
    }
    corpoAberto.membros.push(lerMembro(s))
    return { corpoAberto, namespaceAberto }
  }

  if (s === '}') {
    if (namespaceAberto) return { corpoAberto, namespaceAberto: null }
    throw new Error('`}` sem bloco correspondente')
  }

  if (RE_NAO_LIDO.test(s)) {
    throw new Error(`\`${s.split(/\s/)[0]}\` não é lido por este parser`)
  }

  let x
  if ((x = RE_DIRECAO.exec(s))) {
    m.direcao = x[1].toUpperCase()
    return { corpoAberto, namespaceAberto }
  }
  if ((x = RE_NAMESPACE.exec(s))) {
    const ns = { id: x[1], classes: [] }
    m.namespaces.push(ns)
    return { corpoAberto, namespaceAberto: ns }
  }
  if ((x = RE_NOTA_PARA.exec(s))) {
    m.notas.push({ alvo: x[1], texto: decodificar(x[2]).texto })
    return { corpoAberto, namespaceAberto }
  }
  if ((x = RE_ESTILO.exec(s))) {
    garantirClasse(m, x[1]).estilo = x[2].trim()
    return { corpoAberto, namespaceAberto }
  }
  if ((x = RE_CSSCLASS.exec(s))) {
    for (const id of x[1].split(',').map((v) => v.trim()).filter(Boolean)) {
      const c = garantirClasse(m, id)
      if (!c.classesCss.includes(x[2])) c.classesCss.push(x[2])
    }
    return { corpoAberto, namespaceAberto }
  }
  if ((x = RE_CLASSDEF.exec(s))) {
    m.classDefs.push({ nome: x[1], corpo: x[2].trim() })
    return { corpoAberto, namespaceAberto }
  }
  if ((x = RE_ANOTACAO_SOLTA.exec(s)) && x[2]) {
    garantirClasse(m, x[2]).anotacao = x[1].trim()
    return { corpoAberto, namespaceAberto }
  }

  // A relação tem que ser testada antes de `Alvo : membro`, porque relação
  // também usa `:` para o rótulo. O que desempata é a seta.
  const seta = acharSeta(s)
  if (seta) {
    lerRelacao(m, s, seta, n, ctx)
    return { corpoAberto, namespaceAberto }
  }

  if ((x = RE_CLASSE.exec(s))) {
    const aberto = lerDeclaracaoDeClasse(m, x[1].trim(), namespaceAberto, ctx)
    return { corpoAberto: aberto, namespaceAberto }
  }

  // `Alvo : membro` — a forma de uma linha só.
  const doisPontos = acharForaDeAspas(s, ':')
  if (doisPontos > 0) {
    const id = s.slice(0, doisPontos).trim()
    if (idValido(id)) {
      garantirClasse(m, id).membros.push(lerMembro(s.slice(doisPontos + 1).trim()))
      return { corpoAberto, namespaceAberto }
    }
  }

  if ((x = RE_NOTA.exec(s))) {
    m.notas.push({ alvo: null, texto: decodificar(x[1]).texto })
    return { corpoAberto, namespaceAberto }
  }

  // Classe declarada sem a palavra `class` não existe no mermaid; um id solto é
  // statement incompleto. Tolerante, registra a classe e avisa.
  if (idValido(s)) {
    if (!ctx.tolerante) throw new Error('statement não reconhecido')
    ctx.avisos.push({ linha: n, trecho: s, mensagem: 'identificador solto: statement incompleto' })
    garantirClasse(m, s)
    return { corpoAberto, namespaceAberto }
  }

  // `Cliente "1" -` : o primeiro traço de uma seta. O pedaço deixa de ser id
  // válido, e estrito o statement inteiro cai — levando junto a classe que já
  // estava na prévia. É o mesmo achado que o ADR-006 mediu no Flowchart.
  if (ctx.tolerante) {
    const parcial = /^(\S+)(\s+"[^"]*")?\s*[-.<*o|]+$/.exec(s)
    if (parcial && idValido(parcial[1])) {
      ctx.avisos.push({ linha: n, trecho: s, mensagem: 'relação ainda sem classe de destino' })
      garantirClasse(m, parcial[1])
      return { corpoAberto, namespaceAberto }
    }
  }

  throw new Error('statement não reconhecido')
}

/** `class Nome~T~["rótulo"] {` — devolve o corpo aberto, ou null. */
function lerDeclaracaoDeClasse(m, resto, namespaceAberto, ctx) {
  let t = resto
  let abreCorpo = false
  if (t.endsWith('{')) {
    abreCorpo = true
    t = t.slice(0, -1).trim()
  }

  const cssCurto = []
  t = t.replace(/:::([A-Za-z0-9_-]+)/g, (_, c) => {
    cssCurto.push(c)
    return ''
  })
  t = t.trim()

  // rótulo alternativo: `class Nome["Outro nome"]`
  let rotulo = null
  const colchete = t.indexOf('[')
  if (colchete > 0 && t.endsWith(']')) {
    rotulo = decodificar(t.slice(colchete + 1, -1)).texto
    t = t.slice(0, colchete).trim()
  }

  // genérico: `class Lista~T~`
  let generico = null
  const til = t.indexOf('~')
  if (til > 0 && t.endsWith('~')) {
    generico = t.slice(til + 1, -1)
    t = t.slice(0, til).trim()
  }

  // membro colado na declaração: `class Pedido : +total`
  const doisPontos = acharForaDeAspas(t, ':')
  let membroInline = null
  if (doisPontos > 0) {
    membroInline = t.slice(doisPontos + 1).trim()
    t = t.slice(0, doisPontos).trim()
  }

  const c = garantirClasse(m, t)
  if (generico) c.generico = generico
  if (rotulo != null) c.rotulo = rotulo
  for (const x of cssCurto) if (!c.classesCss.includes(x)) c.classesCss.push(x)
  if (membroInline) c.membros.push(lerMembro(membroInline))
  if (namespaceAberto && !namespaceAberto.classes.includes(c.id)) namespaceAberto.classes.push(c.id)

  return abreCorpo ? c : null
}

/**
 * `Cliente "1" --> "*" Pedido : faz`
 * Estrutura: [id] [cardinalidade] SETA [cardinalidade] [id] [: rótulo]
 */
function lerRelacao(m, s, seta, n, ctx) {
  const esquerda = s.slice(0, seta.inicio).trim()
  let direita = s.slice(seta.fim).trim()

  let rotulo = null
  const doisPontos = acharForaDeAspas(direita, ':')
  if (doisPontos >= 0) {
    rotulo = decodificarSemAspas(semSeparador(direita.slice(doisPontos + 1))).texto
    direita = direita.slice(0, doisPontos).trim()
  }

  const de = lerLado(esquerda, 'esquerda')
  const para = lerLado(direita, 'direita')

  if (!de.id || !para.id) {
    // Um dos lados ainda não existe: é a seta sendo digitada.
    if (!ctx.tolerante) throw new Error('relação sem classe de um dos lados')
    ctx.avisos.push({ linha: n, trecho: s, mensagem: 'relação ainda sem classe dos dois lados' })
    for (const lado of [de, para]) if (lado.id) garantirClasse(m, lado.id)
    return
  }

  for (const lado of [de, para]) {
    const c = garantirClasse(m, lado.id)
    if (lado.generico && !c.generico) c.generico = lado.generico
  }
  for (const [lado, alvo] of [
    [de, de.id],
    [para, para.id],
  ]) {
    for (const c of lado.css) {
      const cl = garantirClasse(m, alvo)
      if (!cl.classesCss.includes(c)) cl.classesCss.push(c)
    }
  }

  m.relacoes.push({
    id: `r${m.relacoes.length + 1}`,
    de: de.id,
    para: para.id,
    linha: seta.linha === '..' ? 'tracejada' : 'solida',
    pontaDe: seta.pontaDe || 'nenhuma',
    pontaPara: seta.pontaPara || 'nenhuma',
    cardDe: de.cardinalidade,
    cardPara: para.cardinalidade,
    rotulo,
    alertas: [],
  })
}

/** Um lado da relação: id, cardinalidade entre aspas e `:::classe`. */
function lerLado(t, qual) {
  const css = []
  let s = t.replace(/:::([A-Za-z0-9_-]+)/g, (_, c) => {
    css.push(c)
    return ''
  })
  s = s.trim()

  let cardinalidade = null
  const aspas = /"([^"]*)"/.exec(s)
  if (aspas) {
    cardinalidade = aspas[1]
    s = (s.slice(0, aspas.index) + s.slice(aspas.index + aspas[0].length)).trim()
  }
  // `Lista~T~` na ponta da relação é a classe `Lista`, não uma classe nova. Sem
  // isto o modelo ganha um nó fantasma por ponta genérica, e o canvas passa a
  // mostrar mais caixas do que o código desenha.
  let id = s.trim()
  let generico = null
  const til = id.indexOf('~')
  if (til > 0 && id.endsWith('~')) {
    generico = id.slice(til + 1, -1)
    id = id.slice(0, til).trim()
  }
  return { id: id && idValido(id) ? id : null, generico, cardinalidade, css, qual }
}

function acharSeta(s) {
  // A seta só vale fora de aspas — `A "1..*" -- B` tem `..` dentro da cardinalidade.
  let aspas = false
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') {
      aspas = !aspas
      continue
    }
    if (aspas) continue
    const resto = s.slice(i)
    const m = RE_SETA.exec(resto)
    if (m && m.index === 0) {
      return {
        inicio: i,
        fim: i + m[0].length,
        pontaDe: m[1] || null,
        linha: m[2],
        pontaPara: m[3] || null,
      }
    }
  }
  return null
}

function acharForaDeAspas(s, ch) {
  let aspas = false
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') aspas = !aspas
    else if (!aspas && s[i] === ch) return i
  }
  return -1
}

/**
 * `+String nome` · `-int idade` · `#calcular() int` · `+abstrato()*` · `+total$`
 *
 * O membro é onde o nó do Flowchart tinha uma string. Guardar `crua` além dos
 * campos é o que mantém o ciclo lossless mesmo para a forma que o parser não
 * decompõe — o serializador reemite o que não entendeu.
 */
export function lerMembro(bruto) {
  const crua = bruto.trim()
  let t = crua
  let visibilidade = null
  if (t && '+-#~'.includes(t[0])) {
    visibilidade = t[0]
    t = t.slice(1)
  }
  let classificador = null
  if (t.endsWith('*') || t.endsWith('$')) {
    classificador = t[t.length - 1]
    t = t.slice(0, -1)
  }
  const especie = t.includes('(') ? 'metodo' : 'atributo'
  return { crua, visibilidade, corpo: t.trim(), classificador, especie }
}
