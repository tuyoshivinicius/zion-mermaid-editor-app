// Reconhecedor + emissor do nó retangular — o vocabulário de nó do R0
// (contracts/codec.md, research §2a). Módulo da FAMÍLIA flowchart.
//
// Casa SÓ duas formas: identificador sozinho (`nN`) e identificador + rótulo
// entre colchetes (`nN[…]`, aspas opcionais `nN["…"]`). Qualquer outra coisa —
// token de link, outro delimitador de shape — é ilegível POR INTEIRO, sem
// materialização parcial de linha.

import type { Reconhecedor, Ctx } from '../nucleo/reconhecedores'
import type { No } from '../../modelo/modelo'
import { garantirNo } from '../../modelo/modelo'
import { decodificar, codificar } from '../nucleo/rotulo'

// Identificador do R0: mais ESTRITO que o `idValido` permissivo do spike. Só
// letra/dígito/underscore — sem sequência de link, sem delimitador de shape.
const RE_ID = /^[A-Za-z0-9_]+/

/**
 * Reconhecedor de nó retangular. Empurra no modelo o nó lido, ou devolve `false`
 * (statement ilegível — nada nasce, nem os nós que um mermaid de fora extrairia).
 */
export const reconhecedorNoRetangular: Reconhecedor = {
  tentar(statement: string, ctx: Ctx): boolean {
    const lido = lerNo(statement.trim(), ctx.tolerante)
    if (!lido) return false

    const no = garantirNo(ctx.modelo, lido.id)
    if (lido.temRotulo) {
      const d = decodificar(lido.rotuloBruto)
      // Identificador repetido → um nó só; a ÚLTIMA declaração de rótulo prevalece (FR-016).
      no.rotulo = d.texto
      for (const a of d.alertas) if (!no.alertas.some((x) => x.tipo === a.tipo)) no.alertas.push(a)
    }
    if (lido.parcial) {
      if (!no.alertas.some((a) => a.tipo === 'em-digitacao')) {
        no.alertas.push({ tipo: 'em-digitacao', detalhe: 'rótulo ainda sem fechamento no código' })
      }
      ctx.avisos.push({ linha: ctx.linha, trecho: statement, mensagem: `rótulo de \`${lido.id}\` sem fechamento` })
    }
    return true
  },
}

interface NoLido {
  id: string
  temRotulo: boolean
  rotuloBruto: string | null
  parcial: boolean
}

/**
 * Lê UM statement como nó retangular. Devolve `null` se a forma inteira não casa
 * (→ ilegível). Sem materialização parcial de linha (research §2a).
 */
function lerNo(s: string, tolerante: boolean): NoLido | null {
  if (!s) return null

  const m = RE_ID.exec(s)
  if (!m) return null
  const id = m[0]
  const resto = s.slice(id.length)

  // Identificador sozinho: o statement inteiro é o id (`nN`).
  if (resto === '') {
    return { id, temRotulo: false, rotuloBruto: null, parcial: false }
  }

  // A única continuação legível é o delimitador retangular. Qualquer outro começo
  // (`(`, `{`, `>`, `<`, espaço-seguido-de-link, `-`, `=`, `~`, …) → ilegível.
  if (resto[0] !== '[') return null
  const interno = resto.slice(1)

  // Forma com aspas: `["…"]`. O fecho é `"]` no FIM do statement.
  if (interno[0] === '"') {
    const iFecho = interno.indexOf('"]')
    if (iFecho >= 0) {
      // Precisa terminar exatamente em `"]` — nada depois (senão há link/coisa: ilegível).
      if (iFecho + 2 !== interno.length) return null
      return { id, temRotulo: true, rotuloBruto: interno.slice(0, iFecho + 1), parcial: false }
    }
    // Aspas abertas e sem fecho: estado de digitação (FR-018).
    if (!tolerante) return null
    return { id, temRotulo: true, rotuloBruto: interno, parcial: true }
  }

  // Forma crua: `[texto]`. O fecho é o PRIMEIRO `]`; precisa ser o fim do statement.
  const iColchete = interno.indexOf(']')
  if (iColchete >= 0) {
    if (iColchete !== interno.length - 1) return null // sobrou conteúdo após o `]` → ilegível
    return { id, temRotulo: true, rotuloBruto: interno.slice(0, iColchete), parcial: false }
  }

  // Colchete aberto e ainda sem fecho: rótulo parcial (FR-018).
  if (!tolerante) return null
  return { id, temRotulo: true, rotuloBruto: interno, parcial: true }
}

/**
 * Um label é "simples" se cabe cru entre colchetes sem risco nenhum para o
 * mermaid: só letra, dígito e espaço simples, sem borda. Qualquer pontuação
 * especial vai por aspas+escape (codificar) — conservador de propósito.
 */
const RE_ROTULO_SIMPLES = /^[\p{L}\p{N} ]+$/u
function rotuloSimples(texto: string): boolean {
  return (
    texto.length > 0 &&
    texto === texto.trim() &&
    !/ {2}/.test(texto) &&
    RE_ROTULO_SIMPLES.test(texto)
  )
}

/**
 * modelo → UM statement de nó retangular (research §3). Usado em runtime pela
 * escrita cirúrgica e pelo serializador de documento. Determinístico: mesmo nó →
 * mesmo statement (é o que dá o ponto fixo).
 */
export function emitirNo(no: No): string {
  if (no.rotulo == null) return no.id
  if (rotuloSimples(no.rotulo)) return `${no.id}[${no.rotulo}]`
  return `${no.id}[${codificar(no.rotulo).bruto}]`
}
