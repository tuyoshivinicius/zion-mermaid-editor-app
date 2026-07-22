// Toda mutação é transação (ADR-009 / Princípio IV). A transação é a unidade do
// desfazer, e o arranjo entra no histórico JUNTO com a estrutura. O GESTO de
// desfazer/refazer é diferido (`desfazer-e-refazer`); aqui existem a unidade
// (transação), a coalescência da rajada (SC-007) e a costura do histórico.

import type { Modelo } from './modelo'
import type { Pos } from './arranjo'

export type Origem = 'canvas' | 'editor'

export interface EntradaHistorico {
  origem: Origem
  textoEditor: string
  modelo: Modelo
  arranjo: Map<string, Pos> // cópia do arranjo no instante (as duas metades: estrutura + arranjo)
}

/**
 * Histórico com coalescência por chave: transações consecutivas que carregam a
 * MESMA chave (ex.: a rajada de digitação num rótulo) fundem numa entrada só
 * (SC-007). Uma chave `null`, ou diferente, abre entrada nova.
 */
export class Historico {
  readonly entradas: EntradaHistorico[] = []
  private ultimaChave: string | null = null

  registrar(entrada: EntradaHistorico, coalescerCom: string | null = null): void {
    if (coalescerCom != null && coalescerCom === this.ultimaChave && this.entradas.length > 0) {
      this.entradas[this.entradas.length - 1] = entrada // coalesce: substitui a última
    } else {
      this.entradas.push(entrada)
    }
    this.ultimaChave = coalescerCom
  }

  /** Fecha a rajada corrente: a próxima transação abre entrada nova, mesmo com a mesma chave. */
  encerrarRajada(): void {
    this.ultimaChave = null
  }
}
