// A ÁREA VISÍVEL (FR-011) — o contrato que esta spec paga para as outras.
// Até aqui "área visível" era palavra sem dono; aqui ela tem definição, medida e
// uma superfície chamável (contracts/area-visivel.md).
//
//   quadro = retângulo da área do diagrama
//          ∩ retângulo da janela              ← a página rolada encolhe a área visível
//          − faixas de sobreposição persistente ← o que o produto tapa não conta
//
// A interseção com a janela resolve a janela abaixo da soma dos mínimos (`FR-006`)
// SEM código especial: o pedaço fora da tela sai da conta sozinho. As sobreposições
// são REGISTRADAS, não presumidas — e o recuo é por BORDA, para que o quadro
// permaneça retangular, que é o que a aritmética de centralizar e de deslocamento
// mínimo exige.
//
// `FR-008`, `FR-011` e `FR-012` medem contra este mesmo quadro. Não há segunda régua.

import { FOLGA_BORDA } from './faixa'
import type { Borda, Caixa, Enquadramento, Oclusao, Quadro, Retangulo } from './tipos'

/** Interseção de dois retângulos de tela; `w`/`h` saturam em 0, nunca ficam negativos. */
function intersecao(a: Retangulo, b: Retangulo): Retangulo {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  return { x, y, w: Math.max(0, x2 - x), h: Math.max(0, y2 - y) }
}

/**
 * O QUADRO: o que a pessoa VÊ do plano, em coordenadas de tela RELATIVAS à área do
 * diagrama — o mesmo referencial do enquadramento (`p * zoom + (x, y)`).
 *
 * Sem rolagem de página e sem sobreposição, quadro ≡ retângulo da área, como a spec diz.
 */
export function quadroVisivel(
  retanguloDaArea: Retangulo,
  janela: Retangulo,
  oclusoes: Oclusao[],
): Quadro {
  const visivel = intersecao(retanguloDaArea, janela)

  // do referencial da JANELA para o referencial da ÁREA DO DIAGRAMA
  const relativo: Quadro = {
    x: visivel.w === 0 && visivel.h === 0 ? 0 : visivel.x - retanguloDaArea.x,
    y: visivel.w === 0 && visivel.h === 0 ? 0 : visivel.y - retanguloDaArea.y,
    w: visivel.w,
    h: visivel.h,
  }

  // recuo pela MAIOR espessura declarada em cada borda (nunca pela soma)
  const recuo: Record<Borda, number> = { topo: 0, direita: 0, baixo: 0, esquerda: 0 }
  for (const o of oclusoes) recuo[o.borda] = Math.max(recuo[o.borda], o.espessura)

  return {
    x: relativo.x + recuo.esquerda,
    y: relativo.y + recuo.topo,
    w: Math.max(0, relativo.w - recuo.esquerda - recuo.direita),
    h: Math.max(0, relativo.h - recuo.topo - recuo.baixo),
  }
}

/** O mesmo quadro em coordenadas do PLANO, dado o enquadramento corrente. */
export function quadroNoPlano(q: Quadro, e: Enquadramento): Caixa {
  return {
    x: (q.x - e.x) / e.zoom,
    y: (q.y - e.y) / e.zoom,
    w: q.w / e.zoom,
    h: q.h / e.zoom,
  }
}

// ── o registro das sobreposições persistentes ────────────────────────────────
// Registro, nunca presunção: cada controle persistente DECLARA `{borda, espessura}`
// ao montar e recebe o cancelamento. A spec prefere descontar a sobreposição a
// proibi-la — e é a barra que paga, em código, o preço que a spec declarou.

const registro = new Map<string, Oclusao>()

/** Um controle persistente declara a faixa que tapa, ao montar. Devolve o cancelamento. */
export function registrarOclusao(o: Oclusao): () => void {
  registro.set(o.id, o)
  return () => {
    // só cancela se ainda for a MESMA declaração (remontagem não apaga a nova)
    if (registro.get(o.id) === o) registro.delete(o.id)
  }
}

/** As sobreposições declaradas agora. Entrada de `quadroVisivel`. */
export function oclusoesRegistradas(): Oclusao[] {
  return [...registro.values()]
}

/**
 * FR-011 — o elemento ESTÁ na área visível quando a sua extensão desenhada está
 * INTEIRA dentro do quadro recuado de `FOLGA_BORDA`. Encostar na borda, ou aparecer
 * pela metade, NÃO conta.
 *
 * A folga e a geometria são as mesmas que o `FR-008` lê — não há segunda régua.
 * Divergir entre "está visível" e "ajustar à tela" é violação de contrato: faria
 * "está visível" responder sim para um elemento que ajustar à tela acabara de cortar.
 *
 * A extensão vem em coordenadas do PLANO e o quadro em coordenadas de TELA, por isso
 * o enquadramento entra: a folga é declarada em px de tela, para que "não encostado
 * na borda" signifique a mesma coisa em qualquer zoom.
 *
 * A resposta é sempre sobre o AGORA: nada aqui promete que um elemento FIQUE visível.
 */
export function estaNaAreaVisivel(extensao: Caixa, q: Quadro, e: Enquadramento): boolean {
  const x = extensao.x * e.zoom + e.x
  const y = extensao.y * e.zoom + e.y
  const w = extensao.w * e.zoom
  const h = extensao.h * e.zoom

  // `alvoTrazer` pousa o elemento EXATAMENTE sobre a folga — é o deslocamento
  // mínimo, por definição. Sem esta tolerância, o resíduo de ponto flutuante da
  // conversão plano↔tela faria as duas funções discordarem sobre o mesmo pixel, que
  // é precisamente a divergência que a Invariante 3 do contrato proíbe.
  const EPS = 1e-6

  return (
    x >= q.x + FOLGA_BORDA - EPS &&
    y >= q.y + FOLGA_BORDA - EPS &&
    x + w <= q.x + q.w - FOLGA_BORDA + EPS &&
    y + h <= q.y + q.h - FOLGA_BORDA + EPS
  )
}
