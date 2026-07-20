import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import mermaid from 'mermaid'

import App from './App.jsx'
import './estilo.css'
import { analisar, serializar, normalizar, TIPOS } from './registro.js'
import corpus from './corpus.js'

// O mermaid de verdade entra como **oráculo externo**, não como dependência do
// produto. Vale o mesmo argumento do ADR-006: um round-trip conferido pelo meu
// próprio parser seria circular. Aqui ele julga três famílias em vez de uma —
// e é ele quem diz se o modelo único produz mermaid válido nas três.
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

let seq = 0

const texto = (e) => (e && e.textContent ? e.textContent.trim() : '')
const todos = (doc, sel) => [...doc.querySelectorAll(sel)]

/** `translate(x, y)` do atributo transform, para ler geometria do SVG. */
function posicaoDe(el) {
  const t = el.getAttribute('transform') || ''
  const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(t)
  return m ? { x: Math.round(Number(m[1])), y: Math.round(Number(m[2])) } : { x: 0, y: 0 }
}

/**
 * O que o mermaid desenhou, por família. Os seletores não são os mesmos: o
 * `sequenceDiagram` não tem `g.node` nem `edgePaths` — ele tem atores e
 * `messageText`. Já é o primeiro sinal, do lado do renderer, de que Sequence
 * não é grafo.
 */
function extrair(doc, familia) {
  if (familia === 'sequencia') {
    const atores = todos(doc, 'text.actor, .actor text, g.actor text')
      .map(texto)
      .filter(Boolean)
    // Mensagens **em ordem de leitura** (de cima para baixo): é a semântica.
    const mensagens = todos(doc, 'text.messageText')
      .map((e) => ({ texto: texto(e), y: Number(e.getAttribute('y') || 0) }))
      .sort((a, b) => a.y - b.y)
    return {
      rotulosNo: [...new Set(atores)].sort(),
      arestas: mensagens.length,
      rotulosAresta: mensagens.map((m) => m.texto),
      ordenado: true,
    }
  }

  // No class diagram o `note` é desenhado como um `g.node` — contá-lo faria o
  // código parecer ter mais classes do que o modelo. É artefato de contagem, não
  // divergência.
  const nos = todos(doc, 'g.node').filter((n) => !/note/i.test(n.getAttribute('id') || '') && !/note/i.test(n.getAttribute('class') || ''))
  const rotulosNo = nos.map((n) => texto(n.querySelector('.nodeLabel, .label, .classTitle')) || texto(n)).filter(Boolean)
  const arestas = todos(doc, 'g.edgePaths path, path.flowchart-link, path.relation').length
  const rotulosAresta = todos(doc, '.edgeLabel .edgeLabel, .edgeLabel .label, g.edgeLabel text')
    .map(texto)
    .filter(Boolean)
  return { rotulosNo: rotulosNo.sort(), arestas, rotulosAresta: rotulosAresta.sort(), ordenado: false }
}

/**
 * Duas assinaturas, porque a pergunta tem duas metades e misturá-las dá a
 * resposta errada.
 *
 * **Significado** é o que o diagrama afirma: quais nós existem, quantas ligações
 * há, e — só em Sequence — em que ordem as mensagens acontecem. **Geometria** é
 * onde o renderer pôs cada caixa.
 *
 * Sem essa separação, o braço da permutação responderia "a ordem importa" nas
 * três famílias, pelo motivo errado: o layout do mermaid depende da ordem de
 * declaração mesmo quando o grafo é o mesmo.
 */
function assinaturaDeSignificado(doc, familia) {
  if (familia === 'sequencia') {
    const msgs = todos(doc, 'text.messageText')
      .map((e) => ({ t: texto(e), y: Number(e.getAttribute('y') || 0) }))
      .sort((a, b) => a.y - b.y)
      .map((m) => m.t)
    const atores = todos(doc, 'text.actor, .actor text, g.actor text')
      .map((e) => ({ t: texto(e), x: Number(e.getAttribute('x') || 0) }))
      .sort((a, b) => a.x - b.x)
      .map((a) => a.t)
    // Ordem preservada nos dois: em sequência, ordem É significado.
    return JSON.stringify({ atores: [...new Set(atores)], mensagens: msgs })
  }
  const e = extrair(doc, familia)
  return JSON.stringify({ nos: e.rotulosNo, arestas: e.arestas, rotulos: e.rotulosAresta })
}

function assinaturaGeometrica(doc, familia) {
  if (familia === 'sequencia') {
    return JSON.stringify(
      todos(doc, 'text.messageText')
        .map((e) => ({ t: texto(e), y: Number(e.getAttribute('y') || 0) }))
        .sort((a, b) => a.y - b.y),
    )
  }
  return JSON.stringify(
    todos(doc, 'g.node')
      .map((n) => {
        const p = posicaoDe(n)
        return { r: texto(n.querySelector('.nodeLabel, .label, .classTitle')) || texto(n), x: p.x, y: p.y }
      })
      .sort((a, b) => (a.r < b.r ? -1 : 1)),
  )
}

async function render(texto, familia) {
  const { svg } = await mermaid.render(`oraculo${seq++}`, texto)
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  return {
    ...extrair(doc, familia),
    significado: assinaturaDeSignificado(doc, familia),
    geometria: assinaturaGeometrica(doc, familia),
  }
}

window.__oraculo = {
  corpus,
  analisar,
  serializar,
  normalizar,
  TIPOS,
  /** `mermaid.parse` é validador — é a superfície pública que o ADR-003 confirmou por pesquisa. */
  async valida(texto) {
    try {
      await mermaid.parse(texto)
      return { ok: true, erro: null }
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e).split('\n')[0].slice(0, 200) }
    }
  },
  async desenha(texto, familia) {
    try {
      return { ok: true, ...(await render(texto, familia)) }
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e).split('\n')[0].slice(0, 200) }
    }
  },
  /** Permuta o agregado da família e devolve o texto correspondente. */
  permutado(familia, texto) {
    const t = TIPOS[familia]
    const m = t.analisar(texto).modelo
    return t.serializar(t.permutar(m))
  },
  pronto: true,
}

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
