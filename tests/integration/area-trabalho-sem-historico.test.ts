import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'

// A FRONTEIRA TRANSACIONAL DO SLOT (T007 / FR-014 / SC-009 / Princípio IV).
//
// Nenhum gesto da área de trabalho abre transação — e a prova não é filtragem: o
// histórico não RECEBE nada para filtrar. As ações do slot escrevem por `set()`
// direto, fora de `commit()`, irmãs de `revelar` (research §3).
//
// O gesto visível de desfazer é de `desfazer-e-refazer`; o que se assere aqui é a
// unidade que ele vai consumir: depois da rajada, o TOPO do histórico continua
// sendo o último ato DO MODELO — desfazer um só reverte aquilo, não um zoom.

function comDoisAtos() {
  const store = criarSessaoStore()
  store.getState().criarNo({ x: 100, y: 100 }) // n1 — ato do modelo 1
  store.getState().criarNo({ x: 400, y: 100 }) // n2 — ato do modelo 2
  return store
}

const instantaneo = (store: ReturnType<typeof criarSessaoStore>) => {
  const s = store.getState()
  return {
    textoEditor: s.textoEditor,
    modelo: s.modelo,
    arranjo: new Map(s.arranjo.porId),
    entradas: s.historico.entradas.length,
    topo: s.historico.entradas[s.historico.entradas.length - 1],
  }
}

describe('rajada da área de trabalho → 0 entradas de histórico (T007 / SC-009)', () => {
  it('40 escritas de enquadramento/razão/modo hand não alimentam o histórico', () => {
    const store = comDoisAtos()
    const antes = instantaneo(store)

    for (let k = 0; k < 40; k++) {
      const s = store.getState()
      s.fixarEnquadramento({ x: -k * 13, y: k * 7, zoom: 1 + k * 0.05 })
      s.fixarRazao(0.3 + (k % 10) * 0.02)
      s.fixarModoHand(k % 2 === 0 ? 'persistente' : 'off')
    }

    const depois = instantaneo(store)
    expect(depois.entradas - antes.entradas).toBe(0)
  })

  it('a rajada deixa modelo, arranjo e código byte-idênticos', () => {
    const store = comDoisAtos()
    const antes = instantaneo(store)

    for (let k = 0; k < 40; k++) {
      const s = store.getState()
      s.fixarEnquadramento({ x: k, y: -k, zoom: 0.5 })
      s.fixarRazao(0.61)
      s.fixarModoHand('temporario')
    }

    const depois = instantaneo(store)
    expect(depois.textoEditor).toBe(antes.textoEditor) // 0 diferenças (SC-001)
    expect(depois.modelo).toBe(antes.modelo) // nem sequer um objeto novo
    expect([...depois.arranjo.entries()]).toEqual([...antes.arranjo.entries()])
  })

  it('depois da rajada, o TOPO do histórico é o último ato DO MODELO (1 desfazer)', () => {
    const store = comDoisAtos()
    const topoAntes = instantaneo(store).topo

    for (let k = 0; k < 40; k++) store.getState().fixarEnquadramento({ x: k, y: k, zoom: 2 })

    const topoDepois = instantaneo(store).topo
    expect(topoDepois).toBe(topoAntes)
    // e o estado que esse desfazer restauraria é o de antes do 2º nó — não um enquadramento
    expect(topoDepois.textoEditor).toContain('n2')
    expect(JSON.stringify(topoDepois)).not.toContain('zoom')
  })

  it('o slot muda de fato — a ausência de histórico não é ausência de efeito', () => {
    const store = comDoisAtos()
    store.getState().fixarEnquadramento({ x: -50, y: -25, zoom: 3 })
    store.getState().fixarRazao(0.7)
    store.getState().fixarModoHand('persistente')

    const a = store.getState().areaDeTrabalho
    expect(a.enquadramento).toEqual({ x: -50, y: -25, zoom: 3 })
    expect(a.razaoEditor).toBe(0.7)
    expect(a.modoHand).toBe('persistente')
  })
})

describe('o slot é irmão do modelo, nunca parte dele (T007 / FR-013, Princípio V)', () => {
  it('nada do slot aparece no código: serializar projeta o MODELO', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 10, y: 10 })
    store.getState().fixarEnquadramento({ x: -1234, y: -5678, zoom: 3.14 })
    store.getState().fixarRazao(0.777)

    const texto = store.getState().textoEditor
    for (const vestigio of ['1234', '5678', '3.14', '0.777', 'zoom', 'razao', 'enquadramento']) {
      expect(texto).not.toContain(vestigio)
    }
  })
})
