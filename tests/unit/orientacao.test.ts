import { describe, it, expect } from 'vitest'
import { cantoDeLeitura, orientacaoCorrente } from '../../src/areatrabalho/orientacao'
import type { Canto, Orientacao } from '../../src/areatrabalho/tipos'

// O CANTO DE PARTIDA DA ORDEM DE LEITURA (T042 / FR-012 / Princípio VI).
//
// "O começo do elemento na ordem de leitura" é GEOMÉTRICO e relativo à orientação
// corrente, com o mesmo sentido que o termo tem na constitution — medido nas 4
// orientações. Um diagrama lido de baixo para cima, ancorado no topo, mostraria
// justamente a ponta que a pessoa lê por ÚLTIMO; é esse erro que a tabela impede.
//
// UMA REGRA SÓ para nó, conexão e agrupamento: não há geometria por tipo de elemento.

const TABELA: [Orientacao, Canto][] = [
  ['TB', 'superior-esquerdo'],
  ['TD', 'superior-esquerdo'],
  ['BT', 'inferior-esquerdo'],
  ['LR', 'superior-esquerdo'],
  ['RL', 'superior-direito'],
]

describe('cantoDeLeitura nas 4 orientações (T042 / FR-012)', () => {
  it.each(TABELA)('%s → %s', (orientacao, canto) => {
    expect(cantoDeLeitura(orientacao)).toBe(canto)
  })

  it('de cima para baixo e da esquerda para a direita começam no MESMO canto', () => {
    expect(cantoDeLeitura('TB')).toBe(cantoDeLeitura('LR'))
    expect(cantoDeLeitura('TD')).toBe(cantoDeLeitura('TB'))
  })

  it('BT ancora EMBAIXO — não no topo, que é onde a leitura termina', () => {
    expect(cantoDeLeitura('BT')).toContain('inferior')
  })

  it('RL ancora à DIREITA — não à esquerda', () => {
    expect(cantoDeLeitura('RL')).toContain('direito')
  })

  it('cobre as 4 orientações do Princípio VI, sem buraco', () => {
    const orientacoes: Orientacao[] = ['TB', 'TD', 'BT', 'LR', 'RL']
    for (const o of orientacoes) expect(typeof cantoDeLeitura(o)).toBe('string')
  })
})

describe('a costura de UM VALOR SÓ com `layout-automatico` (T042 / ADR-007)', () => {
  it('a orientação corrente é hoje `TD` — o que o R0/R1 fixa no cabeçalho', () => {
    expect(orientacaoCorrente()).toBe('TD')
  })

  it('trocar a orientação NÃO exige tocar em `FR-012`: a regra lê o valor', () => {
    // é a mesma função para os cinco valores; `layout-automatico` (RF-16) substitui
    // a fonte do valor sem alterar uma linha da regra do canto.
    const cantos = (['TB', 'TD', 'BT', 'LR', 'RL'] as Orientacao[]).map(cantoDeLeitura)
    expect(new Set(cantos).size).toBe(3) // superior-esquerdo, inferior-esquerdo, superior-direito
  })
})
