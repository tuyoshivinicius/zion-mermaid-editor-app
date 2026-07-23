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

/**
 * A aresta **dirigida** entre dois nós (R1). Só nó é ponta — agrupamento, não (FR-001).
 * A identidade (`id eN`) é EFÊMERA de sessão: nunca escrita no código (aresta flowchart
 * não tem token de id). Vive para seleção/duplicação/histórico referenciarem (data-model).
 */
export interface Conexao {
  /** `eN` — opaco, de sessão, nunca reusado, NUNCA escrito no código (research §4). */
  id: string
  /** id do nó de origem. */
  origem: string
  /** id do nó de destino. PODE ser `=== origem` (laço). */
  destino: string
  /** Texto integral (rótulo da aresta). Nasce `null` (neutro, RN-06). Byte a byte ou marcado (FR-006). */
  texto: string | null
  /** Lexema do conectivo lido (`-->`, `==>`, `-.->`…); default `-->`. Preservado byte-fiel; NÃO é estilo (research §9). */
  conectivo: string
  /** `expressividade` do texto da conexão (mesmo checker do rótulo de nó). */
  alertas: Alerta[]
}

/**
 * O elemento que **reúne nós e outros agrupamentos** (aninhamento, R1). Consome 1 vaga
 * de nó no envelope. Vínculo exclusivo e global: cada id pertence a no máximo um.
 */
export interface Agrupamento {
  /** `subN` — opaco, sequencial, nunca reusado. É ESCRITO no código (id do `subgraph`). */
  id: string
  /** Texto integral do título. Nasce neutro (`Grupo N`) no gesto; `null` = `subgraph` só com id. */
  titulo: string | null
  /** ids dos membros DIRETOS (nós e/ou agrupamentos). Ordem = ruído. Vínculo exclusivo. */
  membros: string[]
  /** `expressividade` do título. */
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
  /** NOVO (R1). Arestas dirigidas. Ordem = ruído (o juiz `normalizar` ordena). */
  conexoes: Conexao[]
  /** NOVO (R1). Blocos `subgraph`. Ordem = ruído. */
  agrupamentos: Agrupamento[]
}

export function vazio(): Modelo {
  return {
    palavraChave: 'flowchart',
    orientacao: 'TD',
    preservado: { frontmatter: null, diretivas: [], comentarios: [] },
    nos: [],
    conexoes: [],
    agrupamentos: [],
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

export function acharConexao(m: Modelo, id: string): Conexao | null {
  return m.conexoes.find((c) => c.id === id) ?? null
}

export function acharAgrupamento(m: Modelo, id: string): Agrupamento | null {
  return m.agrupamentos.find((g) => g.id === id) ?? null
}

/** Devolve o agrupamento de `id`, criando-o (sem título, sem membros) se ainda não existe. */
export function garantirAgrupamento(m: Modelo, id: string): Agrupamento {
  let g = acharAgrupamento(m, id)
  if (!g) {
    g = { id, titulo: null, membros: [], alertas: [] }
    m.agrupamentos.push(g)
  }
  return g
}

// --- Helpers de pertencimento e cascata (vínculo exclusivo, global) — T004 ---

/** O agrupamento (único) de que `id` é membro direto, ou `null` (solto). Vínculo exclusivo. */
export function paiDe(m: Modelo, id: string): Agrupamento | null {
  return m.agrupamentos.find((g) => g.membros.includes(id)) ?? null
}

/** Fecho transitivo de pertencimento: todos os descendentes (nós + subgrupos) de `idAgrup`. */
export function membrosTransitivos(m: Modelo, idAgrup: string): string[] {
  const out: string[] = []
  const visitar = (id: string): void => {
    const g = acharAgrupamento(m, id)
    if (!g) return
    for (const membro of g.membros) {
      out.push(membro)
      visitar(membro) // se o membro é um agrupamento, desce (aninhado)
    }
  }
  visitar(idAgrup)
  return out
}

/** As conexões presas a um nó (origem OU destino): uma aresta sem ponta não é expressável (SC-007). */
export function conexoesPresas(m: Modelo, idNo: string): Conexao[] {
  return m.conexoes.filter((c) => c.origem === idNo || c.destino === idNo)
}

/**
 * Dado um conjunto de ids a remover por um ato, devolve os ids dos agrupamentos que
 * ficam SEM membro por causa disso — em **cascata** pelos níveis aninhados (FR-011/SC-008).
 * Um bloco vazio escrito à mão (0 membros de origem, M5) NÃO cascateia: só some quem
 * **tinha** membro e ficou sem. Não inclui os `idsRemovidos` originais.
 */
export function cascataEsvaziamento(m: Modelo, idsRemovidos: Iterable<string>): string[] {
  const removidos = new Set(idsRemovidos)
  const cascata = new Set<string>()
  let mudou = true
  while (mudou) {
    mudou = false
    for (const g of m.agrupamentos) {
      if (removidos.has(g.id)) continue
      if (g.membros.length === 0) continue // vazio à mão (M5) não é esvaziamento por ato
      const aindaTemMembro = g.membros.some((id) => !removidos.has(id))
      if (!aindaTemMembro) {
        removidos.add(g.id)
        cascata.add(g.id)
        mudou = true
      }
    }
  }
  return [...cascata]
}
