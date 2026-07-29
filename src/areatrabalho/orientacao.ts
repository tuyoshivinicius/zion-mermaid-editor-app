// A COSTURA DE UM VALOR SÓ com `layout-automatico` (FR-012, ADR-007).
//
// Qual é a orientação corrente é de `layout-automatico` (`RF-16`), não daqui. O que
// esta spec precisa é do TERMO — "o começo do elemento na ordem de leitura" — com o
// mesmo sentido que ele tem na constitution (Princípio VI), medido nas 4 orientações.
//
// Expor a orientação num ponto único é o que permite `layout-automatico` substituir o
// valor sem tocar numa linha do `FR-012`.

import type { Canto, Orientacao } from './tipos'

/**
 * A orientação corrente do diagrama. Hoje o R0/R1 fixa `TD` no cabeçalho e o codec
 * descarta a orientação ao analisar — então há UM valor, e ele é este. Quando
 * `layout-automatico` (`RF-16`) chegar, é esta função que passa a lê-lo do modelo.
 */
export function orientacaoCorrente(): Orientacao {
  return 'TD'
}

/**
 * O canto por onde a leitura do diagrama COMEÇA, na orientação dada. Uma regra só
 * para nó, conexão e agrupamento — não há geometria por tipo de elemento.
 *
 * Um diagrama lido de baixo para cima, ancorado no topo, mostraria justamente a ponta
 * que a pessoa lê por último.
 */
export function cantoDeLeitura(orientacao: Orientacao): Canto {
  switch (orientacao) {
    case 'BT':
      return 'inferior-esquerdo'
    case 'RL':
      return 'superior-direito'
    default: // TB, TD, LR
      return 'superior-esquerdo'
  }
}
