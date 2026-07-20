import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import mermaid from 'mermaid'

import App from './App.jsx'
import './estilo.css'
import { analisar } from './parser.js'
import { serializar } from './serializar.js'
import { normalizar } from './modelo.js'
import corpus from './corpus.js'

// O mermaid de verdade entra como **oráculo externo**, não como dependência do
// produto: é ele quem diz se o código que sai do modelo é mermaid válido e se
// desenha o mesmo diagrama. Sem isso, o round-trip seria o meu parser julgando
// o meu serializador — circular.
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

let seq = 0
async function render(texto) {
  const { svg } = await mermaid.render(`oraculo${seq++}`, texto)
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const rotulosNo = [...doc.querySelectorAll('g.node .nodeLabel')]
    .map((e) => e.textContent.trim())
    .sort()
  const arestas = doc.querySelectorAll('g.edgePaths path, path.flowchart-link').length
  const rotulosAresta = [...doc.querySelectorAll('.edgeLabel .edgeLabel, .edgeLabel .label')]
    .map((e) => e.textContent.trim())
    .filter(Boolean)
    .sort()
  return { rotulosNo, arestas, rotulosAresta }
}

window.__oraculo = {
  corpus,
  analisar,
  serializar,
  normalizar,
  /** `mermaid.parse` é validador — é a superfície pública que o ADR-003 confirmou por pesquisa. */
  async valida(texto) {
    try {
      await mermaid.parse(texto)
      return { ok: true, erro: null }
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e).split('\n')[0].slice(0, 200) }
    }
  },
  async desenha(texto) {
    try {
      return { ok: true, ...(await render(texto)) }
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
