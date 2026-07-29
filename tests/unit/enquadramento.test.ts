import { describe, it, expect } from 'vitest'
import {
  zoomAncorado,
  preservarCentro,
  pisoCorrente,
  saturar,
  pontoDoPlano,
  pontoDeTela,
  alvoAjustar,
  alvoResetar,
  alvoAbertura,
} from '../../src/areatrabalho/enquadramento'
import {
  AREA_REFERENCIA,
  FOLGA_BORDA,
  PASSO_ZOOM,
  PISO_ZOOM,
  TAMANHO_NATURAL,
  TETO_ZOOM,
} from '../../src/areatrabalho/faixa'
import { ORIGEM } from '../../src/modelo/arranjo'
import { CAIXA_W, CAIXA_H } from '../../src/projecao/projetar'
import type { Caixa, Enquadramento, Quadro } from '../../src/areatrabalho/tipos'

// O NÚCLEO ARITMÉTICO do enquadramento (T006 / contracts/enquadramento.md §2).
// Aritmética pura sobre (Caixa, Quadro, Enquadramento): sem React, sem engine.

const quadro = (over: Partial<Quadro> = {}): Quadro => ({ x: 0, y: 0, w: 800, h: 600, ...over })
const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 9)

describe('zoomAncorado — o ponto de TELA fica fixo (T006 / FR-002)', () => {
  it('o ponto do plano sob o ponteiro continua sob o ponteiro', () => {
    const e: Enquadramento = { x: -300, y: -120, zoom: 1.5 }
    const ponteiro = { x: 420, y: 310 }
    const antes = pontoDoPlano(ponteiro, e)
    const depois = zoomAncorado(e, ponteiro, 1.2)
    const agora = pontoDoPlano(ponteiro, depois)
    perto(agora.x, antes.x)
    perto(agora.y, antes.y)
  })

  it('vale para qualquer fator, aproximando e afastando', () => {
    const e: Enquadramento = { x: 37, y: -410, zoom: 0.73 }
    const ponteiro = { x: 111, y: 592 }
    for (const fator of [0.25, 0.5, 1 / 1.2, 1, 1.2, 3, 7.5]) {
      const antes = pontoDoPlano(ponteiro, e)
      const agora = pontoDoPlano(ponteiro, zoomAncorado(e, ponteiro, fator))
      perto(agora.x, antes.x)
      perto(agora.y, antes.y)
    }
  })

  it('a escala é multiplicada pelo fator, e só ela decide o tamanho', () => {
    const r = zoomAncorado({ x: 0, y: 0, zoom: 2 }, { x: 100, y: 100 }, 1.2)
    perto(r.zoom, 2.4)
  })

  it('ancorado na ORIGEM da tela, a translação é reescalada e nada mais', () => {
    const r = zoomAncorado({ x: -100, y: -50, zoom: 1 }, { x: 0, y: 0 }, 2)
    expect(r).toEqual({ x: -200, y: -100, zoom: 2 })
  })

  it('sem ponteiro o gesto ancora no CENTRO do quadro (FR-002)', () => {
    const q = quadro()
    const e: Enquadramento = { x: -300, y: -120, zoom: 1.5 }
    const centro = { x: q.x + q.w / 2, y: q.y + q.h / 2 }
    const antes = pontoDoPlano(centro, e)
    const agora = pontoDoPlano(centro, zoomAncorado(e, centro, 1.2))
    perto(agora.x, antes.x)
    perto(agora.y, antes.y)
  })
})

describe('pontoDoPlano / pontoDeTela — as duas metades da mesma conversão (T006)', () => {
  it('ida e volta devolve o ponto de partida', () => {
    const e: Enquadramento = { x: -87, y: 231, zoom: 0.37 }
    const p = { x: 412, y: 98 }
    const volta = pontoDeTela(pontoDoPlano(p, e), e)
    perto(volta.x, p.x)
    perto(volta.y, p.y)
  })
})

describe('preservarCentro — o quadro mudou de tamanho (T006 / FR-007)', () => {
  it('o zoom não muda e o ponto do plano no CENTRO continua no centro', () => {
    const e: Enquadramento = { x: -420, y: -260, zoom: 1.8 }
    const anterior = quadro({ w: 800, h: 600 })
    const atual = quadro({ w: 520, h: 600 })
    const centroAntes = { x: anterior.x + anterior.w / 2, y: anterior.y + anterior.h / 2 }
    const alvoNoPlano = pontoDoPlano(centroAntes, e)

    const depois = preservarCentro(e, anterior, atual)

    expect(depois.zoom).toBe(e.zoom) // 0 mudanças de zoom (SC-007)
    const centroDepois = { x: atual.x + atual.w / 2, y: atual.y + atual.h / 2 }
    const agora = pontoDoPlano(centroDepois, depois)
    perto(agora.x, alvoNoPlano.x)
    perto(agora.y, alvoNoPlano.y)
  })

  it('a fórmula do research: x cresce metade do que a largura visível cresceu', () => {
    const e: Enquadramento = { x: 0, y: 0, zoom: 1 }
    const r = preservarCentro(e, quadro({ w: 800, h: 600 }), quadro({ w: 600, h: 400 }))
    expect(r).toEqual({ x: -100, y: -100, zoom: 1 })
  })

  it('quadro do mesmo tamanho → enquadramento idêntico (0 reenquadramentos gratuitos)', () => {
    const e: Enquadramento = { x: -33, y: 91, zoom: 0.62 }
    expect(preservarCentro(e, quadro(), quadro())).toEqual(e)
  })

  it('o recuo por oclusão entra na conta: o centro é o do quadro DESCONTADO', () => {
    const e: Enquadramento = { x: 0, y: 0, zoom: 1 }
    const anterior = quadro({ x: 0, y: 0, w: 800, h: 600 })
    const atual = quadro({ x: 0, y: 0, w: 800, h: 556 }) // barra de 44px embaixo
    const r = preservarCentro(e, anterior, atual)
    expect(r).toEqual({ x: 0, y: -22, zoom: 1 })
  })
})

describe('pisoCorrente — o piso que a engine impõe ao gesto contínuo AGORA (T006 / FR-001)', () => {
  it('em operação normal o piso é o declarado', () => {
    expect(pisoCorrente(1)).toBe(PISO_ZOOM)
    expect(pisoCorrente(0.5)).toBe(PISO_ZOOM)
    expect(pisoCorrente(PISO_ZOOM)).toBe(PISO_ZOOM)
  })

  it('abaixo do piso, o piso vira o NÍVEL CORRENTE — afastar mais satura ali', () => {
    expect(pisoCorrente(0.006)).toBe(0.006)
    expect(pisoCorrente(0.0001)).toBe(0.0001)
  })

  it('é min(PISO_ZOOM, z) — nunca sobe acima do declarado', () => {
    for (const z of [0.001, 0.005, 0.01, 0.02, 1, 4]) {
      expect(pisoCorrente(z)).toBe(Math.min(PISO_ZOOM, z))
    }
  })
})

// ── T011 (US1): A FAIXA E A SATURAÇÃO (FR-001, FR-002) ──────────────────────
// A faixa governa o GESTO CONTÍNUO, não ajustar à tela. Ela é estável: não se move
// com o conteúdo nem com o tamanho da área do diagrama (contracts/enquadramento.md §4).

describe('a faixa e a saturação do gesto contínuo (T011 / FR-001)', () => {
  it('a faixa CONTÉM o tamanho natural, por construção', () => {
    expect(PISO_ZOOM).toBeLessThan(TAMANHO_NATURAL)
    expect(TETO_ZOOM).toBeGreaterThan(TAMANHO_NATURAL)
  })

  it('o gesto contínuo PARA no piso e no teto — não salta e não passa', () => {
    expect(saturar(0.004)).toBe(PISO_ZOOM)
    expect(saturar(9)).toBe(TETO_ZOOM)
    expect(saturar(0.5)).toBe(0.5)
  })

  it('no limite o gesto CONTINUA respondendo: aproximar do piso sobe', () => {
    const noPiso = saturar(PISO_ZOOM / 2)
    expect(noPiso).toBe(PISO_ZOOM)
    expect(saturar(noPiso * PASSO_ZOOM)).toBeGreaterThan(noPiso)
  })

  it('no teto o gesto continua respondendo: afastar desce', () => {
    const noTeto = saturar(TETO_ZOOM * 3)
    expect(noTeto).toBe(TETO_ZOOM)
    expect(saturar(noTeto / PASSO_ZOOM)).toBeLessThan(noTeto)
  })

  it('o passo é 1,2× por acionamento (botão e tecla; a roda é contínua)', () => {
    expect(PASSO_ZOOM).toBe(1.2)
    const r = zoomAncorado({ x: 0, y: 0, zoom: 1 }, { x: 400, y: 300 }, PASSO_ZOOM)
    perto(r.zoom, 1.2)
    perto(zoomAncorado(r, { x: 400, y: 300 }, 1 / PASSO_ZOOM).zoom, 1)
  })

  it('~13 acionamentos levam de 1 até o teto (research §1)', () => {
    let z = TAMANHO_NATURAL
    let passos = 0
    while (z < TETO_ZOOM && passos < 100) {
      z = saturar(z * PASSO_ZOOM)
      passos++
    }
    expect(z).toBe(TETO_ZOOM)
    expect(passos).toBeLessThanOrEqual(13)
  })
})

describe('minZoom dinâmico: descer abaixo do piso sem perder a saturação (T011 / FR-001, FR-008)', () => {
  it('abaixo do piso, afastar SATURA NO NÍVEL CORRENTE — não salta para o piso', () => {
    const abaixo = 0.006 // um ajuste terminou aqui (FR-008 não se submete à faixa)
    const piso = pisoCorrente(abaixo)
    expect(piso).toBe(abaixo)
    expect(saturar(abaixo / PASSO_ZOOM, piso)).toBe(abaixo)
  })

  it('abaixo do piso, aproximar sobe; ao cruzar o piso declarado ele volta a valer', () => {
    const abaixo = 0.006
    const subiu = saturar(abaixo * PASSO_ZOOM, pisoCorrente(abaixo))
    expect(subiu).toBeGreaterThan(abaixo)
    // já de volta acima do piso declarado, o piso volta a ser 0,01
    expect(pisoCorrente(0.5)).toBe(PISO_ZOOM)
    expect(saturar(0.004, pisoCorrente(0.5))).toBe(PISO_ZOOM)
  })

  it('recalculado ao FIM do gesto, nunca por quadro: é função só do zoom corrente', () => {
    // pura e idempotente — a mesma entrada dá a mesma saída, sem estado escondido
    expect(pisoCorrente(0.006)).toBe(pisoCorrente(0.006))
    expect(pisoCorrente(pisoCorrente(0.006))).toBe(pisoCorrente(0.006))
  })
})

describe('a faixa NÃO se move com o conteúdo nem com o tamanho da área (T011 / FR-001)', () => {
  it('nenhuma função da faixa recebe o quadro — não há por onde o tamanho da área entrar', () => {
    expect(pisoCorrente).toHaveLength(1) // (zoomCorrente) e nada mais
    // e o piso PADRÃO é o número declarado, não algo derivado da área do momento
    expect(saturar(0.004)).toBe(PISO_ZOOM)
    expect(saturar(0.004, pisoCorrente(TAMANHO_NATURAL))).toBe(PISO_ZOOM)
  })

  it('a área menor que a referência não desce o piso (quem entrega o inteiro é o FR-008)', () => {
    expect(AREA_REFERENCIA).toEqual({ w: 1280, h: 720 })
    expect(pisoCorrente(TAMANHO_NATURAL)).toBe(PISO_ZOOM)
  })
})

// ── T029 (US3): OS ALVOS E AS INVARIANTES A1–A7 ─────────────────────────────
// `fitView` da engine enquadra com padding relativo e não promete centro exato
// quando o teto de 1:1 dita a escala — que é justamente o caso em que a spec exige
// resultado único. Os alvos são aritmética de produto (contracts/enquadramento.md §3).

const centroDe = (c: { x: number; y: number; w: number; h: number }) => ({
  x: c.x + c.w / 2,
  y: c.y + c.h / 2,
})

/** Onde o centro da extensão foi parar na tela, sob o enquadramento dado. */
const centroNaTela = (ext: Caixa, e: Enquadramento) => pontoDeTela(centroDe(ext), e)

describe('alvoAjustar — tudo dentro, com folga, CENTRALIZADO (T029 / FR-008, SC-004)', () => {
  const q = quadro({ w: 1000, h: 700 })

  it('A3: o resultado é ÚNICO — N partidas distintas, 1 estado final', () => {
    const ext: Caixa = { x: -3000, y: 500, w: 8000, h: 2400 }
    const alvo = alvoAjustar(ext, q)
    // a assinatura sequer aceita o enquadramento de partida: a unicidade é estrutural
    expect(alvoAjustar).toHaveLength(2)
    for (const partida of [
      { x: 0, y: 0, zoom: 1 },
      { x: -9999, y: 4321, zoom: 3.9 },
      { x: 12, y: -77, zoom: 0.011 },
    ]) {
      void partida
      expect(alvoAjustar(ext, q)).toEqual(alvo)
    }
  })

  it('o centro da extensão termina no CENTRO do quadro — 0 desvios', () => {
    for (const ext of [
      { x: 0, y: 0, w: 4000, h: 300 },
      { x: -1200, y: -800, w: 2400, h: 1600 },
      { x: 900, y: 40, w: 170, h: 52 },
    ] as Caixa[]) {
      const alvo = alvoAjustar(ext, q)
      const naTela = centroNaTela(ext, alvo)
      perto(naTela.x, centroDe(q).x)
      perto(naTela.y, centroDe(q).y)
    }
  })

  it('tudo fica DENTRO, e com a folga que separa da borda', () => {
    const ext: Caixa = { x: -300, y: 120, w: 5200, h: 3100 }
    const alvo = alvoAjustar(ext, q)
    const cantoA = pontoDeTela({ x: ext.x, y: ext.y }, alvo)
    const cantoB = pontoDeTela({ x: ext.x + ext.w, y: ext.y + ext.h }, alvo)
    expect(cantoA.x).toBeGreaterThanOrEqual(q.x + FOLGA_BORDA - 1e-9)
    expect(cantoA.y).toBeGreaterThanOrEqual(q.y + FOLGA_BORDA - 1e-9)
    expect(cantoB.x).toBeLessThanOrEqual(q.x + q.w - FOLGA_BORDA + 1e-9)
    expect(cantoB.y).toBeLessThanOrEqual(q.y + q.h - FOLGA_BORDA + 1e-9)
  })

  it('A1: NUNCA amplia além do tamanho natural — "tudo visível", não "tudo grande"', () => {
    // um nó só, que caberia ampliado 5×
    expect(alvoAjustar({ x: 0, y: 0, w: 170, h: 52 }, q).zoom).toBe(TAMANHO_NATURAL)
    // e ainda assim CENTRALIZADO: é o centro que responde quando a escala não decide
    const ext: Caixa = { x: 640, y: 480, w: 170, h: 52 }
    const naTela = centroNaTela(ext, alvoAjustar(ext, q))
    perto(naTela.x, centroDe(q).x)
    perto(naTela.y, centroDe(q).y)
  })

  it('A2: NÃO é recortado pelo piso — pode terminar abaixo dele', () => {
    // um arranjo espalhado à mão que exige escala menor que 0,01
    const ext: Caixa = { x: 0, y: 0, w: 400_000, h: 3000 }
    const alvo = alvoAjustar(ext, q)
    expect(alvo.zoom).toBeLessThan(PISO_ZOOM)
    // e a função nem conhece a faixa: quem a conhece é o gesto contínuo
    expect(alvo.zoom).toBeCloseTo((q.w - 2 * FOLGA_BORDA) / ext.w, 12)
  })

  it('a dimensão que amarra é a mais apertada das duas', () => {
    const alto: Caixa = { x: 0, y: 0, w: 100, h: 100_000 }
    expect(alvoAjustar(alto, q).zoom).toBeCloseTo((q.h - 2 * FOLGA_BORDA) / alto.h, 12)
  })

  it('diagrama VAZIO → o padrão declarado, e NENHUM erro', () => {
    const alvo = alvoAjustar(null, q)
    expect(alvo.zoom).toBe(TAMANHO_NATURAL)
    expect(Number.isFinite(alvo.x)).toBe(true)
    expect(Number.isFinite(alvo.y)).toBe(true)
  })

  it('o quadro recuado por oclusão centraliza no quadro DESCONTADO', () => {
    const comBarra = quadro({ x: 0, y: 0, w: 1000, h: 656 }) // 44px de barra embaixo
    const ext: Caixa = { x: 0, y: 0, w: 2000, h: 1000 }
    const naTela = centroNaTela(ext, alvoAjustar(ext, comBarra))
    perto(naTela.y, centroDe(comBarra).y)
  })
})

describe('alvoResetar — só a escala (T029 / FR-009, SC-006)', () => {
  const q = quadro({ w: 1000, h: 700 })

  it('leva ao tamanho natural EXATO, de qualquer nível, em 1 gesto', () => {
    for (const z of [0.004, 0.01, 0.37, 1, 2.5, 4]) {
      expect(alvoResetar({ x: -321, y: 654, zoom: z }, q).zoom).toBe(TAMANHO_NATURAL)
    }
  })

  it('A4: NÃO recentra — o ponto do plano no centro do quadro continua no centro', () => {
    for (const e of [
      { x: -1200, y: -640, zoom: 2.7 },
      { x: 340, y: 90, zoom: 0.02 },
    ] as Enquadramento[]) {
      const alvoNoPlano = pontoDoPlano(centroDe(q), e)
      const r = alvoResetar(e, q)
      const agora = pontoDoPlano(centroDe(q), r)
      perto(agora.x, alvoNoPlano.x) // 0 deslocamento do ponto central
      perto(agora.y, alvoNoPlano.y)
    }
  })

  it('resetar NÃO é ajustar à tela: pode deixar o diagrama maior que a tela', () => {
    const ext: Caixa = { x: 0, y: 0, w: 9000, h: 40 }
    const ajustado = alvoAjustar(ext, q)
    const resetado = alvoResetar(ajustado, q)
    expect(resetado.zoom).toBe(TAMANHO_NATURAL)
    expect(ajustado.zoom).toBeLessThan(TAMANHO_NATURAL)
    // são dois gestos com duas promessas — e nenhum dos dois é o outro
    expect(resetado).not.toEqual(ajustado)
  })
})

describe('alvoAbertura — derivado do conteúdo (T029 / FR-017, SC-013)', () => {
  const q = quadro({ w: 1000, h: 700 })

  it('com conteúdo ≡ alvoAjustar — mesma regra, mesma folga, mesmo centro', () => {
    const ext: Caixa = { x: 4800, y: -2200, w: 6000, h: 900 }
    expect(alvoAbertura(ext, q)).toEqual(alvoAjustar(ext, q))
  })

  it('vazio → o padrão declarado: zoom 1, com o ponto de NASCIMENTO no centro', () => {
    const r = alvoAbertura(null, q)
    expect(r.zoom).toBe(TAMANHO_NATURAL)
    const nascimento = { x: ORIGEM.x + CAIXA_W / 2, y: ORIGEM.y + CAIXA_H / 2 }
    const naTela = pontoDeTela(nascimento, r)
    perto(naTela.x, centroDe(q).x)
    perto(naTela.y, centroDe(q).y)
  })

  it('abrir NUNCA deixa a pessoa olhando para uma área visível vazia', () => {
    // conteúdo longe de onde a colocação determinística começa
    const ext: Caixa = { x: 90_000, y: -40_000, w: 3000, h: 2000 }
    const r = alvoAbertura(ext, q)
    const a = pontoDeTela({ x: ext.x, y: ext.y }, r)
    const b = pontoDeTela({ x: ext.x + ext.w, y: ext.y + ext.h }, r)
    expect(a.x).toBeGreaterThanOrEqual(q.x)
    expect(b.x).toBeLessThanOrEqual(q.x + q.w)
  })
})

describe('A6 e A7 — o que os alvos NÃO fazem (T029 / FR-010, FR-014)', () => {
  it('A6: nenhum alvo lê ou escreve posição de elemento — por assinatura', () => {
    // as entradas são Caixa/Quadro/Enquadramento; a saída é Enquadramento. Não há
    // por onde uma posição de elemento entrar nem sair (SC-002 é verdadeiro aqui).
    const r = alvoAjustar({ x: 0, y: 0, w: 100, h: 100 }, quadro())
    expect(Object.keys(r).sort()).toEqual(['x', 'y', 'zoom'])
  })

  it('A7: nenhum alvo abre transação — o módulo não conhece `commit`', () => {
    // a fronteira é executável: `npm run lint:fronteira` proíbe
    // `src/areatrabalho/**` → `src/modelo/transacao` (T004). Aqui basta que as
    // funções sejam puras: mesma entrada, mesma saída, 0 efeitos.
    const ext: Caixa = { x: 1, y: 2, w: 3, h: 4 }
    const q = quadro()
    expect(alvoAjustar(ext, q)).toEqual(alvoAjustar(ext, q))
    expect(ext).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })
})
