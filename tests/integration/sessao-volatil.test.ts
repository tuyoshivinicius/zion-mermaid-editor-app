import { describe, it, expect, vi, afterEach } from 'vitest'
import { criarSessaoStore } from '../../src/modelo/store'
import { alvoAbertura, padraoDeclarado } from '../../src/areatrabalho/enquadramento'
import { extensaoDesenhada } from '../../src/areatrabalho/extensao'
import { projetar } from '../../src/projecao/projetar'
import { PROPORCAO_PADRAO, TAMANHO_NATURAL } from '../../src/areatrabalho/faixa'
import type { Quadro } from '../../src/areatrabalho/tipos'

// SESSÃO VOLÁTIL (T051 / Princípio XI / ADR-010).
//
// Nada desta spec é persistido. Proporção, enquadramento, zoom e modo hand vivem SÓ
// na sessão — e a abertura os DERIVA do conteúdo presente em vez de recuperá-los da
// sessão anterior. O que o rascunho (`RF-27`) devolve é o diagrama, não o passado
// dele: guardar qualquer um deles entre sessões seria decisão de
// `rascunho-da-sessao`, não desta spec.

const QUADRO: Quadro = { x: 0, y: 0, w: 1000, h: 700 }

afterEach(() => vi.restoreAllMocks())

/** Espiona TODO o armazém do navegador — leitura e escrita, local e de sessão. */
function espiarArmazem() {
  const escritas: [string, string][] = []
  const leituras: string[] = []
  const remocoes: string[] = []
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => void escritas.push([k, v]))
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => {
    leituras.push(k)
    return null
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((k) => void remocoes.push(k))
  return { escritas, leituras, remocoes }
}

const DOC = 'flowchart TD\nn1[Alfa]\nn2[Beta]\nn1 --> n2'

describe('0 escritas no armazém por gesto desta spec (T051 / Princípio XI)', () => {
  it('a rajada dos cinco gestos não grava um byte', () => {
    const armazem = espiarArmazem()
    const store = criarSessaoStore()
    store.getState().aplicarTexto(DOC)

    for (let k = 0; k < 50; k++) {
      const s = store.getState()
      s.fixarRazao(0.3 + (k % 9) * 0.05)
      s.fixarEnquadramento({ x: -k * 11, y: k * 5, zoom: 1 + (k % 4) * 0.3 })
      s.fixarModoHand(k % 3 === 0 ? 'persistente' : k % 3 === 1 ? 'temporario' : 'off')
    }

    expect(armazem.escritas).toEqual([])
    expect(armazem.remocoes).toEqual([])
  })

  it('nem o `desarmarAbertura` nem o registro do piloto gravam', () => {
    const armazem = espiarArmazem()
    const store = criarSessaoStore()
    store.getState().registrarPiloto({
      enquadramentoCorrente: () => ({ x: 0, y: 0, zoom: 1 }),
      aplicar: () => {},
      quadro: () => QUADRO,
    })
    store.getState().desarmarAbertura()
    expect(armazem.escritas).toEqual([])
  })
})

describe('a abertura DERIVA do conteúdo, não recupera a sessão anterior (T051 / FR-017, ADR-010)', () => {
  it('0 leituras do armazém para decidir o enquadramento de abertura', () => {
    const armazem = espiarArmazem()
    const store = criarSessaoStore()
    store.getState().aplicarTexto(DOC)
    const s = store.getState()
    const ext = extensaoDesenhada(projetar(s.modelo, s.arranjo))

    // o alvo da abertura sai de (extensão, quadro) e de mais nada
    const alvo = alvoAbertura(ext, QUADRO)

    expect(armazem.leituras).toEqual([])
    expect(Number.isFinite(alvo.x)).toBe(true)
  })

  it('o mesmo conteúdo dá o mesmo enquadramento — a sessão anterior é irrelevante', () => {
    const a = criarSessaoStore()
    a.getState().aplicarTexto(DOC)
    a.getState().fixarEnquadramento({ x: -5000, y: 9000, zoom: 0.03 }) // "a sessão anterior"

    const b = criarSessaoStore()
    b.getState().aplicarTexto(DOC)

    const alvoA = alvoAbertura(extensaoDesenhada(projetar(a.getState().modelo, a.getState().arranjo)), QUADRO)
    const alvoB = alvoAbertura(extensaoDesenhada(projetar(b.getState().modelo, b.getState().arranjo)), QUADRO)
    expect(alvoA).toEqual(alvoB)
  })

  it('sessão nova nasce no padrão declarado, não num valor guardado', () => {
    const store = criarSessaoStore()
    const a = store.getState().areaDeTrabalho
    expect(a.razaoEditor).toBe(PROPORCAO_PADRAO)
    expect(a.enquadramento).toEqual({ x: 0, y: 0, zoom: TAMANHO_NATURAL })
    expect(a.modoHand).toBe('off')
    expect(a.aberturaPendente).toBe(true)
    expect(a.piloto).toBeNull()
    // e o alvo do vazio é derivado do quadro, não lembrado
    expect(padraoDeclarado(QUADRO).zoom).toBe(TAMANHO_NATURAL)
  })

  it('duas sessões independentes não compartilham o slot', () => {
    const a = criarSessaoStore()
    const b = criarSessaoStore()
    a.getState().fixarRazao(0.9)
    a.getState().fixarModoHand('persistente')
    expect(b.getState().areaDeTrabalho.razaoEditor).toBe(PROPORCAO_PADRAO)
    expect(b.getState().areaDeTrabalho.modoHand).toBe('off')
  })
})
