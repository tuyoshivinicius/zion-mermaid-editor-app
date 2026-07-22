// A única verdade é o Modelo em memória (ADR-003). Canvas e código são vistas
// dele. Recorte do R0: só o nó materializa. Campos efêmeros (posição, zoom,
// seleção, foco) NUNCA vivem aqui — são estado de sessão e nunca são
// serializados no código (Princípio V / data-model.md).

/** Origem de um alerta preso a um nó. */
export type TipoAlerta =
  // rótulo aberto e ainda sem fecho — estado de digitação, não erro (FR-018)
  | 'em-digitacao'
  // o tipo de diagrama corrente não expressa fielmente este texto (o *checker*
  // do rótulo). A marca VISÍVEL é `codigo-de-entrada`; aqui só a propriedade.
  | 'expressividade'
  | 'caractere-de-controle'
  | 'tabulacao'
  | 'espaco-colapsado'
  | 'markdown-no-rotulo'

export interface Alerta {
  tipo: TipoAlerta
  detalhe?: string
}

/** O único elemento que o R0 materializa. */
export interface No {
  /** Chave do nó no código (FR-016). Opaco e estável; não deriva do rótulo. */
  id: string
  /** Texto do rótulo. `null` = identificador sozinho (`nN`); o rótulo exibido é o próprio id (FR-005). */
  rotulo: string | null
  /** Alertas: `em-digitacao` (FR-018) e `expressividade` (o checker do rótulo). */
  alertas: Alerta[]
}

/** Preâmbulo lossless do núcleo (ADR-003/008): sobrevive ao ciclo, viaja na cópia. */
export interface Preservado {
  frontmatter: string | null
  diretivas: string[]
  comentarios: string[]
}

/** A única verdade estrutural do diagrama. Nenhuma das duas vistas é dona dele. */
export interface Modelo {
  /** Fixo `flowchart` no R0 (o tipo não troca — `tipo-*`). `graph` normaliza para `flowchart`. */
  palavraChave: 'flowchart'
  /** Constante do produto no R0 (FR-019). Escolher/trocar é `layout-automatico`. */
  orientacao: 'TD'
  preservado: Preservado
  nos: No[]
}

export function vazio(): Modelo {
  return {
    palavraChave: 'flowchart',
    orientacao: 'TD',
    preservado: { frontmatter: null, diretivas: [], comentarios: [] },
    nos: [],
  }
}

export function acharNo(m: Modelo, id: string): No | null {
  return m.nos.find((n) => n.id === id) ?? null
}

/**
 * Devolve o nó de `id`, criando-o (sem rótulo, sem alertas) se ainda não existe.
 * Identidade por id: identificador repetido no texto → UM nó só (FR-016).
 */
export function garantirNo(m: Modelo, id: string): No {
  let n = acharNo(m, id)
  if (!n) {
    n = { id, rotulo: null, alertas: [] }
    m.nos.push(n)
  }
  return n
}
