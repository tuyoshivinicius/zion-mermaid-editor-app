// A verdade do spike. Segue a disciplina do ADR-003: modelo de domínio próprio,
// agnóstico de vista. **Sem coordenada** — a posição é derivada do índice na
// projeção, nunca guardada aqui. Toda mutação é uma transação: entra um modelo,
// sai outro.

export function vazio() {
  return { nos: [], conexoes: [], seq: 0 }
}

export function criarNo(m, { de = null } = {}) {
  const n = m.seq + 1
  const noId = `n${n}`
  const nos = [...m.nos, { id: noId, rotulo: '' }]
  let conexoes = m.conexoes
  let conexaoId = null
  if (de) {
    conexaoId = `c${n}`
    conexoes = [...m.conexoes, { id: conexaoId, de, para: noId, rotulo: '' }]
  }
  return { modelo: { nos, conexoes, seq: n }, noId, conexaoId }
}

export function conectar(m, de, para) {
  const n = m.seq + 1
  const conexaoId = `c${n}`
  return {
    modelo: {
      ...m,
      seq: n,
      conexoes: [...m.conexoes, { id: conexaoId, de, para, rotulo: '' }],
    },
    conexaoId,
  }
}

export function editarRotuloNo(m, id, rotulo) {
  return { ...m, nos: m.nos.map((n) => (n.id === id ? { ...n, rotulo } : n)) }
}

export function editarRotuloConexao(m, id, rotulo) {
  return { ...m, conexoes: m.conexoes.map((c) => (c.id === id ? { ...c, rotulo } : c)) }
}

export function removerNo(m, id) {
  return {
    ...m,
    nos: m.nos.filter((n) => n.id !== id),
    conexoes: m.conexoes.filter((c) => c.de !== id && c.para !== id),
  }
}

/** Projeção modelo -> mermaid. Existe para provar que a edição chegou às duas vistas. */
export function serializar(m) {
  const linhas = ['flowchart TD']
  for (const n of m.nos) linhas.push(`  ${n.id}["${n.rotulo}"]`)
  for (const c of m.conexoes) {
    linhas.push(c.rotulo ? `  ${c.de} -->|${c.rotulo}| ${c.para}` : `  ${c.de} --> ${c.para}`)
  }
  return linhas.join('\n')
}

/**
 * Diagrama denso pré-fabricado: o cenário do envelope do ADR-004 (400 nós /
 * 500 conexões). Serve para medir a latência de tecla dentro do envelope, não
 * para provar fluidez de novo.
 */
export function gerarDenso(n, arestas) {
  const nos = Array.from({ length: n }, (_, i) => ({ id: `n${i + 1}`, rotulo: `Passo ${i + 1}` }))
  const conexoes = []
  for (let i = 0; i < arestas; i++) {
    const de = nos[i % n].id
    const para = nos[(i * 7 + 1) % n].id
    if (de !== para) conexoes.push({ id: `c${i + 1}`, de, para, rotulo: '' })
  }
  return { nos, conexoes, seq: n + arestas }
}
