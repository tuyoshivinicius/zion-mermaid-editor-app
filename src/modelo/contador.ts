// Contador de sessão — efêmero (FR-013/FR-016, research §8). Emite ids opacos e
// sequenciais por ESPÉCIE (`n1`, `e1`, `sub1`…) e um rótulo/título neutro. R1
// generaliza o contador único do R0 para UM por espécie: nó (`n`, rótulo `Nó N`),
// conexão (`e`, SEM texto — nasce neutra) e agrupamento (`sub`, título `Grupo N`).
// Monotônico: nunca reusa um id emitido; avança até um valor livre quando o próximo
// já está ocupado no texto da pessoa. `ocupados` no emitir cobre TODOS os ids do
// documento (nós + agrupamentos), de modo que espécie nenhuma colida com id escrito
// à mão — inclusive um `subgraph n5` não faz o contador de nó emitir `n5`.

/** Rótulo/título neutro por número (ou `null` — a conexão nasce sem texto). */
export type RotuloNeutro = (n: number) => string | null

export class Contador {
  private _proximo = 1
  private readonly re: RegExp

  /** Default = o contador de nó do R0 (`new Contador()` ≡ prefixo `n`, rótulo `Nó N`). */
  constructor(
    private readonly prefixo: string = 'n',
    private readonly rotuloNeutro: RotuloNeutro = (n) => `Nó ${n}`,
  ) {
    this.re = new RegExp(`^${prefixo}(\\d+)$`)
  }

  get proximo(): number {
    return this._proximo
  }

  private numeroDe(id: string): number | null {
    const m = this.re.exec(id)
    return m ? Number(m[1]) : null
  }

  /** Bump monotônico: leva o próximo para além de qualquer `<prefixo>K` já presente no texto. */
  observar(ocupados: Iterable<string>): void {
    for (const id of ocupados) {
      const n = this.numeroDe(id)
      if (n != null && n >= this._proximo) this._proximo = n + 1
    }
  }

  /** Emite o próximo id/rótulo livres. `ocupados` são os ids presentes no texto agora. */
  emitir(ocupados: Set<string>): { id: string; rotulo: string | null } {
    while (ocupados.has(`${this.prefixo}${this._proximo}`)) this._proximo++
    const id = `${this.prefixo}${this._proximo}`
    const rotulo = this.rotuloNeutro(this._proximo)
    this._proximo++
    return { id, rotulo }
  }
}

/** As três espécies de id da sessão (research §8). A conexão (`e`) NÃO observa o código. */
export interface Contadores {
  no: Contador
  conexao: Contador
  agrupamento: Contador
}

export function contadoresPadrao(): Contadores {
  return {
    no: new Contador('n', (n) => `Nó ${n}`),
    conexao: new Contador('e', () => null),
    agrupamento: new Contador('sub', (n) => `Grupo ${n}`),
  }
}
