// O NÚCLEO ARITMÉTICO do enquadramento (contracts/enquadramento.md).
//
// Regra que vale para o arquivo inteiro, e que decorre do ADR-002: a engine
// entrega o canvas, não o desenho. Tudo o que a spec pede ALÉM do que React Flow
// promete — centralização determinística, descer abaixo do piso, deslocamento
// mínimo — vive aqui como aritmética PURA sobre (Caixa, Quadro, Enquadramento).
// Os componentes só APLICAM o que estas funções calculam; é esse corte que torna
// `FR-008`, `FR-009` e `FR-017` verificáveis em Vitest, sem navegador.
//
// Nenhuma função daqui lê ou escreve posição de elemento: o `Arranjo` é entrada,
// nunca saída (invariante A6 — é por isso que `SC-002` é verdadeiro por assinatura).

import { FOLGA_BORDA, PISO_ZOOM, TAMANHO_NATURAL, TETO_ZOOM } from './faixa'
import { ORIGEM } from '../modelo/arranjo'
import { CAIXA_H, CAIXA_W } from '../projecao/projetar'
import type { Caixa, Canto, Enquadramento, Ponto, Quadro } from './tipos'

/** O ponto do PLANO que aparece sob um ponto de tela, no enquadramento dado. */
export function pontoDoPlano(deTela: Ponto, e: Enquadramento): Ponto {
  return { x: (deTela.x - e.x) / e.zoom, y: (deTela.y - e.y) / e.zoom }
}

/** Onde um ponto do plano aparece na tela, no enquadramento dado. */
export function pontoDeTela(doPlano: Ponto, e: Enquadramento): Ponto {
  return { x: doPlano.x * e.zoom + e.x, y: doPlano.y * e.zoom + e.y }
}

/** O centro do quadro, em coordenadas de tela. A âncora de quem não tem ponteiro. */
export function centroDoQuadro(q: Quadro): Ponto {
  return { x: q.x + q.w / 2, y: q.y + q.h / 2 }
}

/**
 * FR-002 — zoom ancorado num ponto de TELA: o ponto do plano que estava sob ele
 * continua sob ele. Com ponteiro, o ponto é o do ponteiro; sem ponteiro (comando
 * ou atalho), é `centroDoQuadro`.
 */
export function zoomAncorado(e: Enquadramento, ancora: Ponto, fator: number): Enquadramento {
  const zoom = e.zoom * fator
  const razao = zoom / e.zoom
  return {
    x: ancora.x - (ancora.x - e.x) * razao,
    y: ancora.y - (ancora.y - e.y) * razao,
    zoom,
  }
}

/**
 * FR-007 — o quadro mudou de tamanho (a divisão arrastada, ou a janela): preserva o
 * zoom e o ponto do plano que estava no CENTRO. React Flow mantém `(x, y, zoom)`
 * fixos, o que ancora o canto superior esquerdo; esta conta O(1) ancora o centro.
 *
 * Medida sobre o quadro DESCONTADO (não o retângulo bruto), para concordar com `FR-011`.
 */
export function preservarCentro(
  e: Enquadramento,
  anterior: Quadro,
  atual: Quadro,
): Enquadramento {
  const antes = centroDoQuadro(anterior)
  const agora = centroDoQuadro(atual)
  return { x: e.x + (agora.x - antes.x), y: e.y + (agora.y - antes.y), zoom: e.zoom }
}

/**
 * FR-001 — o piso que a engine deve impor ao GESTO CONTÍNUO agora.
 *
 * Em operação normal é o piso declarado. Depois de um ajuste que terminou abaixo
 * dele (`FR-008` não se submete à faixa), o piso vira o nível corrente: afastar
 * mais satura ali em vez de saltar, aproximar sobe, e ao cruzar `PISO_ZOOM` de
 * volta o piso volta a ser o declarado. Recalculado ao FIM de cada gesto, nunca
 * por quadro.
 */
export function pisoCorrente(zoomCorrente: number): number {
  return Math.min(PISO_ZOOM, zoomCorrente)
}

/**
 * FR-001 — a saturação do gesto contínuo: o zoom PARA no limite e continua
 * respondendo; não salta, não trava a área e não falha em silêncio. Em runtime
 * quem satura é a engine (`minZoom`/`maxZoom`); esta função é a MESMA regra,
 * disponível para conta e para teste.
 */
export function saturar(zoom: number, piso: number = PISO_ZOOM): number {
  return Math.min(Math.max(zoom, piso), TETO_ZOOM)
}

// ── OS ALVOS (contracts/enquadramento.md §3) ─────────────────────────────────
// `fitView` da engine enquadra com padding RELATIVO e não promete centro exato
// quando o teto de 1:1 dita a escala — que é justamente o caso em que a spec exige
// resultado único. Por isso os quatro alvos são aritmética de produto, e nenhum
// deles conhece a faixa: quem a conhece é o gesto contínuo (`pisoCorrente`). É essa
// separação que faz `FR-001` e `FR-008` conviverem sem exceção escrita à mão.

/** O enquadramento que põe um ponto do PLANO no centro do quadro, numa escala dada. */
function centrarNoQuadro(pontoDoPlanoAlvo: Ponto, q: Quadro, zoom: number): Enquadramento {
  const c = centroDoQuadro(q)
  return { x: c.x - pontoDoPlanoAlvo.x * zoom, y: c.y - pontoDoPlanoAlvo.y * zoom, zoom }
}

/**
 * O PADRÃO DECLARADO da sessão (`FR-017`): tamanho natural, com o ponto do plano em
 * que a colocação determinística do R0 faz nascer o primeiro elemento no centro do
 * quadro. É para cá que ajustar à tela leva um diagrama vazio — sem acusar erro:
 * punir o começo da sessão por um gesto legítimo seria o oposto do que ele existe
 * para fazer.
 */
export function padraoDeclarado(q: Quadro): Enquadramento {
  const nascimento = { x: ORIGEM.x + CAIXA_W / 2, y: ORIGEM.y + CAIXA_H / 2 }
  return centrarNoQuadro(nascimento, q, TAMANHO_NATURAL)
}

/**
 * FR-008 — tudo dentro, com folga, CENTRALIZADO, sem ampliar além do natural.
 *
 * "Tudo dentro com folga" é o PISO do gesto, não o seu resultado: um diagrama parado
 * num canto satisfaria a letra e frustraria a promessa. Por isso o centro da extensão
 * termina no centro do quadro — inclusive quando é o teto de 1:1 que dita a escala e
 * sobra área visível em volta (A1, A3).
 *
 * O zoom NÃO é recortado pelo piso (A2): o arranjo é livre e o plano não tem paredes.
 */
export function alvoAjustar(extensao: Caixa | null, q: Quadro): Enquadramento {
  if (!extensao) return padraoDeclarado(q)

  const util = { w: Math.max(1, q.w - 2 * FOLGA_BORDA), h: Math.max(1, q.h - 2 * FOLGA_BORDA) }
  const porLargura = extensao.w > 0 ? util.w / extensao.w : Infinity
  const porAltura = extensao.h > 0 ? util.h / extensao.h : Infinity
  const zoom = Math.min(porLargura, porAltura, TAMANHO_NATURAL)

  const centro = { x: extensao.x + extensao.w / 2, y: extensao.y + extensao.h / 2 }
  return centrarNoQuadro(centro, q, zoom)
}

/**
 * FR-009 — só a escala: o ponto do plano que estava no centro do quadro continua no
 * centro (A4). Resetar NÃO é ajustar à tela — voltar ao tamanho natural pode deixar o
 * diagrama maior que a tela de novo, e isso é o esperado: são dois gestos com duas
 * promessas. Juntá-los tiraria dela a possibilidade de voltar a 1:1 sem perder de
 * vista o trecho em que estava trabalhando.
 */
export function alvoResetar(e: Enquadramento, q: Quadro): Enquadramento {
  return zoomAncorado(e, centroDoQuadro(q), TAMANHO_NATURAL / e.zoom)
}

/**
 * FR-017 — com conteúdo, o alvo de ajustar (mesma regra, mesma folga, mesmo centro);
 * vazio, o padrão declarado. Abrir NUNCA pode deixar a pessoa olhando para uma área
 * visível vazia com o conteúdo fora do quadro.
 */
export function alvoAbertura(extensao: Caixa | null, q: Quadro): Enquadramento {
  return alvoAjustar(extensao, q)
}

/** O deslocamento MÍNIMO que põe `[a, a+t]` dentro de `[r, r+d]`; 0 se já está. */
function deslocamentoMinimo(a: number, t: number, r: number, d: number, alinharNoInicio: boolean): number {
  if (t > d) {
    // Não cabe: alinha o CANTO DE PARTIDA da ordem de leitura. Reescalar debaixo dos
    // pés da pessoa surpreende mais do que mostrar o elemento parcialmente.
    return alinharNoInicio ? r - a : r + d - (a + t)
  }
  if (a < r) return r - a
  if (a + t > r + d) return r + d - (a + t)
  return 0
}

/**
 * FR-012 — pan PURO, deslocamento mínimo, ancorado no canto de leitura quando não cabe.
 *
 * O nível de zoom NÃO muda, nenhum elemento é movido e o código fica byte-idêntico: o
 * que muda é só `(x, y)`. Deslocamento NULO quando o elemento já está visível (A5).
 *
 * `elemento` é a extensão desenhada, em coordenadas do PLANO — a mesma que o `FR-008`
 * enquadra e que `estaNaAreaVisivel` mede. Divergir entre "está visível" e "trazer
 * para a área visível" é violação de contrato.
 */
export function alvoTrazer(
  elemento: Caixa,
  e: Enquadramento,
  q: Quadro,
  canto: Canto,
): Enquadramento {
  // o elemento em coordenadas de TELA, sob o enquadramento corrente
  const canto1 = pontoDeTela({ x: elemento.x, y: elemento.y }, e)
  const largura = elemento.w * e.zoom
  const altura = elemento.h * e.zoom

  // o mesmo quadro recuado da mesma folga que o `FR-008` usa
  const r = {
    x: q.x + FOLGA_BORDA,
    y: q.y + FOLGA_BORDA,
    w: Math.max(0, q.w - 2 * FOLGA_BORDA),
    h: Math.max(0, q.h - 2 * FOLGA_BORDA),
  }

  const aEsquerda = canto === 'superior-esquerdo' || canto === 'inferior-esquerdo'
  const emCima = canto === 'superior-esquerdo' || canto === 'superior-direito'

  return {
    x: e.x + deslocamentoMinimo(canto1.x, largura, r.x, r.w, aEsquerda),
    y: e.y + deslocamentoMinimo(canto1.y, altura, r.y, r.h, emCima),
    zoom: e.zoom, // inalterado — este gesto move o enquadramento e SÓ ele
  }
}

/**
 * FR-015 — a re-ancoragem do arrasto em curso. Duas subtrações, O(1), pura.
 *
 * O arrasto guarda `deslocamentoCapturado = ponto_do_plano_sob_o_ponteiro −
 * posição_do_elemento`, fixado no início. Quando o enquadramento muda sem o
 * ponteiro se mexer, o ponto do plano sob ele muda — e o deslocamento precisa
 * acompanhar, senão o elemento salta pela diferença no próximo movimento.
 *
 * Onde o zoom é ancorado no ponteiro (`FR-002`), os dois pontos são iguais e a
 * correção dá ZERO por construção.
 */
export function reancorarArrasto(
  deslocamentoCapturado: Ponto,
  pontoDoPlanoAnterior: Ponto,
  pontoDoPlanoAtual: Ponto,
): Ponto {
  return {
    x: deslocamentoCapturado.x + (pontoDoPlanoAtual.x - pontoDoPlanoAnterior.x),
    y: deslocamentoCapturado.y + (pontoDoPlanoAtual.y - pontoDoPlanoAnterior.y),
  }
}
