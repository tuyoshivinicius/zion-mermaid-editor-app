import { describe, it, expect } from 'vitest'
import { razaoSaturada } from '../../src/areatrabalho/Divisao'
import { preservarCentro } from '../../src/areatrabalho/enquadramento'
import {
  MIN_DIAGRAMA,
  MIN_EDITOR,
  PROPORCAO_PADRAO,
  SOMA_DOS_MINIMOS,
} from '../../src/areatrabalho/faixa'
import { criarSessaoStore } from '../../src/modelo/store'
import { pontoDoPlano } from '../../src/areatrabalho/enquadramento'
import type { Enquadramento, Quadro } from '../../src/areatrabalho/tipos'

// A PROPORÇÃO (T020 / FR-006, FR-007 / contracts/proporcao.md).
//
// A proporção é uma RAZÃO da sessão, não uma largura e não um atributo do
// documento. Quase tudo é resolvido por CSS — `flex-basis` em porcentagem com
// `min-width`/`max-width`, sem uma linha de JavaScript no `resize`. O que sobra em
// código é: a saturação do arrasto (aqui) e `preservarCentro` (abaixo).
//
// Que o RECORTE seja da renderização, e não da gravação, é o que impede a janela de
// reescrever a escolha dela — e isso se assere contra o store, que é quem grava. O
// recorte propriamente dito é do CSS, e tem portão próprio em `us2-area-trabalho`.

const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 9)

describe('os números declarados da proporção (T020 / FR-006)', () => {
  it('480 (diagrama) + 320 (editor) = 800, e o padrão é 42% do editor', () => {
    expect(MIN_DIAGRAMA).toBe(480)
    expect(MIN_EDITOR).toBe(320)
    expect(SOMA_DOS_MINIMOS).toBe(800)
    expect(PROPORCAO_PADRAO).toBe(0.42)
  })
})

describe('razaoSaturada — o arrasto para nos mínimos declarados (T020 / FR-006, SC-007)', () => {
  const LARGURA = 1600

  it('no meio do curso, a razão é a posição do ponteiro', () => {
    // ponteiro em 1000 → o editor fica com 600 de 1600
    perto(razaoSaturada(1000, LARGURA), 600 / LARGURA)
  })

  it('levado ao extremo do editor, satura no MIN_DIAGRAMA — o diagrama não some', () => {
    const r = razaoSaturada(-500, LARGURA)
    perto(r * LARGURA, LARGURA - MIN_DIAGRAMA)
    perto((1 - r) * LARGURA, MIN_DIAGRAMA)
  })

  it('levado ao extremo do diagrama, satura no MIN_EDITOR — o editor não some', () => {
    const r = razaoSaturada(9999, LARGURA)
    perto(r * LARGURA, MIN_EDITOR)
  })

  it('0 casos em que qualquer uma das duas vistas fica sem área (SC-007)', () => {
    const EPS = 1e-9 // a razão é uma fração; a conversão de volta a px arredonda
    for (let x = -400; x <= LARGURA + 400; x += 37) {
      const r = razaoSaturada(x, LARGURA)
      expect(r * LARGURA).toBeGreaterThanOrEqual(MIN_EDITOR - EPS)
      expect((1 - r) * LARGURA).toBeGreaterThanOrEqual(MIN_DIAGRAMA - EPS)
    }
  })

  it('exatamente na soma dos mínimos, os dois mínimos cabem — sem rolagem prematura', () => {
    const r = razaoSaturada(MIN_DIAGRAMA, SOMA_DOS_MINIMOS)
    perto(r * SOMA_DOS_MINIMOS, MIN_EDITOR)
    perto((1 - r) * SOMA_DOS_MINIMOS, MIN_DIAGRAMA)
  })

  it('não há PRIORIDADE entre as duas: nenhuma cede primeiro', () => {
    // abaixo da soma dos mínimos a conta não elege ninguém — quem cede é a página
    const r = razaoSaturada(300, 600)
    expect(r * 600).toBeGreaterThanOrEqual(MIN_EDITOR)
  })
})

describe('a razão gravada é a QUE ELA ESCOLHEU, nunca a já recortada (T020 / FR-006)', () => {
  it('o store grava o valor cru — nenhum recorte na gravação', () => {
    const store = criarSessaoStore()
    store.getState().fixarRazao(0.83)
    expect(store.getState().areaDeTrabalho.razaoEditor).toBe(0.83)
    store.getState().fixarRazao(0.05)
    expect(store.getState().areaDeTrabalho.razaoEditor).toBe(0.05)
  })

  it('a razão original VOLTA A VALER quando a janela alarga (nada foi reescrito)', () => {
    const store = criarSessaoStore()
    store.getState().fixarRazao(0.6)
    // a janela encolhe e alarga N vezes: nada nesta spec escreve no `resize`
    const gravada = store.getState().areaDeTrabalho.razaoEditor
    expect(store.getState().areaDeTrabalho.razaoEditor).toBe(gravada)
    expect(gravada).toBe(0.6)
  })

  it('trocar o conteúdo não altera a proporção — ela é da SESSÃO, não do documento', () => {
    const store = criarSessaoStore()
    store.getState().fixarRazao(0.71)
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    store.getState().criarNo({ x: 10, y: 10 })
    expect(store.getState().areaDeTrabalho.razaoEditor).toBe(0.71)
  })
})

describe('preservarCentro sob mudança de tamanho do quadro (T020 / FR-007, SC-007)', () => {
  const quadro = (w: number, h = 600): Quadro => ({ x: 0, y: 0, w, h })

  it('0 mudanças de zoom e 0 deslocamento do ponto central, em toda a faixa útil', () => {
    const e: Enquadramento = { x: -530, y: -217, zoom: 1.37 }
    for (const largura of [1120, 960, 800, 640, 520, 480]) {
      const anterior = quadro(1120)
      const atual = quadro(largura)
      const alvo = pontoDoPlano(
        { x: anterior.x + anterior.w / 2, y: anterior.y + anterior.h / 2 },
        e,
      )
      const r = preservarCentro(e, anterior, atual)

      expect(r.zoom).toBe(e.zoom) // 0 mudanças de zoom
      const agora = pontoDoPlano({ x: atual.x + atual.w / 2, y: atual.y + atual.h / 2 }, r)
      perto(agora.x, alvo.x) // 0 deslocamento do ponto central
      perto(agora.y, alvo.y)
    }
  })

  it('vale igual para a divisão arrastada e para a janela — um caminho só', () => {
    const e: Enquadramento = { x: 0, y: 0, zoom: 2 }
    const porDivisao = preservarCentro(e, quadro(1000), quadro(700))
    const porJanela = preservarCentro(e, quadro(1000, 600), quadro(700, 600))
    expect(porDivisao).toEqual(porJanela)
  })

  it('não é reenquadramento: nenhum elemento entra na conta (0 rearranjos)', () => {
    // a assinatura não aceita projeção, arranjo nem id — não há por onde mover ninguém
    expect(preservarCentro).toHaveLength(3) // (e, anterior, atual)
  })
})
