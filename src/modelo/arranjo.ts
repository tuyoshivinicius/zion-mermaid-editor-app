// Arranjo (posição por identificador) — efêmero de SESSÃO (ADR-003/007). É a
// exceção deliberada da topologia: existe para a vista e a sessão, NUNCA para o
// código (FR-008 / Princípio V). Vive no mesmo store do modelo (não num segundo
// store paralelo); lembra a posição inclusive de ids que no momento não têm nó
// (linha apagada/recortada).

export interface Pos {
  x: number
  y: number
}

/** Origem fixa da área — ponto constante, independente do tamanho da janela e da sessão (SC-008). */
export const ORIGEM: Pos = { x: 48, y: 48 }
/** Passo da colocação local determinística. */
export const ESPACO = { dx: 220, dy: 120 }

export const chavePos = (p: Pos): string => `${p.x},${p.y}`

export class Arranjo {
  readonly porId = new Map<string, Pos>()

  /** criar/arrastar: grava a posição do id (FR-001/FR-007). */
  gravar(id: string, pos: Pos): void {
    this.porId.set(id, { x: pos.x, y: pos.y })
  }

  /** renomear (FR-018): move a lembrança do id antigo para o novo; o antigo a perde. */
  transferir(idAntigo: string, idNovo: string): void {
    if (idAntigo === idNovo) return
    const pos = this.porId.get(idAntigo)
    if (pos === undefined) return
    this.porId.set(idNovo, pos)
    this.porId.delete(idAntigo)
  }

  /**
   * FR-015 / SC-008. Nunca devolve um ponto ocupado (o produto nunca empilha).
   * 1. lembrada, se o lugar está livre;
   * 2. senão, colocação local determinística, ancorada no elemento anterior;
   * 3. sem âncora (primeiro nó) → origem fixa.
   */
  posicaoPara(id: string, ancora: Pos | null, ocupadas: Set<string>): Pos {
    const lembrada = this.porId.get(id)
    if (lembrada && !ocupadas.has(chavePos(lembrada))) return lembrada

    const base: Pos = ancora
      ? { x: ancora.x + ESPACO.dx, y: ancora.y }
      : { x: ORIGEM.x, y: ORIGEM.y }

    let pos = base
    while (ocupadas.has(chavePos(pos))) {
      pos = { x: pos.x, y: pos.y + ESPACO.dy }
    }
    return pos
  }
}

/**
 * Colocação de TODOS os nós do modelo, em duas passagens (SC-008 / Princípio VII):
 *   Passagem 1 — reserva o slot lembrado de cada nó que o tem livre (0 reposicionamentos);
 *   Passagem 2 — coloca o resto, determinístico, ancorado no anterior na ordem do código.
 * Grava todas as posições no arranjo (a partir daí ficam lembradas e estáveis).
 */
export function materializarPosicoes(
  arranjo: Arranjo,
  ordemIds: string[],
): Map<string, Pos> {
  const posicoes = new Map<string, Pos>()
  const ocupadas = new Set<string>()

  // Passagem 1: lembrados, na ordem do código (o primeiro a reservar vence).
  for (const id of ordemIds) {
    const lembrada = arranjo.porId.get(id)
    if (lembrada && !ocupadas.has(chavePos(lembrada))) {
      posicoes.set(id, lembrada)
      ocupadas.add(chavePos(lembrada))
    }
  }

  // Passagem 2: os que sobraram, ancorados no anterior na ordem do código.
  for (let i = 0; i < ordemIds.length; i++) {
    const id = ordemIds[i]
    if (posicoes.has(id)) continue
    const ancora = i > 0 ? posicoes.get(ordemIds[i - 1]) ?? null : null
    const pos = arranjo.posicaoPara(id, ancora, ocupadas)
    posicoes.set(id, pos)
    arranjo.gravar(id, pos)
    ocupadas.add(chavePos(pos))
  }

  return posicoes
}
