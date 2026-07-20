import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import mermaid from 'mermaid'

import App from './App.jsx'
import './estilo.css'
import { analisar, serializar, normalizar, TIPOS } from './registro.js'
import * as comandos from './comandos.js'
import * as persistencia from './persistencia.js'
import corpus from './corpus.js'

// O mermaid de verdade continua entrando como **oráculo externo** — mesmo papel
// que teve no ADR-006, no ADR-007 e no ADR-008. Aqui ele responde a uma pergunta
// nova: depois de desfazer e refazer, o código que sai do modelo ainda é mermaid
// válido e ainda desenha o mesmo diagrama? Um desfazer conferido pelo meu próprio
// parser seria circular.
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

let seq = 0

const texto = (e) => (e && e.textContent ? e.textContent.trim() : '')
const todos = (doc, sel) => [...doc.querySelectorAll(sel)]

function extrair(doc, familia) {
  if (familia === 'sequencia') {
    const atores = todos(doc, 'text.actor, .actor text, g.actor text').map(texto).filter(Boolean)
    const mensagens = todos(doc, 'text.messageText')
      .map((e) => ({ texto: texto(e), y: Number(e.getAttribute('y') || 0) }))
      .sort((a, b) => a.y - b.y)
    return { rotulosNo: [...new Set(atores)].sort(), arestas: mensagens.length, rotulosAresta: mensagens.map((m) => m.texto) }
  }
  const nos = todos(doc, 'g.node').filter(
    (n) => !/note/i.test(n.getAttribute('id') || '') && !/note/i.test(n.getAttribute('class') || ''),
  )
  const rotulosNo = nos.map((n) => texto(n.querySelector('.nodeLabel, .label, .classTitle')) || texto(n)).filter(Boolean)
  const arestas = todos(doc, 'g.edgePaths path, path.flowchart-link, path.relation').length
  const rotulosAresta = todos(doc, '.edgeLabel .edgeLabel, .edgeLabel .label, g.edgeLabel text').map(texto).filter(Boolean)
  return { rotulosNo: rotulosNo.sort(), arestas, rotulosAresta: rotulosAresta.sort() }
}

/** A assinatura do que o diagrama afirma — o juiz de "voltou ao que era". */
function assinatura(doc, familia) {
  const e = extrair(doc, familia)
  return JSON.stringify({ nos: e.rotulosNo, arestas: e.arestas, rotulos: e.rotulosAresta })
}

async function render(t, familia) {
  const { svg } = await mermaid.render(`oraculo${seq++}`, t)
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  return { ...extrair(doc, familia), assinatura: assinatura(doc, familia) }
}

window.__oraculo = {
  corpus,
  analisar,
  serializar,
  normalizar,
  TIPOS,
  // A camada de comandos exposta crua, sem React no meio. O braço de memória
  // mede o que o **histórico** retém; se cada ato passasse por um render, o que
  // se mediria era outra coisa.
  comandos,
  persistencia,
  async valida(t) {
    try {
      await mermaid.parse(t)
      return { ok: true, erro: null }
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e).split('\n')[0].slice(0, 200) }
    }
  },
  async desenha(t, familia) {
    try {
      return { ok: true, ...(await render(t, familia)) }
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e).split('\n')[0].slice(0, 200) }
    }
  },
  pronto: true,
}

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
