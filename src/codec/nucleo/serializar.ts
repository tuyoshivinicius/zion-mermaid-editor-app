// modelo → texto. Normalizador com PONTO FIXO: analisar(serializar(m)) ≡ m
// (normalizado) e serializar é idempotente (research §3). Exposto em duas
// granularidades: o DOCUMENTO (só em teste — round-trip/ponto fixo) e UM
// statement por nó (runtime, via `emissor()` do registro — a escrita cirúrgica).
//
// Núcleo: o cabeçalho vem do modelo (`palavraChave`/`orientacao`), nunca de um
// literal — o núcleo não nomeia família (Princípio XII).

import type { Modelo } from '../../modelo/modelo'
import { emissor } from './reconhecedores'

const INDENT = '  '

/** modelo → documento inteiro. SÓ em teste (round-trip / ponto fixo). */
export function serializar(modelo: Modelo): string {
  const emitir = emissor()
  const fora: string[] = []

  if (modelo.preservado.frontmatter) fora.push(modelo.preservado.frontmatter)
  for (const d of modelo.preservado.diretivas) fora.push(d)

  fora.push(`${modelo.palavraChave} ${modelo.orientacao}`)

  for (const c of modelo.preservado.comentarios) fora.push(INDENT + c)
  for (const n of modelo.nos) fora.push(INDENT + emitir(n))

  return fora.join('\n')
}

export interface ModeloNormalizado {
  palavraChave: string
  orientacao: string
  frontmatter: string | null
  diretivas: string[]
  comentarios: string[]
  nos: Array<{ id: string; rotulo: string | null }>
}

/**
 * Comparação estrutural (juiz do round-trip; ignora ruído de ordem). Dois modelos
 * iguais aqui descrevem o mesmo diagrama.
 */
export function normalizar(modelo: Modelo): ModeloNormalizado {
  return {
    palavraChave: modelo.palavraChave,
    orientacao: modelo.orientacao,
    frontmatter: modelo.preservado.frontmatter,
    diretivas: [...modelo.preservado.diretivas].sort(),
    comentarios: [...modelo.preservado.comentarios].sort(),
    nos: [...modelo.nos]
      .map((n) => ({ id: n.id, rotulo: n.rotulo }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  }
}
