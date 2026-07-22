// Escrita cirúrgica — FR-017. O texto do editor é DA PESSOA: nenhuma dessas
// funções re-serializa o documento. Só a linha do elemento afetado muda; o resto
// fica byte-idêntico. Funções puras de texto, sem UI — US1 e US3 apenas as chamam.
//
// Não é do núcleo (`src/codec/cirurgica.ts`): pode nomear a família.

import type { No } from '../modelo/modelo'
import { emitirNo } from './flowchart/no'
import { RE_CABECALHO_FLOWCHART, RE_CABECALHO_OUTRO_TIPO } from './flowchart/cabecalho'

/**
 * FR-017 — acrescenta a linha do nó novo NO FIM do documento; nada acima muda.
 * O nó novo criado por gesto nasce como `emitirNo(no)` (statement na forma canônica).
 */
export function appendLinhaNoFim(texto: string, no: No): string {
  const linha = emitirNo(no)
  if (texto === '') return linha
  return texto.endsWith('\n') ? texto + linha : texto + '\n' + linha
}

const CABECALHO_ALVO = 'flowchart TD'

/**
 * FR-014 — a transformação da cópia. Garante EXATAMENTE uma declaração de tipo,
 * `flowchart TD`, sobre o texto da pessoa; todo o resto vai byte-idêntico,
 * inclusive trechos ilegíveis (US3-8). O editor permanece intocado (é o chamador
 * quem decide o que fazer com o retorno).
 */
export function normalizarCabecalhoParaCopia(texto: string): string {
  if (texto.trim() === '') return CABECALHO_ALVO

  const linhas = texto.split('\n')
  for (let i = 0; i < linhas.length; i++) {
    const s = linhas[i].trim()
    if (RE_CABECALHO_FLOWCHART.test(s)) {
      // Já é uma declaração da própria família → intocado (o texto da pessoa vence).
      return texto
    }
    if (RE_CABECALHO_OUTRO_TIPO.test(s)) {
      // Declaração de OUTRO tipo → substitui aquela linha por `flowchart TD`.
      linhas[i] = CABECALHO_ALVO
      return linhas.join('\n')
    }
  }
  // Sem declaração reconhecida → acrescenta `flowchart TD` no topo.
  return CABECALHO_ALVO + '\n' + texto
}
