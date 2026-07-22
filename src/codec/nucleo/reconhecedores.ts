// Registro de reconhecedores — o vocabulário como DADO, não como código
// descartável (ADR-008 / contracts/codec.md). O núcleo consulta o registro sem
// jamais nomear uma família (Princípio XII): itera o que estiver registrado.
//
// Este arquivo é do NÚCLEO. Não pode conter nome de família nenhum.

import type { Modelo, No } from '../../modelo/modelo'

export interface Achado {
  linha: number | null
  trecho: string
  mensagem: string
}

/** Contexto que o núcleo passa a cada reconhecedor durante a análise. */
export interface Ctx {
  modelo: Modelo
  tolerante: boolean
  erros: Achado[]
  avisos: Achado[]
  linha: number
}

export interface Reconhecedor {
  /**
   * Devolve `true` se consumiu o statement (empurrando nós/alertas no modelo).
   * NUNCA materializa parcialmente: ou casa a forma inteira, ou devolve `false`
   * (→ o statement é ilegível por inteiro).
   */
  tentar(statement: string, ctx: Ctx): boolean
}

/** O que uma família ensina ao núcleo: como ler statements e como emitir um nó. */
export interface FamiliaCodec {
  reconhecedores: Reconhecedor[]
  emitir: (no: No) => string
}

const registro = new Map<string, FamiliaCodec>()

export function registrar(familia: string, def: FamiliaCodec): void {
  registro.set(familia, def)
}

export function limparRegistro(): void {
  registro.clear()
}

/**
 * Todos os reconhecedores registrados, na ordem de registro (dentro de cada
 * família, na ordem do array). No R0 só uma família está registrada.
 */
export function todosReconhecedores(): Reconhecedor[] {
  const todos: Reconhecedor[] = []
  for (const def of registro.values()) todos.push(...def.reconhecedores)
  return todos
}

/** O emissor de statement ativo (o serializador o usa por nó — research §3). */
export function emissor(): (no: No) => string {
  const primeira = registro.values().next()
  if (primeira.done) {
    throw new Error('nenhuma família de codec registrada — chame registrar() antes de serializar')
  }
  return primeira.value.emitir
}
