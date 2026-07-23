import { describe, it, expect } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { normalizar } from '../../src/codec'
import { selecaoVazia, type Selecao } from '../../src/modelo/selecao'

// Ato em bloco no envelope cheio (T049 / Princípio IV / NFR-04). Mede o COMMIT da
// transação (não o gesto visível de desfazer). (a) p95 ≤110ms em ≥100 repetições a 400;
// (b) reverter a transação (re-aplicar o textoEditor anterior) restaura estado
// ESTRUTURALMENTE idêntico. Medição no store real (pura, sem browser — determinística).

const sel = (over: Partial<Selecao>): Selecao => ({ ...selecaoVazia(), ...over })
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.95)]

function envelope400(): string {
  const linhas = ['flowchart TD']
  for (let i = 1; i <= 400; i++) linhas.push(`n${i}[Passo ${i}]`)
  return linhas.join('\n')
}

describe('ato em bloco a 400: latência do commit (T049 / NFR-04)', () => {
  it('p95 do commit da transação em ≥100 repetições ≤ 110ms', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto(envelope400())
    const ids = store.getState().modelo.nos.map((n) => n.id)

    const tempos: number[] = []
    for (let rep = 0; rep < 120; rep++) {
      const posicoes: Record<string, { x: number; y: number }> = {}
      for (let i = 0; i < ids.length; i++) posicoes[ids[i]] = { x: (i % 20) * 200 + rep, y: Math.floor(i / 20) * 120 }
      const t0 = performance.now()
      store.getState().moverSelecao(posicoes) // ato em bloco sobre 400 → 1 transação
      tempos.push(performance.now() - t0)
    }
    const medido = p95(tempos.slice(20)) // descarta o aquecimento
    // eslint-disable-next-line no-console
    console.log(`commit @400: p95=${medido.toFixed(1)}ms`)
    expect(medido).toBeLessThanOrEqual(110)
  })
})

describe('ato em bloco: reversibilidade estrutural (T049)', () => {
  it('reverter a transação restaura um modelo estruturalmente idêntico', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn1 --> n2\nn2 --> n3\nsubgraph g[G]\n  n1\n  n2\nend')
    const antesTexto = store.getState().textoEditor
    const antesModelo = normalizar(store.getState().modelo)

    // ato em bloco: exclui n2 (leva conexões presas; g mantém n1)
    store.getState().excluirSelecao(sel({ nos: new Set(['n2']) }))
    expect(normalizar(store.getState().modelo)).not.toEqual(antesModelo) // mudou de fato

    // reverte re-aplicando o textoEditor anterior (a transação é a unidade do desfazer)
    store.getState().aplicarTexto(antesTexto)
    expect(normalizar(store.getState().modelo)).toEqual(antesModelo) // idêntico estruturalmente
  })

  it('a cascata de esvaziamento é reversível numa transação', () => {
    const store = criarSessaoStore()
    store.getState().aplicarTexto('flowchart TD\nn1[A]\nsubgraph out[F]\n  subgraph inn[D]\n    n1\n  end\nend')
    const antesTexto = store.getState().textoEditor
    const antes = normalizar(store.getState().modelo)
    store.getState().excluirSelecao(sel({ nos: new Set(['n1']) }))
    expect(store.getState().modelo.agrupamentos).toHaveLength(0) // cascata esvaziou tudo
    store.getState().aplicarTexto(antesTexto)
    expect(normalizar(store.getState().modelo)).toEqual(antes) // volta idêntico
  })
})
