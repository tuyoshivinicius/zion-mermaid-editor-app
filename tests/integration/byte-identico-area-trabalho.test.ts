import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { SEMENTE } from '../../src/modelo/store'
import type { Enquadramento, Piloto, Quadro } from '../../src/areatrabalho/tipos'

// BYTE-IDÊNTICO SOB RAJADA (T050 / FR-013 / SC-001 / Princípio V).
//
// Depois de QUALQUER sequência dos cinco gestos desta spec — arrastar a divisão,
// aproximar e afastar o zoom, arrastar a área visível, ajustar à tela, resetar o zoom
// — o código é byte-idêntico ao de antes: 0 diferenças.
//
// E isso é garantido por POSIÇÃO, não por limpeza: `serializar` projeta o `Modelo`, e
// o slot da área de trabalho é IRMÃO dele. Não há passo de limpeza na cópia, não há
// campo a filtrar, não há teste de "esqueci de remover" — o que não está no `Modelo`
// simplesmente não é emitido (research §2).

const QUADRO: Quadro = { x: 0, y: 0, w: 900, h: 700 }

function comPiloto(texto?: string) {
  const store = criarSessaoStore()
  if (texto) store.getState().aplicarTexto(texto)
  let corrente: Enquadramento = { x: 0, y: 0, zoom: 1 }
  const piloto: Piloto = {
    enquadramentoCorrente: () => corrente,
    aplicar: (e) => {
      corrente = e
      store.getState().fixarEnquadramento(e)
    },
    quadro: () => QUADRO,
  }
  store.getState().registrarPiloto(piloto)
  return store
}

const DOC = [
  'flowchart TD',
  'n1[Alfa]',
  'n2[Beta]',
  'n3[Gama]',
  'n1 -->|via| n2',
  'n2 --> n3',
  'subgraph g1[Grupo]',
  '  n1',
  '  n2',
  'end',
].join('\n')

/** Os cinco gestos da spec, na ordem que o índice pedir. */
function gesto(store: ReturnType<typeof criarSessaoStore>, k: number): void {
  const s = store.getState()
  const e = s.areaDeTrabalho.enquadramento
  switch (k % 5) {
    case 0: // arrastar a divisão
      return s.fixarRazao(0.28 + (k % 7) * 0.05)
    case 1: // aproximar / afastar o zoom
      return s.fixarEnquadramento({ ...e, zoom: k % 2 === 0 ? e.zoom * 1.2 : e.zoom / 1.2 })
    case 2: // arrastar a área visível
      return s.fixarEnquadramento({ ...e, x: e.x - k * 13, y: e.y + k * 7 })
    case 3: // ajustar à tela (pelo piloto — o mesmo caminho do produto)
      return s.trazerParaAreaVisivel('n3')
    default: // resetar o zoom
      return s.fixarEnquadramento({ ...e, zoom: 1 })
  }
}

describe('rajada dos cinco gestos → 0 diferenças no código (T050 / SC-001)', () => {
  it('120 gestos em sequências variadas deixam o código byte-idêntico', () => {
    const store = comPiloto(DOC)
    const antes = store.getState().textoEditor
    for (let k = 0; k < 120; k++) gesto(store, k)
    expect(store.getState().textoEditor).toBe(antes)
  })

  it('vale também sobre a sessão recém-aberta, sem conteúdo', () => {
    const store = comPiloto()
    expect(store.getState().textoEditor).toBe(SEMENTE)
    for (let k = 0; k < 60; k++) gesto(store, k)
    expect(store.getState().textoEditor).toBe(SEMENTE)
  })

  it('e a rajada INTERCALADA com edições de verdade não corrompe nada', () => {
    const store = comPiloto(DOC)
    for (let k = 0; k < 20; k++) gesto(store, k)
    store.getState().criarNo({ x: 700, y: 300 })
    const depoisDoAto = store.getState().textoEditor
    for (let k = 0; k < 20; k++) gesto(store, k + 3)
    expect(store.getState().textoEditor).toBe(depoisDoAto)
  })
})

describe('0 saídas do projetor carregam proporção, enquadramento ou zoom (T050 / SC-001)', () => {
  const VESTIGIOS = ['zoom', 'razao', 'razaoEditor', 'enquadramento', 'viewport', 'modoHand', 'piloto']

  it('nem por nome, nem pelos VALORES que os gestos gravaram', () => {
    const store = comPiloto(DOC)
    store.getState().fixarRazao(0.7654321)
    store.getState().fixarEnquadramento({ x: -13571, y: 24680, zoom: 3.987654 })
    store.getState().fixarModoHand('persistente')

    const texto = store.getState().textoEditor
    for (const v of VESTIGIOS) expect(texto, v).not.toContain(v)
    for (const v of ['13571', '24680', '3.987654', '0.7654321', 'persistente']) {
      expect(texto, v).not.toContain(v)
    }
  })

  it('garantido por POSIÇÃO: o slot não é alcançável a partir do `Modelo`', () => {
    const store = comPiloto(DOC)
    store.getState().fixarEnquadramento({ x: -999, y: -888, zoom: 2 })
    store.getState().fixarRazao(0.777)

    // o `Modelo` é o que o codec lê e escreve; o slot é IRMÃO dele, não campo dele.
    // Nenhum campo da área de trabalho existe aqui — não há o que o codec ignorar.
    const modelo = store.getState().modelo as unknown as Record<string, unknown>
    for (const campo of ['razaoEditor', 'enquadramento', 'modoHand', 'piloto', 'aberturaPendente', 'zoom']) {
      expect(Object.keys(modelo), campo).not.toContain(campo)
    }
    expect(JSON.stringify(modelo)).not.toContain('999')
    expect(JSON.stringify(modelo)).not.toContain('0.777')
  })

  it('copiar entrega o mesmo texto depois da rajada (o produto final é o código)', async () => {
    const store = comPiloto(DOC)
    let copiado = ''
    Object.assign(navigator, {
      clipboard: { writeText: async (t: string) => void (copiado = t) },
    })

    await store.getState().copiar()
    const antes = copiado
    for (let k = 0; k < 40; k++) gesto(store, k)
    await store.getState().copiar()

    expect(copiado).toBe(antes)
  })
})
