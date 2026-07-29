// Os tipos de geometria da área de trabalho — puros, sem React e sem engine
// (data-model.md §2). É esse corte que torna `FR-008`, `FR-011` e `FR-012`
// verificáveis em Vitest, sem navegador.

/** Um ponto — de tela ou do plano, conforme o contexto de quem chama. */
export interface Ponto {
  x: number
  y: number
}

/**
 * O transform da área do diagrama: para onde a área visível foi levada sobre o
 * plano, e em que escala. A MESMA tripla que a engine usa — nenhuma conversão de
 * ida e volta. Um ponto do plano `p` aparece em `p * zoom + (x, y)`, em
 * coordenadas relativas à área do diagrama.
 */
export interface Enquadramento {
  x: number
  y: number
  zoom: number
}

/** Retângulo em coordenadas DO PLANO. Unidade da extensão desenhada. */
export interface Caixa {
  x: number
  y: number
  w: number
  h: number
}

/**
 * A ÁREA VISÍVEL em coordenadas de tela, relativas à área do diagrama: já
 * recortada pela janela e descontadas as sobreposições persistentes (`FR-011`).
 * É o que a pessoa VÊ do plano, não o que a proporção reservou.
 */
export interface Quadro {
  x: number
  y: number
  w: number
  h: number
}

/** Retângulo de tela cru (a área do diagrama, a janela) — a entrada de `quadroVisivel`. */
export interface Retangulo {
  x: number
  y: number
  w: number
  h: number
}

export type Borda = 'topo' | 'direita' | 'baixo' | 'esquerda'

/**
 * O que um controle persistente DECLARA ao montar. O quadro recua pela MAIOR
 * espessura declarada em cada borda — recuar por borda (em vez de subtrair
 * polígonos) mantém o quadro retangular, que é o que a aritmética de centralizar
 * e de deslocamento mínimo exige.
 */
export interface Oclusao {
  id: string
  borda: Borda
  espessura: number
}

/** A orientação corrente. Dado de `layout-automatico` (`RF-16`, ADR-007). */
export type Orientacao = 'TB' | 'TD' | 'BT' | 'LR' | 'RL'

/** O COMEÇO do elemento na ordem de leitura (`FR-012`), derivado da orientação. */
export type Canto =
  | 'superior-esquerdo'
  | 'superior-direito'
  | 'inferior-esquerdo'
  | 'inferior-direito'

/**
 * A ponte mínima entre o store e a engine. Tudo o que o produto decide é
 * aritmética; o piloto só APLICA. É ele que permite `ciclo-por-teclado` chamar
 * `trazerParaAreaVisivel` sem saber que existe React Flow (`FR-012`).
 */
export interface Piloto {
  enquadramentoCorrente(): Enquadramento
  aplicar(e: Enquadramento, comTransito: boolean): void
  quadro(): Quadro
}

/** Adaptador de fronteira: o DOM fala `width/height`, a aritmética fala `w/h`. */
export function deRetanguloDOM(r: { x: number; y: number; width: number; height: number }): Retangulo {
  return { x: r.x, y: r.y, w: r.width, h: r.height }
}
