// Registro de reconhecedores — o vocabulário como DADO, não como código
// descartável (ADR-008 / contracts/codec.md). O núcleo consulta o registro sem
// jamais nomear uma família (Princípio XII): itera o que estiver registrado.
//
// Este arquivo é do NÚCLEO. Não pode conter nome de família nenhum.

import type { Modelo, No, Conexao, Agrupamento } from '../../modelo/modelo'

export interface Achado {
  linha: number | null
  trecho: string
  mensagem: string
}

/**
 * Contexto que o núcleo passa a cada reconhecedor durante a análise. R1 acrescenta
 * a **pilha de container** — agnóstica: o núcleo não sabe que o container é um bloco
 * de agrupamento; sabe que há uma pilha e que membros pegam o topo (research §2).
 */
export interface Ctx {
  modelo: Modelo
  tolerante: boolean
  erros: Achado[]
  avisos: Achado[]
  linha: number
  /** ids dos containers abertos (topo = mais interno). Vazio no nível do documento. */
  containerStack: string[]
  /** Um reconhecedor de família chama ao abrir um bloco. */
  abrirContainer(id: string): void
  /** …e ao fechar. `end` sem par é no-op (tolerância, Princípio IX). */
  fecharContainer(): void
  /** Materializar um elemento com a pilha não-vazia → membro do topo (exclusivo, 1º vence — M4). */
  registrarMembro(id: string): void
}

export interface Reconhecedor {
  /**
   * Devolve `true` se consumiu o statement (empurrando nós/alertas no modelo).
   * NUNCA materializa parcialmente: ou casa a forma inteira, ou devolve `false`
   * (→ o statement é ilegível por inteiro).
   */
  tentar(statement: string, ctx: Ctx): boolean
}

/**
 * O que uma família ensina ao núcleo: como ler statements e como emitir cada espécie.
 * `emitir` (nó) é do R0; as três emissões novas são do R1 (opcionais para uma família
 * que ainda não as tenha).
 */
export interface FamiliaCodec {
  reconhecedores: Reconhecedor[]
  emitir: (no: No) => string
  emitirConexao?: (c: Conexao, m: Modelo) => string
  emitirAgrupamentoAbre?: (g: Agrupamento) => string
  emitirAgrupamentoFecha?: () => string
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
 * família, na ordem do array). No R1 só uma família está registrada.
 */
export function todosReconhecedores(): Reconhecedor[] {
  const todos: Reconhecedor[] = []
  for (const def of registro.values()) todos.push(...def.reconhecedores)
  return todos
}

function familiaAtiva(): FamiliaCodec {
  const primeira = registro.values().next()
  if (primeira.done) {
    throw new Error('nenhuma família de codec registrada — chame registrar() antes de serializar')
  }
  return primeira.value
}

/** O emissor de statement de NÓ ativo (o serializador o usa por nó — research §3). */
export function emissor(): (no: No) => string {
  return familiaAtiva().emitir
}

/** O emissor de CONEXÃO ativo (R1). */
export function emissorConexao(): (c: Conexao, m: Modelo) => string {
  const f = familiaAtiva()
  if (!f.emitirConexao) throw new Error('a família ativa não emite conexão')
  return f.emitirConexao
}

/** Os emissores de ABRE/FECHA de bloco de agrupamento ativos (R1). */
export function emissorAgrupamento(): {
  abre: (g: Agrupamento) => string
  fecha: () => string
} {
  const f = familiaAtiva()
  if (!f.emitirAgrupamentoAbre || !f.emitirAgrupamentoFecha) {
    throw new Error('a família ativa não emite agrupamento')
  }
  return { abre: f.emitirAgrupamentoAbre, fecha: f.emitirAgrupamentoFecha }
}
