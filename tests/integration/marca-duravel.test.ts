import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'

// Marca durável (T027 / SC-002, FR-006): editar OUTRA linha e reler preserva o texto
// integral + a marca enquanto a forma degradada não muda; só editar AQUELE texto cede.

describe('marca durável na releitura (T027)', () => {
  it('caso lossy (backtick markdown): o modelo preserva o integral enquanto a linha não é tocada', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 100, y: 100 }) // n1
    store.getState().criarNo({ x: 400, y: 100 }) // n2
    // cola um texto literal com crases — o código lê como string markdown (lossy)
    store.getState().editarTexto('n1', '`code`')
    const antes = store.getState().modelo.nos.find((n) => n.id === 'n1')!
    expect(antes.rotulo).toBe('`code`') // o integral fica no modelo
    expect(antes.alertas.length).toBeGreaterThan(0) // marcado (o tipo não expressa fielmente)

    // edita OUTRA linha (o rótulo de n2) pelo código
    const texto = store.getState().textoEditor
    store.getState().aplicarTexto(texto.replace('n2[Nó 2]', 'n2[Beta]'))

    const depois = store.getState().modelo.nos.find((n) => n.id === 'n1')!
    expect(depois.rotulo).toBe('`code`') // 0 perdas por releitura
    expect(depois.alertas.length).toBeGreaterThan(0) // marca preservada
    expect(store.getState().modelo.nos.find((n) => n.id === 'n2')!.rotulo).toBe('Beta')
  })

  it('editar AQUELE texto no código faz o modelo adotar o que a pessoa escreveu', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 100, y: 100 })
    store.getState().editarTexto('n1', '`code`')
    // a pessoa edita a própria linha de n1, trocando por um rótulo simples
    const texto = store.getState().textoEditor.replace('n1["`code`"]', 'n1[Alfa]')
    store.getState().aplicarTexto(texto)
    const n1 = store.getState().modelo.nos.find((n) => n.id === 'n1')!
    expect(n1.rotulo).toBe('Alfa') // cedeu ao texto tocado
    expect(n1.alertas).toEqual([]) // marca recalculada (some)
  })

  it('caso lossless (byte-a-byte): a releitura reproduz o texto e a marca por construção', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 100, y: 100 })
    store.getState().criarNo({ x: 400, y: 100 })
    store.getState().editarTexto('n1', '  borda com espaços  ') // marcado, mas lossless
    const texto = store.getState().textoEditor
    store.getState().aplicarTexto(texto.replace('n2[Nó 2]', 'n2[Outro]'))
    const n1 = store.getState().modelo.nos.find((n) => n.id === 'n1')!
    expect(n1.rotulo).toBe('  borda com espaços  ')
    expect(n1.alertas.length).toBeGreaterThan(0)
  })
})
