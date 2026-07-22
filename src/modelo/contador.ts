// Contador de sessão — efêmero (FR-013/FR-016, research §8). Emite ids opacos e
// sequenciais `n1`, `n2`… e o rótulo padrão `Nó N`: UM contador só para as duas
// vistas. Monotônico: nunca reusa um id emitido (nem depois da linha apagada), e
// avança até um valor livre quando o próximo já está ocupado no texto da pessoa.

const numeroDe = (id: string): number | null => {
  const m = /^n(\d+)$/.exec(id)
  return m ? Number(m[1]) : null
}

export class Contador {
  private _proximo = 1

  get proximo(): number {
    return this._proximo
  }

  /** Bump monotônico: leva o próximo para além de qualquer `nK` já presente no texto. */
  observar(ocupados: Iterable<string>): void {
    for (const id of ocupados) {
      const n = numeroDe(id)
      if (n != null && n >= this._proximo) this._proximo = n + 1
    }
  }

  /** Emite o próximo id/rótulo livres. `ocupados` são os ids presentes no texto agora. */
  emitir(ocupados: Set<string>): { id: string; rotulo: string } {
    while (ocupados.has(`n${this._proximo}`)) this._proximo++
    const id = `n${this._proximo}`
    const rotulo = `Nó ${this._proximo}`
    this._proximo++
    return { id, rotulo }
  }
}
