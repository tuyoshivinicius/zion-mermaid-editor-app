// A verdade do spike. Segue o desenho do ADR-003: modelo de domínio próprio,
// agnóstico de vista, sem coordenada na estrutura. A posição vive num campo
// separado (`posicoes`), marcado aqui como efêmero — é o que a projeção para
// texto simplesmente não emite.

const PALAVRAS = [
  'validar', 'entrada', 'do', 'usuário', 'antes', 'de', 'gravar', 'no',
  'repositório', 'e', 'notificar', 'o', 'serviço', 'de', 'auditoria',
]

/** Rótulo com tamanho realista de sessão da Marina (3 a 6 palavras). */
function rotulo(i) {
  const n = 3 + (i % 4)
  const partes = []
  for (let k = 0; k < n; k++) partes.push(PALAVRAS[(i * 3 + k) % PALAVRAS.length])
  return `${i}. ${partes.join(' ')}`
}

/**
 * Flowchart: o núcleo do escopo (grafo dirigido).
 * n nós numa cadeia, mais ramificações a cada 3 nós -> ~1.3n arestas.
 */
export function gerarFlowchart(n) {
  const cols = Math.ceil(Math.sqrt(n))
  const nodes = []
  for (let i = 0; i < n; i++) {
    nodes.push({ id: `n${i}`, label: rotulo(i), shape: i % 7 === 0 ? 'losango' : 'caixa' })
  }
  const edges = []
  for (let i = 0; i < n - 1; i++) {
    edges.push({ id: `e${i}`, from: `n${i}`, to: `n${i + 1}`, label: i % 5 === 0 ? 'sim' : '' })
  }
  for (let i = 0; i < n; i += 3) {
    const alvo = i + cols
    if (alvo < n) edges.push({ id: `x${i}`, from: `n${i}`, to: `n${alvo}`, label: '' })
  }
  return { tipo: 'flowchart', nodes, edges, posicoes: {}, cols }
}

/**
 * Sequence: existe aqui só para carregar a suspeita do ADR-004 sobre o desenho
 * do ADR-002 — o instante do tempo ancorado num Handle, que põe
 * `participantes x (mensagens + 1)` handles no DOM. O desenho é deliberadamente
 * mais pobre que o do spike ADR-002 (sem ativação, sem fragmento, sem seta
 * própria): o objeto da medição é a densidade de handles, não a fidelidade.
 */
export function gerarSequence(p, m) {
  const participants = []
  for (let i = 0; i < p; i++) participants.push({ id: `p${i}`, name: `Serviço ${i}` })
  const messages = []
  for (let i = 0; i < m; i++) {
    const de = i % p
    const para = (i + 1 + (i % 3)) % p
    messages.push({
      id: `m${i}`,
      from: `p${de}`,
      to: `p${para === de ? (de + 1) % p : para}`,
      label: rotulo(i),
    })
  }
  return { tipo: 'sequence', participants, messages, posicoes: {} }
}

// ---------------------------------------------------------------------------
// Projeção modelo -> mermaid. É o "serializar é projetar, não despejar" do
// ADR-003: `posicoes` existe no modelo e não aparece na saída, por construção.
// ---------------------------------------------------------------------------

const escapar = (s) => s.replace(/"/g, '#quot;')

export function serializar(modelo) {
  return modelo.tipo === 'flowchart' ? serializarFlowchart(modelo) : serializarSequence(modelo)
}

function serializarFlowchart(m) {
  const linhas = ['flowchart TD']
  for (const n of m.nodes) {
    linhas.push(
      n.shape === 'losango'
        ? `    ${n.id}{"${escapar(n.label)}"}`
        : `    ${n.id}["${escapar(n.label)}"]`,
    )
  }
  for (const e of m.edges) {
    linhas.push(
      e.label
        ? `    ${e.from} -->|${escapar(e.label)}| ${e.to}`
        : `    ${e.from} --> ${e.to}`,
    )
  }
  return linhas.join('\n')
}

function serializarSequence(m) {
  const linhas = ['sequenceDiagram']
  for (const p of m.participants) linhas.push(`    participant ${p.id} as ${p.name}`)
  for (const msg of m.messages) linhas.push(`    ${msg.from}->>${msg.to}: ${msg.label}`)
  return linhas.join('\n')
}

// ---------------------------------------------------------------------------
// Mutações. Cada uma devolve um modelo novo (a transação do ADR-003).
// ---------------------------------------------------------------------------

export function editarRotulo(modelo, indice, texto) {
  if (modelo.tipo === 'flowchart') {
    const nodes = modelo.nodes.slice()
    const i = indice % nodes.length
    nodes[i] = { ...nodes[i], label: texto }
    return { ...modelo, nodes }
  }
  const messages = modelo.messages.slice()
  const i = indice % messages.length
  messages[i] = { ...messages[i], label: texto }
  return { ...modelo, messages }
}

export function criarElemento(modelo, seq) {
  if (modelo.tipo === 'flowchart') {
    const id = `novo${seq}`
    const ultimo = modelo.nodes[modelo.nodes.length - 1]
    return {
      ...modelo,
      nodes: [...modelo.nodes, { id, label: `novo ${seq}`, shape: 'caixa' }],
      edges: [...modelo.edges, { id: `enovo${seq}`, from: ultimo.id, to: id, label: '' }],
    }
  }
  const id = `mnovo${seq}`
  return {
    ...modelo,
    messages: [
      ...modelo.messages,
      { id, from: modelo.participants[0].id, to: modelo.participants[1].id, label: `novo ${seq}` },
    ],
  }
}
