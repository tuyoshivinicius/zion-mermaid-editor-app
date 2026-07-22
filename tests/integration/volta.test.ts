import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { documentosNoVocabulario } from '../fixtures/corpus'

describe('a volta: texto → diagrama (T037 / US2)', () => {
  it('renomear id mantém identidade E posição (FR-018 / US2-7)', () => {
    const store = criarSessaoStore()
    store.getState().criarNo({ x: 333, y: 177 }) // n1 no ponto arrastado
    const pos = store.getState().arranjo.porId.get('n1')
    expect(pos).toEqual({ x: 333, y: 177 })

    // renomeia n1 -> x1 no editor
    const renomeado = store.getState().textoEditor.replace('n1', 'x1')
    store.getState().aplicarTexto(renomeado)

    const ids = store.getState().modelo.nos.map((n) => n.id)
    expect(ids).toEqual(['x1']) // o mesmo nó, novo id
    expect(store.getState().arranjo.porId.get('x1')).toEqual(pos) // mesma posição
  })

  it('id repetido → um nó só; último rótulo prevalece (FR-016 / US2-8)', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn1[B]')
    const nos = store.getState().modelo.nos
    expect(nos).toHaveLength(1)
    expect(nos[0]).toMatchObject({ id: 'n1', rotulo: 'B' })
  })

  it('materializa um documento do corpus com posições distintas (SC-002 / SC-008)', () => {
    for (const { nome, texto } of documentosNoVocabulario()) {
      const store = criarSessaoStore()
      store.getState().aplicarTexto(texto)
      const nodes = store.getState().projecao.nodes
      const chaves = new Set(nodes.map((n) => `${n.position.x},${n.position.y}`))
      expect(chaves.size, `${nome}: 0 caixas empilhadas`).toBe(nodes.length)
    }
  })

  it('apagar a linha remove o nó; os demais permanecem (US2-2)', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]')
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn3[C]') // apagou n2
    expect(store.getState().modelo.nos.map((n) => n.id)).toEqual(['n1', 'n3'])
  })
})
