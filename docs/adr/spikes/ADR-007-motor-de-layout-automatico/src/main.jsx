import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import mermaid from 'mermaid'

import App from './App.jsx'
import './estilo.css'
import { analisar } from './parser.js'
import { serializar } from './serializar.js'
import corpus from './corpus.js'
import { discordanciaDeOrdem, layoutDagre, ordemDeLeitura } from './layout.js'

// Mesmo papel que no ADR-006: o mermaid de verdade é o oráculo, não uma
// dependência do produto. A diferença é o que se extrai dele.
//
// O ADR-006 extraiu **conteúdo** do SVG (rótulos, contagem de arestas) para
// provar que o código descreve o mesmo diagrama. Aqui se extrai **posição**,
// porque a pergunta é outra: o discovery promete que a pessoa "sabe que o
// código que copia é exatamente o diagrama que está vendo", e quem desenha o
// diagrama do destinatário é o motor de layout do mermaid — não o nosso.
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

let seq = 0

/**
 * id do nó no SVG do mermaid: `<idDoRender>-flowchart-<idDoNó>-<n>`.
 *
 * O prefixo com o id do render é do mermaid 11 — custou uma rodada inteira de
 * verificação com 0 nós em comum antes de aparecer. O id do nó pode conter
 * hífen, então o casamento é ancorado no sufixo numérico.
 */
function idDoNo(g) {
  const bruto = g.getAttribute('id') || ''
  const m = bruto.match(/flowchart-(.+)-\d+$/)
  return m ? m[1] : bruto
}

async function desenhar(texto) {
  const { svg } = await mermaid.render(`oraculo${seq++}`, texto)
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')

  const nos = []
  for (const g of doc.querySelectorAll('g.node')) {
    const t = (g.getAttribute('transform') || '').match(
      /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/,
    )
    if (!t) continue
    const rotulo = g.querySelector('.nodeLabel')
    nos.push({
      id: idDoNo(g),
      // O mermaid posiciona pelo centro do nó, igual ao dagre cru.
      x: Number(t[1]),
      y: Number(t[2]),
      rotulo: rotulo ? rotulo.textContent.trim() : null,
    })
  }

  const arestas = doc.querySelectorAll('g.edgePaths path, path.flowchart-link').length
  return { nos, arestas }
}

window.__oraculo = {
  corpus,
  analisar,
  serializar,

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
      return { ok: true, ...(await desenhar(texto)) }
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e).split('\n')[0].slice(0, 200) }
    }
  },

  /**
   * O braço central deste spike: comparar o layout que **nós** calculamos com o
   * layout que o **mermaid** calcula para o mesmo documento.
   *
   * Compara ordem de leitura, não coordenada. Coordenada não tem como bater: o
   * mermaid dimensiona cada caixa pelo rótulo e nós usamos caixa de tamanho
   * fixo, então os dois desenhos têm escalas diferentes por construção. O que
   * pode bater — e é o que a pessoa reconhece como "é o mesmo diagrama" — é a
   * ordem em que os nós aparecem ao longo da orientação.
   */
  async concordancia(texto, orientacao = null) {
    const { modelo } = analisar(texto)
    // A orientação vem do documento, não do chamador. Forçá-la foi um bug real
    // desta verificação: o documento realista declara `LR`, o nosso layout
    // rodava `TB`, e os 73% de divergência que apareceram eram do harness.
    orientacao = orientacao || modelo.orientacao || 'TB'
    const nosso = layoutDagre(modelo, { orientacao })
    const deles = await this.desenha(texto)
    if (!deles.ok) return { ok: false, erro: deles.erro }

    const posDeles = new Map(deles.nos.map((n) => [n.id, { x: n.x, y: n.y }]))
    const comuns = [...nosso.posicoes.keys()].filter((id) => posDeles.has(id))

    const filtrar = (m) => new Map(comuns.map((id) => [id, m.get(id)]))
    const ordemNossa = ordemDeLeitura(filtrar(nosso.posicoes), orientacao)
    const ordemDeles = ordemDeLeitura(filtrar(posDeles), orientacao)

    return {
      ok: true,
      orientacao,
      nosNossos: nosso.posicoes.size,
      nosDeles: posDeles.size,
      comuns: comuns.length,
      ordem: discordanciaDeOrdem(ordemNossa, ordemDeles),
      ordemNossa,
      ordemDeles,
    }
  },

  /**
   * Achata os `subgraph` de um documento, mantendo os statements de dentro.
   * Serve à sonda que isola a causa da divergência: o mermaid faz layout de
   * cluster e o nosso não, então a hipótese é que a divergência que sobra
   * depois de casar a orientação é o agrupamento. Sonda separa hipótese de
   * afirmação.
   */
  semAgrupamento(texto) {
    return texto
      .split('\n')
      .filter((l) => !/^\s*(subgraph\b|end\s*$|direction\b)/.test(l))
      .join('\n')
  },

  pronto: true,
}

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
