import { describe, it, expect } from 'vitest'
import { getBezierPath, Position } from '@xyflow/react'
import { caminhoDaConexao, pontaDeDestino, pontaDeOrigem } from '../../src/canvas/caminho'
import { extensaoDesenhada, extensaoDoElemento } from '../../src/areatrabalho/extensao'
import type { MedirTexto } from '../../src/areatrabalho/extensao'
import { criarSessaoStore } from '../../src/modelo/store'
import { CAIXA_H, CAIXA_W, projetar } from '../../src/projecao/projetar'
import type { Projecao } from '../../src/projecao/projetar'

// A EXTENSÃO DESENHADA (T028 / contracts/extensao-desenhada.md).
//
// A geometria ÚNICA de `FR-008` e `FR-011`. A spec é explícita em que os dois
// requisitos medem a mesma coisa; aqui isso deixa de ser disciplina e vira
// estrutura: uma função, dois consumidores.
//
// Superset, nunca recorte: uma curva de Bézier está contida no casco convexo dos
// seus pontos de controle. A caixa devolvida pode SOBRAR; não pode FALTAR.

/** Medidor determinístico — em teste o texto não depende de fonte nem de navegador. */
const medir: MedirTexto = (t) => ({ w: t.length * 7, h: 16 })

function sessao(texto: string) {
  const store = criarSessaoStore()
  store.getState().aplicarTexto(texto)
  return store
}

const projecaoDe = (texto: string): Projecao => {
  const s = sessao(texto).getState()
  return projetar(s.modelo, s.arranjo)
}

const contem = (fora: { x: number; y: number; w: number; h: number }, dentro: typeof fora) =>
  fora.x <= dentro.x &&
  fora.y <= dentro.y &&
  fora.x + fora.w >= dentro.x + dentro.w &&
  fora.y + fora.h >= dentro.y + dentro.h

describe('caminho.ts — quem pinta e quem mede chamam a MESMA função (T028, Invariante 2)', () => {
  it('o `d` do path é byte-idêntico ao da engine — trocar o gerador não mudou o desenho', () => {
    const casos = [
      { sourceX: 0, sourceY: 0, targetX: 200, targetY: 300 },
      { sourceX: 480, sourceY: 100, targetX: 10, targetY: -90 },
      { sourceX: -33, sourceY: 77, targetX: -33, targetY: 77 },
      { sourceX: 100, sourceY: 500, targetX: 900, targetY: 20 },
    ]
    for (const c of casos) {
      const [dEngine, lx, ly] = getBezierPath({
        ...c,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      })
      const nosso = caminhoDaConexao(c)
      expect(nosso.path).toBe(dEngine)
      expect(nosso.labelX).toBeCloseTo(lx, 9)
      expect(nosso.labelY).toBeCloseTo(ly, 9)
    }
  })

  it('devolve os 4 pontos da cúbica — início, os dois de controle e fim', () => {
    const c = caminhoDaConexao({ sourceX: 0, sourceY: 0, targetX: 100, targetY: 400 })
    expect(c.pontos).toHaveLength(4)
    expect(c.pontos[0]).toEqual({ x: 0, y: 0 })
    expect(c.pontos[3]).toEqual({ x: 100, y: 400 })
  })

  it('as pontas nascem dos handles declarados: baixo na origem, topo no destino', () => {
    expect(pontaDeOrigem({ x: 40, y: 60 })).toEqual({ x: 40 + CAIXA_W / 2, y: 60 + CAIXA_H })
    expect(pontaDeDestino({ x: 40, y: 60 })).toEqual({ x: 40 + CAIXA_W / 2, y: 60 })
  })
})

describe('extensaoDoElemento — as quatro geometrias (T028 / FR-011)', () => {
  it('NÓ: a caixa dele', () => {
    const p = projecaoDe('flowchart TD\nn1[Alfa]')
    const n = p.nodes.find((x) => x.id === 'n1')!
    expect(extensaoDoElemento(p, 'n1', medir)).toEqual({
      x: n.position.x,
      y: n.position.y,
      w: CAIXA_W,
      h: CAIXA_H,
    })
  })

  it('AGRUPAMENTO: a moldura, não a união das caixas dos membros', () => {
    const p = projecaoDe('flowchart TD\nn1[A]\nn2[B]\nsubgraph g1[Grupo]\n  n1\n  n2\nend')
    const g = p.nodes.find((x) => x.id === 'g1')!
    const e = extensaoDoElemento(p, 'g1', medir)!
    expect(e).toEqual({ x: g.position.x, y: g.position.y, w: g.width, h: g.height })

    // a moldura contém os membros — é ela que sai da tela primeiro
    for (const id of ['n1', 'n2']) expect(contem(e, extensaoDoElemento(p, id, medir)!)).toBe(true)
  })

  it('CONEXÃO: a caixa dos PONTOS DE CONTROLE do caminho, e ela CONTÉM a curva', () => {
    const p = projecaoDe('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const c = p.edges[0]
    const e = extensaoDoElemento(p, c.id, medir)!

    const origem = p.nodes.find((n) => n.id === c.source)!
    const destino = p.nodes.find((n) => n.id === c.target)!
    const cam = caminhoDaConexao({
      ...pontaDeOrigem(origem.position),
      ...{ sourceX: pontaDeOrigem(origem.position).x, sourceY: pontaDeOrigem(origem.position).y },
      targetX: pontaDeDestino(destino.position).x,
      targetY: pontaDeDestino(destino.position).y,
    })

    // superset garantido: TODOS os pontos de controle estão dentro (Invariante 1)
    for (const pt of cam.pontos) {
      expect(pt.x).toBeGreaterThanOrEqual(e.x)
      expect(pt.x).toBeLessThanOrEqual(e.x + e.w)
      expect(pt.y).toBeGreaterThanOrEqual(e.y)
      expect(pt.y).toBeLessThanOrEqual(e.y + e.h)
    }
    // e a curva inteira também, amostrada
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const [a, b, cc, d] = cam.pontos
      const u = 1 - t
      const x = u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * cc.x + t * t * t * d.x
      const y = u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * cc.y + t * t * t * d.y
      expect(x).toBeGreaterThanOrEqual(e.x - 1e-9)
      expect(x).toBeLessThanOrEqual(e.x + e.w + 1e-9)
      expect(y).toBeGreaterThanOrEqual(e.y - 1e-9)
      expect(y).toBeLessThanOrEqual(e.y + e.h + 1e-9)
    }
  })

  it('RÓTULO DE CONEXÃO: a extensão é a UNIÃO do traçado com o rótulo', () => {
    const semRotulo = projecaoDe('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const tracado = extensaoDoElemento(semRotulo, semRotulo.edges[0].id, medir)!

    // um rótulo que CABE no traçado não alarga nada — união, não soma
    const curto = projecaoDe('flowchart TD\nn1[A]\nn2[B]\nn1 -->|ok| n2')
    const b = extensaoDoElemento(curto, curto.edges[0].id, medir)!
    expect(b).toEqual(tracado)

    // um rótulo que EXCEDE o traçado alarga — e o traçado continua dentro
    const longo = 'x'.repeat(120)
    const p = projecaoDe(`flowchart TD\nn1[A]\nn2[B]\nn1 -->|${longo}| n2`)
    const c = extensaoDoElemento(p, p.edges[0].id, medir)!
    expect(c.w).toBeGreaterThan(tracado.w)
    expect(contem(c, tracado)).toBe(true)
  })

  it('o rótulo que sai do traçado sai também da EXTENSÃO DO DIAGRAMA (SC-004)', () => {
    // é este caso que impede "0 rótulos de conexão cortados pela borda" de mentir
    const longo = 'x'.repeat(120)
    const p = projecaoDe(`flowchart TD\nn1[A]\nn2[B]\nn1 -->|${longo}| n2`)
    const todo = extensaoDesenhada(p, medir)!
    expect(contem(todo, extensaoDoElemento(p, p.edges[0].id, medir)!)).toBe(true)
  })

  it('id inexistente → null (a pergunta é legítima, a resposta é silenciosa)', () => {
    const p = projecaoDe('flowchart TD\nn1[A]')
    expect(extensaoDoElemento(p, 'nao-existe', medir)).toBeNull()
  })

  it('membro de agrupamento: a posição é ABSOLUTA, resolvendo o `parentId`', () => {
    const p = projecaoDe('flowchart TD\nn1[A]\nsubgraph g1[G]\n  n1\nend')
    const n = p.nodes.find((x) => x.id === 'n1')!
    const g = p.nodes.find((x) => x.id === 'g1')!
    expect(n.parentId).toBe('g1') // a posição do nó é relativa
    const e = extensaoDoElemento(p, 'n1', medir)!
    expect(e.x).toBe(g.position.x + n.position.x)
    expect(e.y).toBe(g.position.y + n.position.y)
  })
})

describe('extensaoDesenhada — o diagrama INTEIRO (T028 / FR-008, SC-004)', () => {
  it('diagrama vazio → null, e nenhum erro', () => {
    expect(extensaoDesenhada(projecaoDe('flowchart TD'), medir)).toBeNull()
  })

  it('contém TODOS os elementos: nós, conexões com rótulo e molduras', () => {
    const p = projecaoDe(
      [
        'flowchart TD',
        'n1[Alfa]',
        'n2[Beta]',
        'n3[Gama]',
        'n1 -->|rótulo comprido da conexão| n2',
        'n2 --> n3',
        'subgraph g1[Grupo]',
        '  n1',
        '  n2',
        'end',
      ].join('\n'),
    )
    const todo = extensaoDesenhada(p, medir)!
    for (const id of ['n1', 'n2', 'n3', 'g1', ...p.edges.map((e) => e.id)]) {
      const e = extensaoDoElemento(p, id, medir)!
      expect(contem(todo, e), `${id} fora da extensão do diagrama`).toBe(true)
    }
  })

  it('é DETERMINÍSTICA: o mesmo documento dá a mesma caixa, bit a bit', () => {
    const doc = 'flowchart TD\nn1[A]\nn2[B]\nn3[C]\nn1 -->|via| n2\nn2 --> n3'
    // duas sessões independentes: nada de cache no meio, e a caixa é a mesma
    const a = extensaoDesenhada(projecaoDe(doc), medir)
    const b = extensaoDesenhada(projecaoDe(doc), medir)
    // produto e teste chamam a MESMA função — é isso que faz "0 desvios" (SC-004)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('um nó só: a extensão é a caixa dele', () => {
    const p = projecaoDe('flowchart TD\nn1[A]')
    const n = p.nodes[0]
    expect(extensaoDesenhada(p, medir)).toEqual({
      x: n.position.x,
      y: n.position.y,
      w: CAIXA_W,
      h: CAIXA_H,
    })
  })
})

describe('o cache é chaveado pela IDENTIDADE REFERENCIAL da projeção (T028, Invariante 5)', () => {
  it('reprojetar sem mudança reusa os objetos — e a extensão reusa junto', () => {
    const store = sessao('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const s = store.getState()
    const p1 = projetar(s.modelo, s.arranjo)
    const p2 = projetar(s.modelo, s.arranjo)
    // a invariante de reuso do ADR-004 (Princípio III) está de pé…
    expect(p2.nodes[0]).toBe(p1.nodes[0])
    // …e é dela que esta feature depende: a extensão do elemento reusado é a mesma
    expect(extensaoDoElemento(p2, 'n1', medir)).toEqual(extensaoDoElemento(p1, 'n1', medir))
  })

  it('o nó se move → objeto novo → extensão RECALCULADA (0 caches obsoletos)', () => {
    const store = sessao('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const antes = projetar(store.getState().modelo, store.getState().arranjo)
    const extAntes = extensaoDoElemento(antes, 'n1', medir)!

    store.getState().moverNo('n1', { x: 4000, y: 3000 })
    const depois = projetar(store.getState().modelo, store.getState().arranjo)
    const extDepois = extensaoDoElemento(depois, 'n1', medir)!

    expect(extDepois.x).toBe(4000)
    expect(extDepois).not.toEqual(extAntes)
  })

  it('a CONEXÃO acompanha o movimento das pontas, mesmo com o objeto da aresta reusado', () => {
    const store = sessao('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
    const antes = projetar(store.getState().modelo, store.getState().arranjo)
    const idAresta = antes.edges[0].id
    const extAntes = extensaoDoElemento(antes, idAresta, medir)!

    store.getState().moverNo('n2', { x: 2500, y: 1800 })
    const depois = projetar(store.getState().modelo, store.getState().arranjo)

    // a aresta é o MESMO objeto (nada que ela enxerga mudou)…
    expect(depois.edges[0]).toBe(antes.edges[0])
    // …mas a extensão dela NÃO pode ser a de antes: as pontas se moveram
    const extDepois = extensaoDoElemento(depois, idAresta, medir)!
    expect(extDepois).not.toEqual(extAntes)
    expect(extDepois.x + extDepois.w).toBeGreaterThan(2000)
  })
})

describe('a extensão NUNCA lê o DOM (T028, "não faz parte deste contrato")', () => {
  it('roda sem `document` — é aritmética sobre a projeção', () => {
    const p = projecaoDe('flowchart TD\nn1[A]\nn2[B]\nn1 -->|x| n2')
    const doc = globalThis.document
    try {
      // @ts-expect-error — retirado de propósito
      delete globalThis.document
      expect(extensaoDesenhada(p, medir)).not.toBeNull()
    } finally {
      globalThis.document = doc
    }
  })
})
