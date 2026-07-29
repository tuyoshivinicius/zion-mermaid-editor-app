import { describe, it, expect } from 'vitest'
import {
  quadroVisivel,
  quadroNoPlano,
  registrarOclusao,
  oclusoesRegistradas,
  estaNaAreaVisivel,
} from '../../src/areatrabalho/areaVisivel'
import { FOLGA_BORDA } from '../../src/areatrabalho/faixa'
import type { Caixa, Enquadramento, Oclusao, Quadro, Retangulo } from '../../src/areatrabalho/tipos'

// O QUADRO (T005 / FR-011 / contracts/area-visivel.md): a área visível é o que a
// pessoa VÊ do plano, não o que a proporção reservou —
//   quadro = retângulo da área do diagrama ∩ janela − faixas de sobreposição.
// O resultado é em coordenadas de tela RELATIVAS à área do diagrama, que é o
// referencial do enquadramento (`p * zoom + (x, y)`).

const area = (over: Partial<Retangulo> = {}): Retangulo => ({ x: 0, y: 0, w: 800, h: 600, ...over })
const janela = (over: Partial<Retangulo> = {}): Retangulo => ({ x: 0, y: 0, w: 1440, h: 900, ...over })

describe('quadroVisivel — sem rolagem e sem sobreposição (T005 / FR-011)', () => {
  it('quadro ≡ retângulo da área do diagrama (as duas coisas coincidem, como a spec diz)', () => {
    expect(quadroVisivel(area(), janela(), [])).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  })

  it('a área deslocada na janela ainda dá um quadro ancorado na PRÓPRIA origem', () => {
    expect(quadroVisivel(area({ x: 500, y: 40 }), janela(), [])).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  })
})

describe('quadroVisivel — recuo por sobreposição persistente (T005 / FR-011)', () => {
  it('recua pela espessura declarada em cada borda', () => {
    const o: Oclusao[] = [
      { id: 'barra-enquadramento', borda: 'baixo', espessura: 44 },
      { id: 'barra-gestos', borda: 'topo', espessura: 36 },
    ]
    expect(quadroVisivel(area(), janela(), o)).toEqual({ x: 0, y: 36, w: 800, h: 520 })
  })

  it('duas na MESMA borda: recua pela MAIOR, nunca pela soma', () => {
    const o: Oclusao[] = [
      { id: 'a', borda: 'baixo', espessura: 44 },
      { id: 'b', borda: 'baixo', espessura: 60 },
    ]
    expect(quadroVisivel(area(), janela(), o)).toEqual({ x: 0, y: 0, w: 800, h: 540 })
  })

  it('recua nas quatro bordas e o quadro permanece RETANGULAR', () => {
    const o: Oclusao[] = [
      { id: 'a', borda: 'topo', espessura: 10 },
      { id: 'b', borda: 'baixo', espessura: 20 },
      { id: 'c', borda: 'esquerda', espessura: 30 },
      { id: 'd', borda: 'direita', espessura: 40 },
    ]
    const q = quadroVisivel(area(), janela(), o)
    expect(q).toEqual({ x: 30, y: 10, w: 730, h: 570 })
    // "retangular" é propriedade de tipo: 4 números, nunca um polígono.
    expect(Object.keys(q).sort()).toEqual(['h', 'w', 'x', 'y'])
  })

  it('sobreposição maior que a área não produz quadro negativo — satura em 0', () => {
    const o: Oclusao[] = [{ id: 'gigante', borda: 'baixo', espessura: 5000 }]
    expect(quadroVisivel(area(), janela(), o)).toEqual({ x: 0, y: 0, w: 800, h: 0 })
  })
})

describe('quadroVisivel — a página rolada encolhe a área visível (T005 / FR-011, SC-008)', () => {
  it('janela abaixo da soma dos mínimos: só o pedaço que a tela mostra conta', () => {
    // a área do diagrama tem 480px, mas a janela só mostra 300px dela
    const q = quadroVisivel(area({ w: 480 }), janela({ w: 300 }), [])
    expect(q).toEqual({ x: 0, y: 0, w: 300, h: 600 })
  })

  it('página rolada para a direita: a área começa fora da tela pela esquerda', () => {
    const q = quadroVisivel(area({ x: -100, w: 480 }), janela({ w: 300 }), [])
    expect(q).toEqual({ x: 100, y: 0, w: 300, h: 600 })
  })

  it('área inteiramente fora da tela → quadro de tamanho zero, não negativo', () => {
    const q = quadroVisivel(area({ x: 2000, w: 480 }), janela({ w: 300 }), [])
    expect(q.w).toBe(0)
    expect(q.h).toBeGreaterThanOrEqual(0)
  })

  it('a rolagem e a sobreposição compõem: primeiro recorta a tela, depois desconta', () => {
    const o: Oclusao[] = [{ id: 'barra', borda: 'baixo', espessura: 44 }]
    const q = quadroVisivel(area({ w: 480 }), janela({ w: 300 }), o)
    expect(q).toEqual({ x: 0, y: 0, w: 300, h: 556 })
  })
})

describe('quadroNoPlano — o mesmo quadro em coordenadas do plano (T005 / FR-011)', () => {
  it('converte pelo enquadramento corrente (identidade quando x=y=0 e zoom=1)', () => {
    const q = { x: 0, y: 0, w: 800, h: 600 }
    expect(quadroNoPlano(q, { x: 0, y: 0, zoom: 1 })).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  })

  it('desconta a translação e divide pela escala', () => {
    const q = { x: 0, y: 0, w: 800, h: 600 }
    expect(quadroNoPlano(q, { x: -200, y: -100, zoom: 2 })).toEqual({ x: 100, y: 50, w: 400, h: 300 })
  })

  it('o quadro recuado por oclusão converte a partir da posição recuada', () => {
    const q = { x: 30, y: 10, w: 730, h: 570 }
    expect(quadroNoPlano(q, { x: 0, y: 0, zoom: 0.5 })).toEqual({ x: 60, y: 20, w: 1460, h: 1140 })
  })
})

describe('registrarOclusao — registro, nunca presunção (T005 / FR-011)', () => {
  it('o controle declara ao montar e RECEBE o cancelamento; desmontar limpa', () => {
    const cancelar = registrarOclusao({ id: 'barra-teste', borda: 'baixo', espessura: 44 })
    expect(oclusoesRegistradas().find((o) => o.id === 'barra-teste')).toEqual({
      id: 'barra-teste',
      borda: 'baixo',
      espessura: 44,
    })
    cancelar()
    expect(oclusoesRegistradas().find((o) => o.id === 'barra-teste')).toBeUndefined()
  })

  it('registrar duas vezes o mesmo id substitui — 0 duplicatas no recuo', () => {
    const c1 = registrarOclusao({ id: 'barra-unica', borda: 'baixo', espessura: 20 })
    const c2 = registrarOclusao({ id: 'barra-unica', borda: 'baixo', espessura: 44 })
    expect(oclusoesRegistradas().filter((o) => o.id === 'barra-unica')).toHaveLength(1)
    expect(oclusoesRegistradas().find((o) => o.id === 'barra-unica')?.espessura).toBe(44)
    c1()
    c2()
    expect(oclusoesRegistradas().find((o) => o.id === 'barra-unica')).toBeUndefined()
  })
})

// ── T041 (Fase 6): `estaNaAreaVisivel` — a superfície que o `R-05` consome ────
// O ADR-005 diz que quem cria um elemento por teclado tem o DEVER de trazê-lo para a
// área visível; até aqui "área visível" era palavra sem dono. Verdadeiro quando a
// EXTENSÃO DESENHADA do elemento está INTEIRA dentro do quadro RECUADO de
// `FOLGA_BORDA` — a mesma folga e a mesma geometria que o `FR-008` lê.
//
// A tabela do contrato tem 6 casos, e o que o teste protege é o "0 falsos positivos":
// dar por visível o que a pessoa não vê é o defeito que derruba o dever do `R-05`.

describe('estaNaAreaVisivel — os 6 casos do contrato (T041 / FR-011, SC-008)', () => {
  const q: Quadro = { x: 0, y: 0, w: 800, h: 600 }
  const identidade: Enquadramento = { x: 0, y: 0, zoom: 1 }
  /** Uma caixa do PLANO, dado o enquadramento identidade. */
  const naTela = (x: number, y: number, w: number, h: number): Caixa => ({ x, y, w, h })

  it('elemento INTEIRO, com folga → true', () => {
    expect(estaNaAreaVisivel(naTela(100, 100, 170, 52), q, identidade)).toBe(true)
  })

  it('elemento ENCOSTADO na borda → false (encostar não conta)', () => {
    // exatamente na folga: passa; um pixel além dela: não
    expect(estaNaAreaVisivel(naTela(FOLGA_BORDA, FOLGA_BORDA, 100, 100), q, identidade)).toBe(true)
    expect(estaNaAreaVisivel(naTela(FOLGA_BORDA - 1, FOLGA_BORDA, 100, 100), q, identidade)).toBe(false)
    expect(estaNaAreaVisivel(naTela(0, 100, 100, 100), q, identidade)).toBe(false)
    expect(estaNaAreaVisivel(naTela(q.w - 100, 100, 100, 100), q, identidade)).toBe(false)
  })

  it('elemento PELA METADE → false', () => {
    expect(estaNaAreaVisivel(naTela(-50, 100, 170, 52), q, identidade)).toBe(false)
    expect(estaNaAreaVisivel(naTela(q.w - 85, 100, 170, 52), q, identidade)).toBe(false)
    expect(estaNaAreaVisivel(naTela(100, q.h - 26, 170, 52), q, identidade)).toBe(false)
  })

  it('nó dentro, mas o ARCO / o RÓTULO / a MOLDURA fora → false', () => {
    // a caixa do nó caberia com folga…
    const caixaDoNo = naTela(60, 60, 170, 52)
    expect(estaNaAreaVisivel(caixaDoNo, q, identidade)).toBe(true)
    // …mas a EXTENSÃO DESENHADA, que é o que se mede, arqueia para fora
    const comArco = naTela(60, -40, 170, 152)
    expect(estaNaAreaVisivel(comArco, q, identidade)).toBe(false)
    const comRotulo = naTela(60, 60, 900, 52)
    expect(estaNaAreaVisivel(comRotulo, q, identidade)).toBe(false)
    const comMoldura = naTela(10, 10, 300, 200)
    expect(estaNaAreaVisivel(comMoldura, q, identidade)).toBe(false)
  })

  it('sob CONTROLE PERSISTENTE → false (o que o produto tapa não conta)', () => {
    const comBarra = quadroVisivel(
      { x: 0, y: 0, w: 800, h: 600 },
      { x: 0, y: 0, w: 1440, h: 900 },
      [{ id: 'barra', borda: 'baixo', espessura: 44 }],
    )
    // y ∈ [500, 552]: dentro da folga do quadro cheio (até 576), fora dela quando a
    // barra de 44px é descontada (até 532)
    const debaixoDaBarra = naTela(300, 500, 170, 52)
    // sem a barra declarada estaria visível…
    expect(estaNaAreaVisivel(debaixoDaBarra, q, identidade)).toBe(true)
    // …com ela declarada, não: a área visível é o que a pessoa VÊ
    expect(estaNaAreaVisivel(debaixoDaBarra, comBarra, identidade)).toBe(false)
  })

  it('na parte que a PÁGINA ROLADA não mostra → false', () => {
    const rolada = quadroVisivel({ x: 0, y: 0, w: 800, h: 600 }, { x: 0, y: 0, w: 400, h: 900 }, [])
    const foraDaTela = naTela(600, 200, 170, 52)
    expect(estaNaAreaVisivel(foraDaTela, q, identidade)).toBe(true)
    expect(estaNaAreaVisivel(foraDaTela, rolada, identidade)).toBe(false)
  })

  it('0 FALSOS POSITIVOS: nada dado por visível cai fora do quadro recuado', () => {
    const recuado = {
      x: q.x + FOLGA_BORDA,
      y: q.y + FOLGA_BORDA,
      w: q.w - 2 * FOLGA_BORDA,
      h: q.h - 2 * FOLGA_BORDA,
    }
    for (let x = -200; x < 1000; x += 37) {
      for (let y = -200; y < 800; y += 53) {
        const c = naTela(x, y, 170, 52)
        if (!estaNaAreaVisivel(c, q, identidade)) continue
        expect(c.x).toBeGreaterThanOrEqual(recuado.x)
        expect(c.y).toBeGreaterThanOrEqual(recuado.y)
        expect(c.x + c.w).toBeLessThanOrEqual(recuado.x + recuado.w)
        expect(c.y + c.h).toBeLessThanOrEqual(recuado.y + recuado.h)
      }
    }
  })

  it('a resposta é sobre o AGORA: o mesmo elemento entra e sai com o enquadramento', () => {
    const c = naTela(1000, 1000, 170, 52)
    expect(estaNaAreaVisivel(c, q, identidade)).toBe(false)
    expect(estaNaAreaVisivel(c, q, { x: -900, y: -900, zoom: 1 })).toBe(true)
  })

  it('lê a MESMA folga que o `FR-008` — não há segunda régua', () => {
    // a caixa que ajustar à tela deixaria exatamente na folga é a que passa aqui
    const c = naTela(FOLGA_BORDA, FOLGA_BORDA, q.w - 2 * FOLGA_BORDA, q.h - 2 * FOLGA_BORDA)
    expect(estaNaAreaVisivel(c, q, identidade)).toBe(true)
  })
})
