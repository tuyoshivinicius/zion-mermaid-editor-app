// texto → modelo. NUNCA devolve "nada" (ADR-006 / Princípio IX): sempre um modelo
// + duas listas de severidade. Divide linhas e statements, preserva o preâmbulo,
// e consulta o registro de reconhecedores — sem nomear família nenhuma (Princípio XII).
//
// R1: o núcleo ganha a mecânica AGNÓSTICA de pilha de container (research §2). Não
// sabe de que família é o container; sabe que há uma pilha e que membros pegam o
// topo, com vínculo exclusivo (primeiro-vence, M4). Um container aberto sem fecho
// mantém-se aberto até o fim do documento (tolerância): os membros já lidos não somem.

import type { Modelo } from '../../modelo/modelo'
import { vazio, paiDe, acharAgrupamento } from '../../modelo/modelo'
import type { Achado, Ctx } from './reconhecedores'
import { todosReconhecedores } from './reconhecedores'

export interface Analise {
  modelo: Modelo
  erros: Achado[] // derruba o statement ofensor
  avisos: Achado[] // sinaliza sem derrubar (ex.: rótulo ainda sem fecho, bloco sem fim)
}

const RE_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/
const RE_DIRETIVA = /^%%\{[\s\S]*?\}%%$/

/**
 * @param opcoes.tolerante  (default true) trata o estado de digitação como
 *   legítimo — rótulo sem fecho vira parcial. `false` é braço de teste: regride a
 *   prévia enquanto se digita, que é o que a spec proíbe (SC-002).
 */
export function analisar(texto: string, opcoes: { tolerante?: boolean } = {}): Analise {
  const tolerante = opcoes.tolerante ?? true
  const modelo = vazio()
  const erros: Achado[] = []
  const avisos: Achado[] = []

  const containerStack: string[] = []
  const ctx: Ctx = {
    modelo,
    tolerante,
    erros,
    avisos,
    linha: 0,
    containerStack,
    abrirContainer(id: string) {
      containerStack.push(id)
    },
    fecharContainer() {
      containerStack.pop() // `end` sem par → no-op (tolerância)
    },
    // Materializar com a pilha não-vazia → membro do topo. Vínculo EXCLUSIVO,
    // primeiro-vence (M4): se `id` já tem dono, ignora — o 2º bloco não rouba.
    registrarMembro(id: string) {
      if (containerStack.length === 0) return
      const topo = containerStack[containerStack.length - 1]
      if (id === topo) return // um bloco não é membro de si mesmo
      if (paiDe(modelo, id) != null) return // já tem dono (primeiro vence)
      const g = acharAgrupamento(modelo, topo)
      if (g && !g.membros.includes(id)) g.membros.push(id)
    },
  }

  const reconhecedores = todosReconhecedores()

  let corpo = texto
  let deslocamento = 0

  const fm = RE_FRONTMATTER.exec(corpo)
  if (fm) {
    modelo.preservado.frontmatter = corpo.slice(0, fm[0].length).replace(/\r?\n$/, '')
    deslocamento = modelo.preservado.frontmatter.split('\n').length
    corpo = corpo.slice(fm[0].length)
  }

  const linhas = corpo.split(/\r?\n/)
  for (let i = 0; i < linhas.length; i++) {
    const nLinha = i + 1 + deslocamento
    let linha = linhas[i].trim()
    if (!linha) continue

    if (RE_DIRETIVA.test(linha)) {
      modelo.preservado.diretivas.push(linha)
      continue
    }
    if (linha.startsWith('%%')) {
      modelo.preservado.comentarios.push(linha)
      continue
    }
    // comentário no fim da linha (`n1[a] %% nota`) — `%%` fora de aspas inicia comentário.
    const posComentario = acharComentario(linha)
    if (posComentario >= 0) {
      modelo.preservado.comentarios.push(linha.slice(posComentario).trim())
      linha = linha.slice(0, posComentario).trim()
      if (!linha) continue
    }

    for (const statement of dividirStatements(linha)) {
      ctx.linha = nLinha
      let consumido = false
      for (const rec of reconhecedores) {
        if (rec.tentar(statement, ctx)) {
          consumido = true
          break
        }
      }
      if (!consumido) {
        // Statement fora do vocabulário: ilegível por inteiro. Não vira nó; o texto
        // permanece no editor (é da pessoa — FR-017). Registrado como erro localizado.
        erros.push({ linha: nLinha, trecho: statement, mensagem: 'statement fora do vocabulário' })
      }
    }
  }

  // Aninhar por menção (M3): mencionar o id de um agrupamento dentro de outro bloco
  // materializa um nó-fantasma pelo reconhecedor de nó, mas o id é, na verdade, um
  // bloco. O bloco vence — descarta o fantasma; o pertencimento (por id) permanece.
  if (modelo.agrupamentos.length > 0) {
    modelo.nos = modelo.nos.filter((n) => acharAgrupamento(modelo, n.id) == null)
  }

  // Container aberto sem fecho: os membros já lidos ficam; avisa sem derrubar (Princípio IX).
  if (containerStack.length > 0) {
    avisos.push({ linha: null, trecho: containerStack[containerStack.length - 1], mensagem: 'bloco aberto sem fechamento' })
  }

  return { modelo, erros, avisos }
}

/** `%%` só inicia comentário fora de aspas. */
function acharComentario(linha: string): number {
  let aspas = false
  for (let i = 0; i < linha.length - 1; i++) {
    const c = linha[i]
    if (c === '"') aspas = !aspas
    else if (!aspas && c === '%' && linha[i + 1] === '%') return i
  }
  return -1
}

/** `;` separa statements, fora de aspas e de colchetes. */
function dividirStatements(linha: string): string[] {
  const partes: string[] = []
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
