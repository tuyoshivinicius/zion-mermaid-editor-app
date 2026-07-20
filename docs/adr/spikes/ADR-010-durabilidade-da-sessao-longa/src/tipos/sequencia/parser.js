// mermaid (sequenceDiagram) -> modelo interno.
//
// As mesmas duas obrigações do ADR-006 (tolerar sem calar), aplicadas a uma
// família que não é grafo. O que muda no trabalho do parser: ele não popula
// conjuntos, ele **constrói uma sequência** — e blocos abrem e fecham faixas
// dessa sequência, com uma pilha.
//
// O que este parser NÃO lê, e acusa erro em vez de sumir: `box`, `create`/
// `destroy participant`, `link`/`links` e `%%{wrap}`.

import { vazio, garantirParticipante, SETAS, BLOCOS } from './modelo.js'
import { lerPreambulo, consumirLinhaComum, idValido, semSeparador } from '../../nucleo/modelo.js'
import { decodificarSemAspas } from '../../nucleo/rotulo.js'

const RE_CABECALHO = /^sequenceDiagram$/i
const RE_AUTONUMBER = /^autonumber\b/i
const RE_PARTICIPANTE = /^(participant|actor)\s+(.+)$/i
const RE_ATIVACAO = /^(activate|deactivate)\s+(\S+)$/i
const RE_NOTA = /^note\s+(right of|left of|over)\s+([^:]+):([\s\S]*)$/i
const RE_NOTA_PARCIAL = /^note\s+(right of|left of|over)\s+(.*)$/i
const RE_BLOCO = /^(loop|alt|opt|par|critical|break|rect)\b\s*([\s\S]*)$/i
const RE_RAMO = /^(else|and|option)\b\s*([\s\S]*)$/i
const RE_FIM = /^end$/i
const RE_NAO_LIDO = /^(box|create|destroy|link|links)\b/i

/**
 * @param opcoes.aliasComoResto  Braço de controle. Restaura a leitura ingênua do
 *   `participant A as Alice`, em que o id é o **resto da linha** e não o
 *   primeiro token. Existe para medir o custo do defeito que este spike achou
 *   digitando: sem ele, não dá para afirmar quanto a correção vale.
 */
export function analisar(texto, { tolerante = true, aliasComoResto = false } = {}) {
  const modelo = vazio()
  const erros = []
  const avisos = []
  const ctx = { tolerante, aliasComoResto, avisos, erros }

  const linhas = lerPreambulo(texto, modelo)
  let viuCabecalho = false
  let ordem = 0
  // Pilha de blocos abertos. É o que transforma linhas planas em faixas da
  // sequência — a estrutura que o `subgraph` do Flowchart não precisa ter.
  const pilha = []
  const destino = () => (pilha.length ? pilha[pilha.length - 1].ramo.itens : modelo.corpo)

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
        mensagem: 'diagrama sem cabeçalho: esperava `sequenceDiagram` na primeira linha útil',
      })
      viuCabecalho = true
    }

    try {
      aplicar(modelo, pilha, destino, s, n, ctx)
    } catch (e) {
      erros.push({ linha: n, trecho: s, mensagem: e.message })
    }
  }

  // Bloco aberto ao fim do documento é estado de digitação legítimo: a pessoa
  // digitou `loop` e ainda não digitou `end`. Estrito derruba; tolerante avisa e
  // o que já está dentro do bloco continua na prévia.
  for (const aberto of pilha) {
    const achado = { linha: null, trecho: aberto.bloco.tipo, mensagem: `\`${aberto.bloco.tipo}\` sem \`end\`` }
    if (tolerante) avisos.push(achado)
    else erros.push(achado)
  }

  return { modelo, erros, avisos }
}

function aplicar(m, pilha, destino, s, n, ctx) {
  if (RE_NAO_LIDO.test(s)) {
    throw new Error(`\`${s.split(/\s/)[0]}\` não é lido por este parser`)
  }

  if (RE_FIM.test(s)) {
    if (!pilha.length) throw new Error('`end` sem bloco correspondente')
    pilha.pop()
    return
  }

  if (RE_AUTONUMBER.test(s)) {
    m.autonumber = true
    return
  }

  let x
  if ((x = RE_PARTICIPANTE.exec(s))) {
    lerParticipante(m, x[1].toLowerCase(), x[2].trim(), ctx)
    return
  }

  if ((x = RE_ATIVACAO.exec(s))) {
    garantirParticipante(m, x[2])
    destino().push({ especie: x[1].toLowerCase() === 'activate' ? 'ativacao' : 'desativacao', alvo: x[2] })
    return
  }

  if ((x = RE_NOTA.exec(s))) {
    const alvos = x[2].split(',').map((v) => v.trim()).filter(Boolean)
    for (const a of alvos) garantirParticipante(m, a)
    destino().push({
      especie: 'nota',
      posicao: x[1].toLowerCase(),
      alvos,
      texto: decodificarSemAspas(semSeparador(x[3])).texto,
    })
    return
  }

  if ((x = RE_RAMO.exec(s))) {
    if (!pilha.length) throw new Error(`\`${x[1]}\` fora de um bloco`)
    const topo = pilha[pilha.length - 1]
    const esperado = BLOCOS[topo.bloco.tipo]?.ramoExtra
    if (esperado && esperado !== x[1].toLowerCase()) {
      ctx.avisos.push({ linha: n, trecho: s, mensagem: `\`${x[1]}\` dentro de \`${topo.bloco.tipo}\`` })
    }
    const ramo = { rotulo: x[2].trim() || null, itens: [] }
    topo.bloco.ramos.push(ramo)
    topo.ramo = ramo
    return
  }

  if ((x = RE_BLOCO.exec(s))) {
    const tipo = x[1].toLowerCase()
    const ramo = { rotulo: x[2].trim() || null, itens: [] }
    const bloco = { especie: 'bloco', tipo, ramos: [ramo] }
    destino().push(bloco)
    pilha.push({ bloco, ramo })
    return
  }

  const msg = lerMensagem(s)
  if (msg) {
    if (!msg.para) {
      // `Alice->>` — a seta já existe, o destino ainda não. Estrito, o statement
      // inteiro cai e Alice some da prévia se só aparecia aqui.
      if (!ctx.tolerante) throw new Error('mensagem sem participante de destino')
      ctx.avisos.push({ linha: n, trecho: s, mensagem: 'mensagem ainda sem participante de destino' })
      garantirParticipante(m, msg.de)
      return
    }
    if (msg.texto == null) {
      if (!ctx.tolerante) throw new Error('mensagem sem texto: falta o `:`')
      ctx.avisos.push({ linha: n, trecho: s, mensagem: 'mensagem ainda sem texto' })
    }
    garantirParticipante(m, msg.de)
    garantirParticipante(m, msg.para)
    destino().push({
      especie: 'mensagem',
      de: msg.de,
      para: msg.para,
      texto: msg.texto,
      linha: msg.linha,
      ponta: msg.ponta,
      ativa: msg.ativa,
      desativa: msg.desativa,
      alertas: msg.texto == null ? [{ tipo: 'em-digitacao', detalhe: 'mensagem ainda sem texto' }] : [],
    })
    return
  }

  if ((x = RE_NOTA_PARCIAL.exec(s))) {
    if (!ctx.tolerante) throw new Error('nota sem texto: falta o `:`')
    ctx.avisos.push({ linha: n, trecho: s, mensagem: 'nota ainda sem texto' })
    for (const a of x[2].split(',').map((v) => v.trim()).filter(Boolean)) garantirParticipante(m, a)
    return
  }

  // `Alice-` : o primeiro traço da seta. Igual ao Flowchart do ADR-006, estrito
  // isso derruba o statement e leva Alice junto.
  if (ctx.tolerante) {
    const parcial = /^(\S+?)\s*[-<]+$/.exec(s)
    if (parcial && idValido(parcial[1])) {
      ctx.avisos.push({ linha: n, trecho: s, mensagem: 'mensagem ainda sem destino' })
      garantirParticipante(m, parcial[1])
      return
    }
    if (idValido(s)) {
      ctx.avisos.push({ linha: n, trecho: s, mensagem: 'identificador solto: statement incompleto' })
      garantirParticipante(m, s)
      return
    }
  }

  throw new Error('statement não reconhecido')
}

function lerParticipante(m, papel, resto, ctx) {
  // `participant A as Alice` — o alias é o rótulo, e o id é o que as mensagens citam.
  //
  // O id é sempre o **primeiro token**, não o resto inteiro. Parece detalhe e não
  // é: digitando ` as `, o resto passa por "Codigo a" e "Codigo as", e ler o resto
  // inteiro como id faz o participante `Codigo` — que já estava desenhado —
  // sumir da prévia por três teclas. É o mesmo achado que o ADR-006 mediu no
  // primeiro traço da seta do Flowchart, noutra sintaxe.
  const corte = resto.search(/\s+as\s+/i)
  let id = ctx && ctx.aliasComoResto ? resto : resto.split(/\s+/)[0]
  let rotulo = null
  if (corte > 0) {
    id = resto.slice(0, corte).trim()
    rotulo = decodificarSemAspas(resto.slice(corte).replace(/^\s+as\s+/i, '').trim()).texto
  }
  const p = garantirParticipante(m, id, papel)
  p.papel = papel
  if (rotulo != null) p.rotulo = rotulo
  return p
}

/** `A->>+B: texto` — devolve null se não há seta nenhuma na linha. */
export function lerMensagem(s) {
  const achado = acharSeta(s)
  if (!achado) return null

  const de = s.slice(0, achado.inicio).trim()
  if (!de || !idValido(de)) return null

  let resto = s.slice(achado.fim)
  let ativa = false
  let desativa = false
  const marca = resto.trimStart()[0]
  if (marca === '+' || marca === '-') {
    resto = resto.trimStart().slice(1)
    if (marca === '+') ativa = true
    else desativa = true
  }

  const doisPontos = resto.indexOf(':')
  let para
  let texto = null
  if (doisPontos >= 0) {
    para = resto.slice(0, doisPontos).trim()
    texto = decodificarSemAspas(semSeparador(resto.slice(doisPontos + 1))).texto
  } else {
    para = resto.trim()
  }

  return {
    de,
    para: para && idValido(para) ? para : null,
    texto,
    linha: achado.linha,
    ponta: achado.ponta,
    ativa,
    desativa,
  }
}

function acharSeta(s) {
  for (let i = 0; i < s.length; i++) {
    for (const [token, forma] of SETAS) {
      if (s.startsWith(token, i)) return { inicio: i, fim: i + token.length, ...forma }
    }
  }
  return null
}
