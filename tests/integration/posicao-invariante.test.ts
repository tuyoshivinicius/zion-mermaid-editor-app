import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { selecaoVazia, type Selecao } from '../../src/modelo/selecao'

const sel = (over: Partial<Selecao>): Selecao => ({ ...selecaoVazia(), ...over })

// Invariância de posição por operação (T050 / Princípio VII, FR-010): nenhuma edição
// rearranja — a posição de TODOS os elementos preexistentes é idêntica antes/depois; o
// elemento novo nasce por colocação local determinística, sem deslocar ninguém.

function snapshot(store: ReturnType<typeof criarSessaoStore>, ids: string[]): Record<string, { x: number; y: number }> {
  const arr = store.getState().arranjo
  const out: Record<string, { x: number; y: number }> = {}
  for (const id of ids) out[id] = { ...arr.porId.get(id)! }
  return out
}
function conferir(store: ReturnType<typeof criarSessaoStore>, antes: Record<string, { x: number; y: number }>) {
  const arr = store.getState().arranjo
  for (const [id, p] of Object.entries(antes)) expect(arr.porId.get(id), id).toEqual(p)
}

function tresNos() {
  const store = criarSessaoStore()
  store.getState().criarNo({ x: 100, y: 100 }) // n1
  store.getState().criarNo({ x: 400, y: 100 }) // n2
  store.getState().criarNo({ x: 700, y: 100 }) // n3
  return store
}

describe('nenhuma operação desloca os preexistentes (T050 / Princípio VII)', () => {
  it('conectar', () => {
    const store = tresNos()
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().conectar('n1', 'n2')
    conferir(store, antes)
  })

  it('agrupar', () => {
    const store = tresNos()
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().agrupar(['n1', 'n2'])
    conferir(store, antes)
  })

  it('duplicar (as cópias nascem deslocadas; os originais não se movem)', () => {
    const store = tresNos()
    store.getState().conectar('n1', 'n2')
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().duplicarSelecao(sel({ nos: new Set(['n1', 'n2']) }))
    conferir(store, antes)
  })

  it('excluir (os sobreviventes não se movem)', () => {
    const store = tresNos()
    const antes = snapshot(store, ['n1', 'n3'])
    store.getState().excluirSelecao(sel({ nos: new Set(['n2']) }))
    conferir(store, antes)
  })

  it('adicionar / retirar membro', () => {
    const store = tresNos()
    store.getState().agrupar(['n1', 'n2']) // sub1
    const antes = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().adicionarMembros(['n3'], 'sub1')
    conferir(store, antes)
    const antes2 = snapshot(store, ['n1', 'n2', 'n3'])
    store.getState().retirarMembros(['n3'])
    conferir(store, antes2)
  })
})

// ── T052 (R2): CADA GESTO NOVO do repertório entra no mesmo portão ────────────
// O Princípio VII exige que uma operação nova entre no repertório com o SEU caso no
// mesmo PR. A spec 003 acrescenta sete gestos, e nenhum deles move elemento algum —
// o `Arranjo` é entrada dessas contas, nunca saída (`SC-002`, `FR-010`).
//
// A asserção é sobre o ARRANJO INTEIRO, antes e depois; e como nenhum gesto chega
// perto do modelo, nenhum dispara rearranjo.

describe('nenhum gesto da área de trabalho desloca elemento (T052 / SC-002, Princípio VII)', () => {
  const QUADRO = { x: 0, y: 0, w: 900, h: 700 }

  function comPiloto() {
    const store = tresNos()
    store.getState().conectar('n1', 'n2')
    store.getState().agrupar(['n1', 'n2'])
    let corrente = { x: 0, y: 0, zoom: 1 }
    store.getState().registrarPiloto({
      enquadramentoCorrente: () => corrente,
      aplicar: (e: typeof corrente) => {
        corrente = e
        store.getState().fixarEnquadramento(e)
      },
      quadro: () => QUADRO,
    })
    return store
  }

  // a moldura com membros DERIVA a posição deles — não tem entrada própria no
  // arranjo (só o bloco vazio tem). O que se assere é a posição dos nós.
  const TODOS = ['n1', 'n2', 'n3']

  const GESTOS: [string, (s: ReturnType<typeof comPiloto>) => void][] = [
    ['arrastar a divisão', (s) => s.getState().fixarRazao(0.71)],
    ['zoom por roda', (s) => s.getState().fixarEnquadramento({ x: 0, y: 0, zoom: 2.4 })],
    ['zoom por tecla', (s) => s.getState().fixarEnquadramento({ x: -40, y: -30, zoom: 1.2 })],
    ['zoom por controle', (s) => s.getState().fixarEnquadramento({ x: 12, y: 8, zoom: 0.5 })],
    ['arrasto do enquadramento', (s) => s.getState().fixarEnquadramento({ x: -900, y: 640, zoom: 1 })],
    ['ajustar à tela', (s) => s.getState().fixarEnquadramento({ x: -120, y: -60, zoom: 0.83 })],
    ['resetar o zoom', (s) => s.getState().fixarEnquadramento({ x: -120, y: -60, zoom: 1 })],
    ['trazer para a área visível', (s) => s.getState().trazerParaAreaVisivel('n3')],
    ['entrar/sair do modo hand', (s) => {
      s.getState().fixarModoHand('persistente')
      s.getState().fixarModoHand('off')
    }],
    ['redimensionar a janela', (s) => s.getState().fixarEnquadramento({ x: 5, y: 5, zoom: 1 })],
  ]

  it.each(GESTOS)('%s: 0 elementos movidos e 0 rearranjos', (_nome, agir) => {
    const store = comPiloto()
    const antes = snapshot(store, TODOS)
    const modelo = store.getState().modelo
    const codigo = store.getState().textoEditor

    agir(store)

    conferir(store, antes) // a posição de TODOS é idêntica
    expect(store.getState().modelo).toBe(modelo) // 0 rearranjos: nem objeto novo
    expect(store.getState().textoEditor).toBe(codigo)
  })

  it('a sequência INTEIRA, um gesto atrás do outro, também não move ninguém', () => {
    const store = comPiloto()
    const antes = snapshot(store, TODOS)
    for (let volta = 0; volta < 3; volta++) for (const [, agir] of GESTOS) agir(store)
    conferir(store, antes)
  })
})
