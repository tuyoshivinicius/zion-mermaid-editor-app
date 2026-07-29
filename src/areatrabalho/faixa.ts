// OS NÚMEROS DECLARADOS da área de trabalho — num arquivo só, deliberadamente.
// `FR-008` (ajustar à tela) e `FR-011` (está na área visível) medem contra a MESMA
// folga e a MESMA geometria: uma constante duplicada faria os dois divergirem sem
// que teste nenhum acusasse (research §1, contracts/enquadramento.md §1).
//
// Nenhum destes números é decisão de produto tomada aqui: cada um responde a um
// compromisso que a spec declarou e o research justificou.

/** Piso da faixa do GESTO CONTÍNUO (`FR-001`). Ajustar à tela não se submete a ele. */
export const PISO_ZOOM = 0.01
/** Teto da faixa (`FR-001`): 4× — o rótulo `text-xs` (12px) vira 48px, legível de perto. */
export const TETO_ZOOM = 4
/** A escala 1:1 do desenho (`FR-001`, `FR-009`). Dentro da faixa por construção. */
export const TAMANHO_NATURAL = 1

/**
 * Tamanho de referência DA ÁREA DO DIAGRAMA (não da janela) contra o qual o
 * compromisso do piso é medido (`FR-001`). A área menor que isto não move a faixa:
 * quem entrega o diagrama inteiro é o `FR-008`, descendo abaixo do piso.
 */
export const AREA_REFERENCIA = { w: 1280, h: 720 }

/**
 * Folga da borda, em px DE TELA (não do plano) — uma só para `FR-008` e `FR-011`,
 * para que "não encostado na borda" signifique a mesma coisa em qualquer zoom.
 */
export const FOLGA_BORDA = 24

/** Mínimo declarado da área do diagrama (`FR-006`): abriga a barra com plano útil sobrando. */
export const MIN_DIAGRAMA = 480
/** Mínimo declarado do editor de código (`FR-006`): o `min-w-[320px]` que o R0 já declarou. */
export const MIN_EDITOR = 320
/** Derivado. Abaixo disto a área de trabalho para de encolher e quem cede é a PÁGINA. */
export const SOMA_DOS_MINIMOS = MIN_DIAGRAMA + MIN_EDITOR

/** Fração da largura que cabe ao editor (`FR-006`, `FR-017`) — o 58/42 que o R0/R1 já entrega. */
export const PROPORCAO_PADRAO = 0.42

/** Duração do trânsito até o destino (`FR-008`, `FR-009`, `FR-012`): ≈9 quadros a 50fps. */
export const DURACAO_TRANSITO = 180

/** Passo do zoom por acionamento de botão ou tecla (`FR-001`, `FR-018`). A roda é contínua. */
export const PASSO_ZOOM = 1.2
