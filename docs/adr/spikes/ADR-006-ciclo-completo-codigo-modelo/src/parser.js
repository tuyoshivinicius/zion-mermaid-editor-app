// mermaid (flowchart) -> modelo interno. Parser **próprio**, que é exatamente o
// que o ADR-003 decidiu por pesquisa e nunca rodou: o parser Langium do mermaid
// não cobre nenhum dos cinco tipos do escopo, e o Jison que cobre está acoplado
// ao renderer.
//
// Duas propriedades importam mais que cobertura, e as duas vêm do discovery:
//
//   1. **Tolerante a erro.** "Sinalizar o erro de sintaxe ao editar o código, sem
//      que a prévia quebre ou se perca." Uma linha inválida vira um achado
//      localizado; as outras continuam virando diagrama. O `mermaid.parse()` de
//      verdade é o braço de controle: ele é tudo-ou-nada.
//   2. **Sem perder o que não entende.** O que não vira estrutura vira sintaxe
//      preservada (frontmatter, diretiva, comentário) ou erro visível — nunca
//      desaparece em silêncio.

import { vazio, garantirNo } from './modelo.js'
import { decodificar } from './rotulo.js'

const RE_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/
const RE_DIRETIVA = /^%%\{[\s\S]*?\}%%$/
const RE_CABECALHO = /^(flowchart|graph)(?:\s+(TB|TD|BT|RL|LR))?$/i
const RE_SUBGRAPH = /^subgraph\s*(.*)$/i
const RE_FIM = /^end$/i
const RE_DIRECAO = /^direction\s+(TB|TD|BT|RL|LR)$/i
const RE_CLASSDEF = /^classDef\s+(\S+)\s+(.+)$/i
const RE_CLASSE = /^class\s+([^\s]+)\s+(\S+)$/i
const RE_ESTILO = /^style\s+(\S+)\s+(.+)$/i
const RE_LINKSTYLE = /^linkStyle\s+(\S+)\s+(.+)$/i
const RE_CLIQUE = /^click\s+(\S+)\s+(.+)$/i
const RE_SHAPE_V11 = /@\{/

// Link completo: `-->` `---` `--x` `<-->` `x--x` `-.->` `==>` `~~~` ...
const RE_LINK = /^(<)?([xo])?(-\.{1,}-|-{2,}|={2,}|~{3,})([>xo])?/
// Link com rótulo embutido: `-- texto -->` · `== texto ==>` · `-. texto .->`
const RE_LINK_ROTULADO = /^(--|==|-\.)([^\n]*?)(-{1,}[>xo]|-{2,}|={1,}[>xo]|={2,}|\.-[>xo]?)/

const ABERTURAS = [
  ['(((', ')))', 'circuloDuplo'],
  ['([', '])', 'estadio'],
  ['[[', ']]', 'subrotina'],
  ['[(', ')]', 'cilindro'],
  ['((', '))', 'circulo'],
  ['{{', '}}', 'hexagono'],
  ['[/', '/]', 'paralelogramo'],
  ['[/', '\\]', 'trapezio'],
  ['[\\', '\\]', 'paralelogramoAlt'],
  ['[\\', '/]', 'trapezioAlt'],
  ['[', ']', 'retangulo'],
  ['(', ')', 'arredondado'],
  ['{', '}', 'losango'],
  ['>', ']', 'assimetrico'],
]

/**
 * @param opcoes.tolerante  Trata estado **de digitação** como estado legítimo:
 *   forma sem fechamento vira rótulo parcial, link sem destino não leva o nó de
 *   origem junto. É braço de medição, não conveniência: com `tolerante=false` o
 *   parser é estritamente correto e a prévia **regride** enquanto a pessoa
 *   digita um rótulo — que é o que o discovery proíbe ("sem que a prévia quebre
 *   ou se perca").
 */
export function analisar(texto, { tolerante = true } = {}) {
  const modelo = vazio()
  const erros = []
  // Tolerar não pode significar calar: o discovery pede as duas coisas na mesma
  // frase — "sinalizar o erro de sintaxe ... sem que a prévia quebre ou se
  // perca". `erros` derruba o statement; `avisos` sinaliza sem derrubar nada.
  const avisos = []
  const ctx = { tolerante, avisos, linha: 0 }
  let corpo = texto
  let deslocamento = 0

  const fm = RE_FRONTMATTER.exec(corpo)
  if (fm) {
    modelo.preservado.frontmatter = corpo.slice(0, fm[0].length).replace(/\r?\n$/, '')
    deslocamento = modelo.preservado.frontmatter.split('\n').length
    corpo = corpo.slice(fm[0].length)
  }

  const linhas = corpo.split(/\r?\n/)
  const pilha = [] // grupos abertos
  let viuCabecalho = false
  let ordem = 0

  for (let i = 0; i < linhas.length; i++) {
    const nLinha = i + 1 + deslocamento
    const crua = linhas[i]
    let linha = crua.trim()
    if (!linha) continue

    if (RE_DIRETIVA.test(linha)) {
      modelo.preservado.diretivas.push(linha)
      continue
    }
    if (linha.startsWith('%%')) {
      modelo.preservado.comentarios.push({ indice: ordem, texto: linha })
      continue
    }
    // comentário no fim da linha (`A --> B %% nota`) — o mermaid trata `%%` como início de comentário
    const posComentario = acharComentario(linha)
    if (posComentario >= 0) {
      modelo.preservado.comentarios.push({ indice: ordem, texto: linha.slice(posComentario).trim() })
      linha = linha.slice(0, posComentario).trim()
      if (!linha) continue
    }

    if (!viuCabecalho) {
      const cab = RE_CABECALHO.exec(linha)
      if (cab) {
        modelo.palavraChave = cab[1].toLowerCase()
        modelo.orientacao = (cab[2] || 'TB').toUpperCase()
        viuCabecalho = true
        continue
      }
      erros.push({
        linha: nLinha,
        trecho: linha,
        mensagem: 'diagrama sem cabeçalho: esperava `flowchart <orientação>` na primeira linha útil',
      })
      viuCabecalho = true // segue tentando: recuperação, não abandono
    }

    for (const statement of dividirStatements(linha)) {
      ordem++
      ctx.linha = nLinha
      try {
        aplicarStatement(modelo, pilha, statement, nLinha, erros, ctx)
      } catch (e) {
        erros.push({ linha: nLinha, trecho: statement, mensagem: e.message })
      }
    }
  }

  for (const g of pilha) {
    erros.push({ linha: null, trecho: `subgraph ${g.id}`, mensagem: 'subgraph aberto sem `end`' })
  }

  return { modelo, erros, avisos }
}

/** `%%` só inicia comentário fora de aspas. */
function acharComentario(linha) {
  let aspas = false
  for (let i = 0; i < linha.length - 1; i++) {
    const c = linha[i]
    if (c === '"') aspas = !aspas
    else if (!aspas && c === '%' && linha[i + 1] === '%') return i
  }
  return -1
}

/** `;` separa statements, fora de aspas e de colchetes. */
function dividirStatements(linha) {
  const partes = []
  let atual = ''
  let aspas = false
  let prof = 0
  for (const c of linha) {
    if (c === '"') aspas = !aspas
    if (!aspas) {
      if ('([{'.includes(c)) prof++
      else if (')]}'.includes(c)) prof--
      else if (c === ';' && prof <= 0) {
        if (atual.trim()) partes.push(atual.trim())
        atual = ''
        continue
      }
    }
    atual += c
  }
  if (atual.trim()) partes.push(atual.trim())
  return partes
}

function aplicarStatement(modelo, pilha, s, nLinha, erros, ctx) {
  const grupoAtual = pilha[pilha.length - 1] || null

  if (RE_FIM.test(s)) {
    if (!pilha.length) throw new Error('`end` sem `subgraph` correspondente')
    pilha.pop()
    return
  }

  const sub = RE_SUBGRAPH.exec(s)
  if (sub) {
    const g = montarGrupo(sub[1].trim(), modelo)
    if (grupoAtual) grupoAtual.grupos.push(g)
    else modelo.grupos.push(g)
    pilha.push(g)
    return
  }

  const dir = RE_DIRECAO.exec(s)
  if (dir) {
    if (grupoAtual) grupoAtual.direcao = dir[1].toUpperCase()
    else modelo.orientacao = dir[1].toUpperCase()
    return
  }

  let m
  if ((m = RE_CLASSDEF.exec(s))) {
    modelo.classDefs.push({ nome: m[1], corpo: m[2].trim() })
    return
  }
  if ((m = RE_CLASSE.exec(s))) {
    for (const id of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
      const n = garantirNo(modelo, id)
      if (!n.classes.includes(m[2])) n.classes.push(m[2])
    }
    return
  }
  if ((m = RE_ESTILO.exec(s))) {
    garantirNo(modelo, m[1]).estilo = m[2].trim()
    return
  }
  if ((m = RE_LINKSTYLE.exec(s))) {
    modelo.linkStyles.push({ alvo: m[1], corpo: m[2].trim() })
    return
  }
  if ((m = RE_CLIQUE.exec(s))) {
    modelo.cliques.push({ id: m[1], corpo: m[2].trim() })
    return
  }

  aplicarCadeia(modelo, grupoAtual, s, nLinha, erros, ctx)
}

function montarGrupo(resto, modelo) {
  // `subgraph id[Título]` · `subgraph Título` · `subgraph id [Título]`
  let id = resto
  let rotulo = null
  const abre = resto.indexOf('[')
  if (abre >= 0 && resto.endsWith(']')) {
    id = resto.slice(0, abre).trim()
    rotulo = decodificar(resto.slice(abre + 1, -1)).texto
  }
  if (!id) id = rotulo || `grupo${modelo.grupos.length + 1}`
  return { id, rotulo, direcao: null, nos: [], grupos: [] }
}

/** `A[x] --> B & C -.->|nota| D` — cadeia de nós e links. */
function aplicarCadeia(modelo, grupo, s, nLinha, erros, ctx) {
  const pedacos = tokenizar(s)
  if (!pedacos.length) throw new Error('statement não reconhecido')

  const grupos = [] // listas de ids, uma por posição da cadeia
  const links = []

  for (const p of pedacos) {
    if (p.tipo === 'link') links.push(p)
    else {
      const ids = p.texto
        .split('&')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((chunk) => registrarNo(modelo, grupo, chunk, nLinha, erros, ctx))
        .filter(Boolean)
      if (!ids.length) throw new Error(`não consegui ler o nó em "${p.texto.trim()}"`)
      grupos.push(ids)
    }
  }

  if (links.length && grupos.length !== links.length + 1) {
    // `A -->` durante a digitação: o link ainda não tem destino. Estrito, isso
    // invalida o statement inteiro e o nó `A` — que o prefixo anterior já
    // mostrava — some da prévia. Tolerante, o link pendente é descartado e os
    // nós que já existem no texto ficam.
    if (!ctx.tolerante || grupos.length === 0) throw new Error('link sem nó de um dos lados')
    ctx.avisos.push({ linha: nLinha, trecho: s, mensagem: 'conexão ainda sem nó de destino' })
    links.length = grupos.length - 1
  }

  for (let i = 0; i < links.length; i++) {
    for (const de of grupos[i]) {
      for (const para of grupos[i + 1]) {
        modelo.conexoes.push({
          id: `c${modelo.conexoes.length + 1}`,
          de,
          para,
          rotulo: links[i].rotulo,
          tipo: links[i].estiloLinha,
          cauda: links[i].cauda,
          cabeca: links[i].cabeca,
          comprimento: links[i].comprimento,
          alertas: links[i].alertas || [],
        })
      }
    }
  }
}

function registrarNo(modelo, grupo, chunk, nLinha, erros, ctx) {
  const lido = lerNo(chunk, ctx)
  if (!lido) return null
  if (lido.parcial) {
    const no = garantirNo(modelo, lido.id)
    if (!no.alertas.some((a) => a.tipo === 'em-digitacao')) {
      no.alertas.push({ tipo: 'em-digitacao', detalhe: 'rótulo ainda sem fechamento no código' })
    }
    ctx.avisos.push({ linha: nLinha, trecho: chunk, mensagem: `rótulo de \`${lido.id}\` sem fechamento` })
  }
  if (RE_SHAPE_V11.test(chunk)) {
    erros.push({
      linha: nLinha,
      trecho: chunk,
      mensagem: 'sintaxe de shape do mermaid v11 (`@{...}`) não é lida por este parser',
    })
  }
  const novo = !modelo.nos.some((n) => n.id === lido.id)
  const no = garantirNo(modelo, lido.id)
  if (lido.rotuloBruto != null) {
    const d = decodificar(lido.rotuloBruto)
    no.rotulo = d.texto
    for (const a of d.alertas) if (!no.alertas.some((x) => x.tipo === a.tipo)) no.alertas.push(a)
  }
  if (lido.forma !== 'nenhuma') no.forma = lido.forma
  for (const c of lido.classes) if (!no.classes.includes(c)) no.classes.push(c)
  if (novo && grupo) grupo.nos.push(lido.id)
  return lido.id
}

/** Quebra o statement em pedaços de nó e tokens de link. */
function tokenizar(s) {
  const saida = []
  let buffer = ''
  let i = 0
  let aspas = false
  let prof = 0

  const despejar = () => {
    if (buffer.trim()) saida.push({ tipo: 'no', texto: buffer })
    buffer = ''
  }

  while (i < s.length) {
    const c = s[i]
    if (c === '"') {
      aspas = !aspas
      buffer += c
      i++
      continue
    }
    if (!aspas) {
      if ('([{'.includes(c)) prof++
      else if (')]}'.includes(c)) prof--
    }
    if (!aspas && prof <= 0 && '-=<~xo'.includes(c)) {
      const link = lerLink(s, i)
      if (link) {
        despejar()
        saida.push(link)
        i = link.fim
        continue
      }
    }
    buffer += c
    i++
  }
  despejar()
  return saida
}

function lerLink(s, i) {
  const resto = s.slice(i)

  const rotulado = RE_LINK_ROTULADO.exec(resto)
  const completo = RE_LINK.exec(resto)

  // `x`/`o` só são cabeça/cauda de link se colados num traço — senão é o id de um nó.
  if (completo && (completo[2] || completo[1]) && !completo[3]) return null

  if (completo && completo[4]) {
    let fim = i + completo[0].length
    let rotulo = null
    const pipe = /^\s*\|([^|]*)\|/.exec(s.slice(fim))
    if (pipe) {
      rotulo = decodificar(pipe[1]).texto
      fim += pipe[0].length
    }
    return montarLink(completo, rotulo, fim)
  }

  if (rotulado && rotulado[2].trim() && !/^[-=~.>xo]+$/.test(rotulado[2].trim())) {
    const abre = rotulado[1]
    const fecha = rotulado[3]
    return {
      tipo: 'link',
      rotulo: decodificar(rotulado[2].trim()).texto,
      estiloLinha: abre === '==' ? 'grossa' : abre === '-.' ? 'pontilhada' : 'solida',
      cauda: 'nenhuma',
      cabeca: /[>xo]$/.test(fecha) ? fecha[fecha.length - 1] : 'nenhuma',
      comprimento: 1,
      fim: i + rotulado[0].length,
      alertas: [],
    }
  }

  if (completo) {
    let fim = i + completo[0].length
    let rotulo = null
    const pipe = /^\s*\|([^|]*)\|/.exec(s.slice(fim))
    if (pipe) {
      rotulo = decodificar(pipe[1]).texto
      fim += pipe[0].length
    }
    return montarLink(completo, rotulo, fim)
  }

  return null
}

function montarLink(m, rotulo, fim) {
  const corpo = m[3]
  const estiloLinha = corpo.startsWith('=')
    ? 'grossa'
    : corpo.startsWith('~')
      ? 'invisivel'
      : corpo.includes('.')
        ? 'pontilhada'
        : 'solida'
  // comprimento = quantos traços além do mínimo (é o que o mermaid usa como "rank")
  const base = estiloLinha === 'pontilhada' ? 3 : estiloLinha === 'invisivel' ? 3 : 2
  return {
    tipo: 'link',
    rotulo,
    estiloLinha,
    cauda: m[1] ? '<' : m[2] || 'nenhuma',
    cabeca: m[4] || 'nenhuma',
    comprimento: Math.max(1, corpo.length - base + 1),
    fim,
    alertas: [],
  }
}

function lerNo(chunk, ctx = { tolerante: false }) {
  let t = chunk.trim()
  if (!t) return null

  const classes = []
  t = t.replace(/:::([A-Za-z0-9_-]+)/g, (_, c) => {
    classes.push(c)
    return ''
  })
  t = t.trim()
  if (!t) return null

  for (const [abre, fecha, forma] of ABERTURAS) {
    const iAbre = t.indexOf(abre)
    if (iAbre <= 0) continue
    if (!t.endsWith(fecha)) continue
    const id = t.slice(0, iAbre).trim()
    if (!id || !idValido(id)) continue
    const rotuloBruto = t.slice(iAbre + abre.length, t.length - fecha.length)
    return { id, rotuloBruto, forma, classes }
  }

  // Forma aberta e ainda sem fechamento: é o estado normal de quem está
  // digitando o rótulo. O texto já digitado vira rótulo parcial.
  if (ctx.tolerante) {
    for (const [abre, , forma] of ABERTURAS) {
      const iAbre = t.indexOf(abre)
      if (iAbre <= 0) continue
      const id = t.slice(0, iAbre).trim()
      if (!id || !idValido(id)) continue
      return { id, rotuloBruto: t.slice(iAbre + abre.length), forma, classes, parcial: true }
    }
  }

  const id = t.replace(/@\{[\s\S]*\}$/, '').trim()
  if (idValido(id)) return { id, rotuloBruto: null, forma: 'nenhuma', classes }

  // `A -` : o primeiro traço de uma seta ainda não forma link, e o pedaço
  // inteiro deixa de ser um id válido. Estrito, o nó `A` — que já estava na
  // prévia — some enquanto a pessoa digita a seta.
  if (ctx.tolerante) {
    const parcial = /^(\S+)\s+[-=~.<]+$/.exec(t)
    if (parcial && idValido(parcial[1])) {
      return { id: parcial[1], rotuloBruto: null, forma: 'nenhuma', classes }
    }
  }
  return null
}

const idValido = (id) => /^[^\s\[\](){}<>|"]+$/.test(id)
