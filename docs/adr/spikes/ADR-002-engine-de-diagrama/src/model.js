// Modelo interno do spike — a "verdade" do diagrama de sequência.
//
// Ponto central da pergunta do spike: aqui NÃO existe coordenada. O tempo é o
// índice do array `messages`; a coluna é o índice do array `participants`.
// O ADR-002 adota uma engine cujo vocabulário é (x, y) por nó — este arquivo
// existe para que o spike prove se dá para manter a verdade sem coordenada e
// derivar (x, y) só na vista, ou se a engine força a coordenada para dentro do
// modelo (o trade-off "modelo interno acoplado" registrado no ADR-002).

export const modeloInicial = {
  participants: [
    { id: 'p1', name: 'Marina' },
    { id: 'p2', name: 'Editor' },
    { id: 'p3', name: 'Parser' },
    { id: 'p4', name: 'Canvas' },
  ],
  // A ordem deste array É a ordem temporal. Não há campo `y`.
  messages: [
    { id: 'm1', from: 'p1', to: 'p2', label: 'digita mermaid', arrow: 'solid' },
    { id: 'm2', from: 'p2', to: 'p3', label: 'parse(texto)', arrow: 'solid' },
    { id: 'm3', from: 'p3', to: 'p3', label: 'valida sintaxe', arrow: 'self' },
    { id: 'm4', from: 'p3', to: 'p2', label: 'modelo', arrow: 'dashed' },
    { id: 'm5', from: 'p2', to: 'p4', label: 'render(modelo)', arrow: 'solid' },
    { id: 'm6', from: 'p4', to: 'p1', label: 'prévia', arrow: 'dashed' },
  ],
  // Barra de ativação: participante ativo entre dois índices de tempo.
  activations: [
    { id: 'a1', participant: 'p2', from: 0, to: 5 },
    { id: 'a2', participant: 'p3', from: 1, to: 3 },
    { id: 'a3', participant: 'p4', from: 4, to: 5 },
  ],
  // Fragmento (alt/loop/opt): recorte vertical do tempo.
  fragments: [
    { id: 'f1', kind: 'loop', label: 'a cada tecla', from: 0, to: 5 },
    { id: 'f2', kind: 'alt', label: 'sintaxe válida', from: 1, to: 3 },
  ],
}

let seq = 100
export const novoId = (prefixo) => `${prefixo}${seq++}`

export const indiceDoParticipante = (modelo, id) =>
  modelo.participants.findIndex((p) => p.id === id)

/** Insere uma mensagem numa posição do tempo, deslocando o que vem depois. */
export function inserirMensagem(modelo, indice, msg) {
  const messages = [...modelo.messages]
  const at = Math.max(0, Math.min(indice, messages.length))
  messages.splice(at, 0, msg)
  return { ...modelo, messages, ...remapearIndices(modelo, messages) }
}

/** Move uma mensagem de um instante para outro (reordenar no tempo). */
export function moverMensagem(modelo, id, destino) {
  const de = modelo.messages.findIndex((m) => m.id === id)
  if (de < 0) return modelo
  const messages = [...modelo.messages]
  const [msg] = messages.splice(de, 1)
  const at = Math.max(0, Math.min(destino, messages.length))
  messages.splice(at, 0, msg)
  return { ...modelo, messages, ...remapearIndices(modelo, messages) }
}

/** Reconecta a ponta de origem ou de destino de uma mensagem. */
export function reconectarMensagem(modelo, id, { from, to }) {
  return {
    ...modelo,
    messages: modelo.messages.map((m) =>
      m.id === id
        ? {
            ...m,
            from: from ?? m.from,
            to: to ?? m.to,
            arrow: (from ?? m.from) === (to ?? m.to) ? 'self' : m.arrow === 'self' ? 'solid' : m.arrow,
          }
        : m,
    ),
  }
}

/** Reordena as colunas de participantes. */
export function moverParticipante(modelo, id, destino) {
  const de = modelo.participants.findIndex((p) => p.id === id)
  if (de < 0 || de === destino) return modelo
  const participants = [...modelo.participants]
  const [p] = participants.splice(de, 1)
  participants.splice(Math.max(0, Math.min(destino, participants.length)), 0, p)
  return { ...modelo, participants }
}

// Ativações e fragmentos guardam índices de tempo. Quando a ordem das mensagens
// muda, esses índices precisam ser remapeados — a engine não sabe nada disso.
function remapearIndices(modelo, novasMensagens) {
  const posDe = new Map(novasMensagens.map((m, i) => [m.id, i]))
  const antes = modelo.messages
  const remap = (i) => {
    const msg = antes[Math.max(0, Math.min(i, antes.length - 1))]
    return msg && posDe.has(msg.id) ? posDe.get(msg.id) : Math.min(i, novasMensagens.length - 1)
  }
  const faixa = (o) => {
    const a = remap(o.from)
    const b = remap(o.to)
    return { ...o, from: Math.min(a, b), to: Math.max(a, b) }
  }
  return {
    activations: modelo.activations.map(faixa),
    fragments: modelo.fragments.map(faixa),
  }
}
