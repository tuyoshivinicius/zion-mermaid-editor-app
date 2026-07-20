// O rascunho que sobrevive a fechar a aba — a única linha do `### Faz` do
// discovery que nenhum dos nove ADRs anteriores tocou.
//
//   "Recuperar o rascunho em curso ao reabrir a aba."
//   "Não é um repositório de diagramas — sem contas, sem biblioteca, sem pastas.
//    O rascunho em curso sobrevive a fechar e reabrir a aba como **rede de
//    segurança**, não como arquivo."
//
// Rede de segurança tem duas obrigações que um arquivo não tem: nunca custar
// caro no caminho da edição, e **nunca derrubar o app** quando o que está
// gravado não presta. As duas são medidas aqui.
//
// A pergunta de forma é a que decide: o discovery diz que a posição **não viaja
// no código** (ADR-003/007), mas também diz que ela é conforto de sessão. Se o
// rascunho for o código mermaid, a sessão volta sem as posições que a pessoa
// arrumou. Se for o modelo mais as posições, volta inteira — e passa a existir
// um segundo formato de persistência, com versão para manter.

export const CHAVE = 'zion.rascunho'
export const VERSAO = 1

/**
 * Os dois formatos em disputa.
 *
 * - `texto`  — o código mermaid canônico. É o produto final da Marina, é o que
 *              ela copiaria de qualquer jeito, e não tem formato próprio a
 *              versionar. Perde a posição, por construção.
 * - `modelo` — o modelo interno mais as posições da sessão, em JSON. Volta
 *              inteiro; em troca, cria um formato próprio que precisa de versão
 *              e de tolerância a lixo.
 */
export function empacotar(estado, formato, serializar) {
  if (formato === 'texto') return serializar(estado.modelo)
  return JSON.stringify({ versao: VERSAO, modelo: estado.modelo, posicoes: estado.posicoes })
}

/**
 * A volta. Devolve `{ estado, aviso }` — nunca lança.
 *
 * Um rascunho ilegível é uma sessão perdida; um rascunho ilegível que **derruba
 * o app** é uma sessão perdida toda vez que a pessoa abre a aba, até ela
 * descobrir sozinha como limpar o navegador. A rede de segurança tem que falhar
 * para o lado de não existir.
 */
export function desempacotar(cru, formato, analisar) {
  if (cru == null || cru === '') return { estado: null, aviso: 'sem rascunho' }
  try {
    if (formato === 'texto') {
      const modelo = analisar(cru).modelo
      return { estado: { modelo, posicoes: {} }, aviso: null }
    }
    const dados = JSON.parse(cru)
    if (!dados || typeof dados !== 'object') return { estado: null, aviso: 'rascunho não é um objeto' }
    if (dados.versao !== VERSAO) return { estado: null, aviso: `versão ${dados.versao} desconhecida (atual ${VERSAO})` }
    if (!dados.modelo || typeof dados.modelo !== 'object') return { estado: null, aviso: 'rascunho sem modelo' }
    return { estado: { modelo: dados.modelo, posicoes: dados.posicoes || {} }, aviso: null }
  } catch (e) {
    return { estado: null, aviso: `rascunho ilegível: ${String((e && e.message) || e).slice(0, 80)}` }
  }
}

/**
 * O braço síncrono. `localStorage` é a escolha óbvia para um produto sem
 * servidor (ADR-001), e é **bloqueante**: escrever acontece na main thread, no
 * meio do caminho da tecla. Quanto isso custa no envelope do ADR-004 é a
 * medição que decide *quando* gravar.
 */
export const armazemSincrono = {
  nome: 'localStorage',
  gravar(chave, dados) {
    const t0 = performance.now()
    localStorage.setItem(chave, dados)
    return performance.now() - t0
  },
  ler(chave) {
    return localStorage.getItem(chave)
  },
  limpar(chave) {
    localStorage.removeItem(chave)
  },
}

/**
 * O braço assíncrono. Não é recomendação: é o controle que separa "gravar custa
 * caro" de "gravar **na main thread** custa caro". Se a diferença for grande, a
 * decisão de quando gravar muda de natureza.
 */
export const armazemAssincrono = {
  nome: 'IndexedDB',
  _db: null,
  async abrir() {
    if (this._db) return this._db
    this._db = await new Promise((res, rej) => {
      const req = indexedDB.open('zion-spike', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('rascunhos')
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    return this._db
  },
  async gravar(chave, dados) {
    const db = await this.abrir()
    const t0 = performance.now()
    await new Promise((res, rej) => {
      const tx = db.transaction('rascunhos', 'readwrite')
      tx.objectStore('rascunhos').put(dados, chave)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    return performance.now() - t0
  },
  async ler(chave) {
    const db = await this.abrir()
    return new Promise((res, rej) => {
      const req = db.transaction('rascunhos', 'readonly').objectStore('rascunhos').get(chave)
      req.onsuccess = () => res(req.result ?? null)
      req.onerror = () => rej(req.error)
    })
  },
}

/**
 * *Quando* gravar. Três políticas, e a diferença entre elas é o que a pessoa
 * sente na tecla.
 *
 * - `ato`       — a cada transação. A rede de segurança mais apertada possível,
 *                 e a que paga o custo dentro do gesto.
 * - `ocioso`    — espera a mão parar (janela de silêncio). Paga fora do gesto,
 *                 mas deixa uma janela de perda do tamanho da janela.
 * - `intervalo` — de tempos em tempos, aconteça o que acontecer. Custo previsível,
 *                 janela de perda previsível.
 */
export function criarAgendador({ politica = 'ocioso', janelaMs = 1000, intervaloMs = 5000, gravar }) {
  let timer = null
  let pendente = false
  let gravacoes = 0
  let ultimaMs = 0

  const executar = async (obter) => {
    pendente = false
    ultimaMs = await gravar(obter())
    gravacoes++
  }

  return {
    politica,
    /** Chamado depois de cada ato. `obter` devolve o que empacotar, sob demanda. */
    aoMudar(obter) {
      pendente = true
      if (politica === 'ato') return executar(obter)
      if (politica === 'ocioso') {
        clearTimeout(timer)
        timer = setTimeout(() => executar(obter), janelaMs)
        return
      }
      if (politica === 'intervalo' && timer == null) {
        timer = setInterval(() => {
          if (pendente) executar(obter)
        }, intervaloMs)
      }
    },
    parar() {
      clearTimeout(timer)
      clearInterval(timer)
      timer = null
    },
    estado: () => ({ gravacoes, ultimaMs: Math.round(ultimaMs * 100) / 100, pendente }),
  }
}
