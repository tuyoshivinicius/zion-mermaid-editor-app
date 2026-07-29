import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { projetar } from '../../src/projecao/projetar'
import { extensaoDoElemento } from '../../src/areatrabalho/extensao'
import { estaNaAreaVisivel } from '../../src/areatrabalho/areaVisivel'
import { alvoTrazer } from '../../src/areatrabalho/enquadramento'
import { cantoDeLeitura } from '../../src/areatrabalho/orientacao'
import { FOLGA_BORDA } from '../../src/areatrabalho/faixa'
import type { Enquadramento, Orientacao, Piloto, Quadro } from '../../src/areatrabalho/tipos'

// `trazerParaAreaVisivel` (T043 / FR-012 / SC-008 / contracts/area-visivel.md).
//
// É a capacidade que o `R-05` cobra e que `ciclo-por-teclado` (RF-11) vai consumir
// SEM saber que existe React Flow: o `Canvas` registra um piloto no store ao montar,
// e é ele que aplica. QUANDO chamar continua sendo de lá.
//
// A operação move o ENQUADRAMENTO E SÓ ELE.

const QUADRO: Quadro = { x: 0, y: 0, w: 800, h: 600 }

function comPiloto(texto: string, inicial: Enquadramento = { x: 0, y: 0, zoom: 1 }, quadro = QUADRO) {
  const store = criarSessaoStore()
  store.getState().aplicarTexto(texto)

  let corrente = inicial
  const aplicados: Enquadramento[] = []
  const piloto: Piloto = {
    enquadramentoCorrente: () => corrente,
    aplicar: (e) => {
      corrente = e
      aplicados.push(e)
    },
    quadro: () => quadro,
  }
  store.getState().registrarPiloto(piloto)
  return { store, aplicados, corrente: () => corrente, quadro }
}

const DOC = ['flowchart TD', 'n1[Alfa]', 'n2[Beta]', 'n3[Gama]', 'n1 --> n2', 'n2 --> n3'].join('\n')

const visivel = (store: ReturnType<typeof criarSessaoStore>, id: string, e: Enquadramento, q: Quadro) => {
  const s = store.getState()
  const ext = extensaoDoElemento(projetar(s.modelo, s.arranjo), id)!
  return estaNaAreaVisivel(ext, q, e)
}

describe('trazerParaAreaVisivel — 1 mudança, e só o enquadramento (T043 / FR-012)', () => {
  it('1 mudança de enquadramento, 0 mudanças de zoom, 0 elementos movidos, 0 no código', () => {
    const { store, aplicados, corrente } = comPiloto(DOC, { x: -3000, y: -2000, zoom: 0.8 })
    const antes = store.getState()
    const codigo = antes.textoEditor
    const arranjo = new Map(antes.arranjo.porId)
    const entradas = antes.historico.entradas.length

    store.getState().trazerParaAreaVisivel('n3')

    expect(aplicados).toHaveLength(1) // 1 mudança de enquadramento
    expect(corrente().zoom).toBe(0.8) // 0 mudanças de zoom
    expect(store.getState().textoEditor).toBe(codigo) // 0 diferenças no código
    expect([...store.getState().arranjo.porId.entries()]).toEqual([...arranjo.entries()]) // 0 movidos
    expect(store.getState().historico.entradas.length).toBe(entradas) // 0 entradas
  })

  it('e o elemento REALMENTE fica visível depois — a mesma régua do FR-008', () => {
    const { store, corrente, quadro } = comPiloto(DOC, { x: -3000, y: -2000, zoom: 0.8 })
    expect(visivel(store, 'n3', corrente(), quadro)).toBe(false)
    store.getState().trazerParaAreaVisivel('n3')
    expect(visivel(store, 'n3', corrente(), quadro)).toBe(true)
  })

  it('deslocamento NULO quando o elemento JÁ está visível', () => {
    const { store, aplicados, corrente, quadro } = comPiloto(DOC, { x: 0, y: 0, zoom: 1 })
    expect(visivel(store, 'n1', corrente(), quadro)).toBe(true)
    store.getState().trazerParaAreaVisivel('n1')
    expect(aplicados).toHaveLength(0) // 0 aplicações: não havia o que deslocar
  })

  it('funciona para NÓ, CONEXÃO e AGRUPAMENTO — uma regra só', () => {
    const doc = 'flowchart TD\nn1[A]\nn2[B]\nn1 --> n2\nsubgraph g1[G]\n  n1\n  n2\nend'
    for (const alvo of ['n2', 'g1']) {
      const { store, corrente, quadro } = comPiloto(doc, { x: -2400, y: -1800, zoom: 0.9 })
      store.getState().trazerParaAreaVisivel(alvo)
      expect(visivel(store, alvo, corrente(), quadro), alvo).toBe(true)
    }
    // e para a conexão, cuja identidade é de sessão
    const { store, corrente, quadro } = comPiloto(doc, { x: -2400, y: -1800, zoom: 0.9 })
    const idAresta = store.getState().modelo.conexoes[0].id
    store.getState().trazerParaAreaVisivel(idAresta)
    expect(visivel(store, idAresta, corrente(), quadro)).toBe(true)
  })

  it('id INEXISTENTE é silencioso — 0 efeitos, e nenhum erro', () => {
    const { store, aplicados } = comPiloto(DOC)
    expect(() => store.getState().trazerParaAreaVisivel('nao-existe')).not.toThrow()
    expect(aplicados).toHaveLength(0)
  })

  it('sem piloto registrado (Canvas ainda não montou) também é silencioso', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto(DOC)
    expect(() => store.getState().trazerParaAreaVisivel('n1')).not.toThrow()
    expect(store.getState().estaNaAreaVisivel('n1')).toBe(false)
  })
})

describe('elemento MAIOR que o quadro: ancorado no canto de partida (T043 / FR-012)', () => {
  // Um quadro pequeno e um agrupamento grande: o elemento não cabe no zoom corrente
  // em NENHUM dos dois eixos — é assim que os 4 cantos ficam todos exercitados. O
  // canto governa o eixo em que o elemento NÃO cabe; onde ele cabe, vale o
  // deslocamento mínimo, que é o que a spec pede para o caso comum.
  const PEQUENO: Quadro = { x: 0, y: 0, w: 300, h: 120 }
  const GRANDE = 'flowchart TD\nn1[A]\nn2[B]\nn3[C]\nsubgraph g1[G]\n  n1\n  n2\n  n3\nend'

  const CANTOS: [Orientacao, 'esquerda' | 'direita', 'topo' | 'base'][] = [
    ['TB', 'esquerda', 'topo'],
    ['TD', 'esquerda', 'topo'],
    ['BT', 'esquerda', 'base'],
    ['LR', 'esquerda', 'topo'],
    ['RL', 'direita', 'topo'],
  ]

  it.each(CANTOS)(
    'orientação %s: 0 operações terminam sem mostrá-lo, e o COMEÇO dele fica no quadro',
    (orientacao, horizontal, vertical) => {
      const { store, corrente, quadro } = comPiloto(GRANDE, { x: -900, y: -700, zoom: 1 }, PEQUENO)
      const s = store.getState()
      const ext = extensaoDoElemento(projetar(s.modelo, s.arranjo), 'g1')!
      expect(ext.w).toBeGreaterThan(quadro.w) // não cabe em nenhum dos dois eixos
      expect(ext.h).toBeGreaterThan(quadro.h)

      // a regra é a mesma do produto; aqui só se troca a orientação corrente
      const canto = cantoDeLeitura(orientacao)
      const alvo = alvoTrazer(ext, corrente(), quadro, canto)

      const recuado = {
        x: quadro.x + FOLGA_BORDA,
        y: quadro.y + FOLGA_BORDA,
        x2: quadro.x + quadro.w - FOLGA_BORDA,
        y2: quadro.y + quadro.h - FOLGA_BORDA,
      }
      const naTela = {
        x: ext.x * alvo.zoom + alvo.x,
        y: ext.y * alvo.zoom + alvo.y,
        x2: (ext.x + ext.w) * alvo.zoom + alvo.x,
        y2: (ext.y + ext.h) * alvo.zoom + alvo.y,
      }

      // 0 operações terminam sem mostrá-lo: alguma parte está no quadro
      expect(naTela.x).toBeLessThan(recuado.x2)
      expect(naTela.x2).toBeGreaterThan(recuado.x)

      // e o COMEÇO dele — o canto de partida da leitura — está DENTRO
      if (horizontal === 'esquerda') expect(naTela.x).toBeCloseTo(recuado.x, 6)
      else expect(naTela.x2).toBeCloseTo(recuado.x2, 6)
      if (vertical === 'topo') expect(naTela.y).toBeCloseTo(recuado.y, 6)
      else expect(naTela.y2).toBeCloseTo(recuado.y2, 6)

      expect(alvo.zoom).toBe(corrente().zoom) // 0 mudanças de zoom, mesmo sem caber
    },
  )
})

describe('estaNaAreaVisivel pelo store (T043 / FR-011, SC-008)', () => {
  it('responde sobre a extensão desenhada, contra o quadro do piloto', () => {
    const { store, corrente, quadro } = comPiloto(DOC, { x: 0, y: 0, zoom: 1 })
    expect(store.getState().estaNaAreaVisivel('n1')).toBe(visivel(store, 'n1', corrente(), quadro))
    expect(store.getState().estaNaAreaVisivel('n1')).toBe(true)
  })

  it('id inexistente → false, sem erro', () => {
    const { store } = comPiloto(DOC)
    expect(store.getState().estaNaAreaVisivel('nao-existe')).toBe(false)
  })

  it('depois de trazer, a resposta vira true — as duas leem a MESMA régua', () => {
    const { store } = comPiloto(DOC, { x: -3000, y: -2000, zoom: 0.8 })
    expect(store.getState().estaNaAreaVisivel('n3')).toBe(false)
    store.getState().trazerParaAreaVisivel('n3')
    expect(store.getState().estaNaAreaVisivel('n3')).toBe(true)
  })
})
