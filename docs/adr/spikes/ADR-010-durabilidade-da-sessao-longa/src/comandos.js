// A camada que o ADR-003 decidiu **por pesquisa** e nunca rodou.
//
// O ADR-003 escreveu duas frases que este arquivo existe para executar:
//
//   "Desfazer sobre uma seleção inteira é um ato só, porque é uma transação no
//    modelo."
//   "O editor de código vira produtor de comandos, não dono de um histórico
//    rival — o que dissolve o conflito clássico entre a pilha de undo do editor
//    de texto e a do documento."
//
// Nenhuma das duas foi medida. O ADR-004 registrou o buraco com todas as letras:
// "o discovery promete que o ato sobre uma seleção inteira desfaz como um só — o
// custo desse ato em densidade alta não foi medido".
//
// Três invariantes herdadas entram aqui como restrição, não como estilo:
//
//   1. **Reuso do objeto** (ADR-004/005/006/008). Um ato sobre 10 de 400 nós
//      pode substituir 10 objetos, não 400. É a única variável que, sozinha,
//      move o veredito de latência de passa para reprova — então a transação
//      é escrita com compartilhamento estrutural, e `mapearAlvos` devolve o
//      **mesmo objeto** para quem não foi tocado.
//   2. **Sem coordenada no modelo** (ADR-003/004/007). Posição é estado de
//      sessão. Aqui isso obriga o estado a ter duas metades — `modelo` e
//      `posicoes` — e obriga a fazer a pergunta que o ADR-007 deixou aberta
//      ("dá para desfazer?"): as duas metades entram no mesmo histórico ou não?
//      O braço `posicaoNoHistorico` mede as duas respostas.
//   3. **Uma verdade só** (ADR-003/006). O editor de código não guarda estado
//      próprio: digitar emite o comando `documento`, e o desfazer que volta o
//      texto é o mesmo que volta o canvas.

import { analisar, serializar } from './registro.js'

const CAMPO_NOS = { flowchart: 'nos', classe: 'classes', sequencia: 'participantes' }
const CAMPO_LIGACOES = { flowchart: 'conexoes', classe: 'relacoes', sequencia: null }

export const tipoDe = (m) => m.tipo || 'flowchart'
export const nosDe = (m) => m[CAMPO_NOS[tipoDe(m)]]
export const idsDosNos = (m) => nosDe(m).map((n) => n.id)

const trocarNos = (m, lista) => ({ ...m, [CAMPO_NOS[tipoDe(m)]]: lista })

/** O estado completo da sessão: as duas metades, e só elas. */
export const estadoInicial = (texto) => ({
  modelo: analisar(texto).modelo,
  posicoes: {},
})

/**
 * O coração da transação: **um ato, N alvos, um registro de desfazer**.
 *
 * `antes` guarda só os campos que mudaram, dos nós que mudaram. É o que faz o
 * custo do registro ser O(alvos) e não O(documento) — a diferença que o braço
 * `historico=clone` existe para medir.
 */
function mapearAlvos(m, ids, mudar) {
  const alvos = new Set(ids)
  const antes = []
  let tocou = false
  const lista = nosDe(m).map((n) => {
    if (!alvos.has(n.id)) return n // <- reuso do objeto: a invariante do ADR-004
    const campos = mudar(n)
    if (!campos) return n
    antes.push({ id: n.id, campos: Object.fromEntries(Object.keys(campos).map((k) => [k, n[k]])) })
    tocou = true
    return { ...n, ...campos }
  })
  return { modelo: tocou ? trocarNos(m, lista) : m, antes }
}

function restaurarCampos(m, antes) {
  const porId = new Map(antes.map((a) => [a.id, a.campos]))
  if (!porId.size) return m
  return trocarNos(
    m,
    nosDe(m).map((n) => (porId.has(n.id) ? { ...n, ...porId.get(n.id) } : n)),
  )
}

/** Um nó novo, no vocabulário de cada família. */
function novoNo(m, id, rotulo) {
  switch (tipoDe(m)) {
    case 'classe':
      return { id, generico: null, rotulo, anotacao: null, membros: [], classesCss: [], estilo: null, alertas: [] }
    case 'sequencia':
      return { id, rotulo, papel: 'participant', alertas: [] }
    default:
      return { id, rotulo, forma: 'retangulo', classes: [], estilo: null, alertas: [] }
  }
}

/**
 * Os comandos. Cada um é uma transação: aplicar devolve o estado novo e o
 * bastante para desfazer; desaplicar devolve o estado anterior.
 *
 * `repetivel` marca o que a linha do discovery *"repetir a última alteração em
 * outro elemento, sem refazer o caminho até o controle"* consegue reexecutar
 * noutro alvo — o comando guarda o **valor**, não o caminho até o controle.
 */
export const COMANDOS = {
  /** O ato em bloco do discovery: uma alteração, uma seleção inteira. */
  rotular: {
    descricao: 'rotular seleção',
    repetivel: true,
    aplicar: (e, arg) => {
      const r = mapearAlvos(e.modelo, arg.ids, (n) =>
        // Duas mudanças de campo dentro do mesmo ato: no Flowchart um nó sem
        // forma não emite rótulo nenhum (`emitirNo` devolve só o id), então
        // rotular obriga a dar forma. É a prova mais barata de que a transação
        // não é "um campo por vez".
        tipoDe(e.modelo) === 'flowchart' && n.forma === 'nenhuma'
          ? { rotulo: arg.valor, forma: 'retangulo' }
          : { rotulo: arg.valor },
      )
      return { estado: { ...e, modelo: r.modelo }, antes: r.antes }
    },
    desaplicar: (e, antes) => ({ ...e, modelo: restaurarCampos(e.modelo, antes) }),
  },

  /** Trocar o shape de uma seleção — o outro ato em bloco nomeado no discovery. */
  forma: {
    descricao: 'trocar shape da seleção',
    repetivel: true,
    aplicar: (e, arg) => {
      const r = mapearAlvos(e.modelo, arg.ids, () => ({ forma: arg.valor }))
      return { estado: { ...e, modelo: r.modelo }, antes: r.antes }
    },
    desaplicar: (e, antes) => ({ ...e, modelo: restaurarCampos(e.modelo, antes) }),
  },

  criar: {
    descricao: 'criar nó',
    aplicar: (e, arg) => ({
      estado: { ...e, modelo: trocarNos(e.modelo, [...nosDe(e.modelo), novoNo(e.modelo, arg.id, arg.rotulo ?? null)]) },
      antes: { ids: [arg.id] },
    }),
    desaplicar: (e, antes) => ({
      ...e,
      modelo: trocarNos(
        e.modelo,
        nosDe(e.modelo).filter((n) => !antes.ids.includes(n.id)),
      ),
    }),
  },

  /**
   * O ato que toca **dois agregados**: tirar um nó tira as ligações que o citam.
   * Se a transação valesse só para um agregado, é aqui que ela vazaria — o
   * desfazer devolveria o nó e deixaria as ligações para trás.
   */
  remover: {
    descricao: 'remover seleção',
    aplicar: (e, arg) => {
      const m = e.modelo
      const campoLig = CAMPO_LIGACOES[tipoDe(m)]
      const alvos = new Set(arg.ids)
      const nosAntes = []
      const nos = nosDe(m).filter((n, i) => {
        if (!alvos.has(n.id)) return true
        nosAntes.push({ indice: i, no: n })
        return false
      })
      let modelo = trocarNos(m, nos)
      const ligAntes = []
      if (campoLig) {
        const ligacoes = m[campoLig].filter((l, i) => {
          if (!alvos.has(l.de) && !alvos.has(l.para)) return true
          ligAntes.push({ indice: i, ligacao: l })
          return false
        })
        modelo = { ...modelo, [campoLig]: ligacoes }
      }
      return { estado: { ...e, modelo }, antes: { nosAntes, ligAntes, campoLig } }
    },
    desaplicar: (e, antes) => {
      const m = e.modelo
      const nos = [...nosDe(m)]
      for (const { indice, no } of antes.nosAntes) nos.splice(indice, 0, no)
      let modelo = trocarNos(m, nos)
      if (antes.campoLig) {
        const ligacoes = [...m[antes.campoLig]]
        for (const { indice, ligacao } of antes.ligAntes) ligacoes.splice(indice, 0, ligacao)
        modelo = { ...modelo, [antes.campoLig]: ligacoes }
      }
      return { ...e, modelo }
    },
  },

  /**
   * O editor de código como **produtor de comando**. É a frase do ADR-003 virada
   * executável: digitar não mantém pilha própria; emite um comando cujo inverso
   * é o modelo anterior inteiro.
   *
   * Um texto novo não é um patch de campo — não há como registrar "o que mudou"
   * sem reanalisar. Então este comando é, por natureza, do tamanho do documento;
   * é exatamente por isso que a **coalescência** existe.
   */
  documento: {
    descricao: 'editar código',
    aplicar: (e, arg) => ({
      estado: { ...e, modelo: arg.modelo ?? analisar(arg.texto).modelo },
      antes: e.modelo,
    }),
    desaplicar: (e, antes) => ({ ...e, modelo: antes }),
  },

  /**
   * A outra metade do estado: posição é conforto de sessão (ADR-003/007), não
   * viaja no código. Entra no histórico só quando `posicaoNoHistorico` está
   * ligado — o braço que responde à pergunta que o ADR-007 deixou aberta.
   */
  mover: {
    descricao: 'mover nó',
    sessao: true,
    aplicar: (e, arg) => ({
      estado: { ...e, posicoes: { ...e.posicoes, [arg.id]: arg.para } },
      antes: { id: arg.id, para: e.posicoes[arg.id] ?? null },
    }),
    desaplicar: (e, antes) => {
      const posicoes = { ...e.posicoes }
      if (antes.para == null) delete posicoes[antes.id]
      else posicoes[antes.id] = antes.para
      return { ...e, posicoes }
    },
  },
}

const clonar = (x) => JSON.parse(JSON.stringify(x))

/**
 * O histórico, com os três modos que o spike compara.
 *
 * - `inverso`   — a entrada guarda só o que mudou (O(alvos)).
 * - `referencia`— a entrada guarda a **referência** do estado anterior. Como as
 *                 transações são imutáveis com compartilhamento estrutural, o
 *                 que fica retido é só o delta. Custa nada de escrita.
 * - `clone`     — a entrada guarda uma cópia profunda do modelo (O(documento)).
 *                 É o desenho ingênuo, e o braço de controle da memória.
 *
 * `limite` é o teto de entradas (0 = sem teto). Existe porque "histórico
 * ilimitado" é uma decisão de produto que custa memória numa sessão longa, e o
 * spike precisa medir o custo antes de alguém decidir.
 */
export function criarHistorico({
  modo = 'inverso',
  limite = 0,
  coalescer = true,
  janelaMs = 500,
  posicaoNoHistorico = true,
} = {}) {
  const pilha = []
  let futuro = []

  const entradaDe = (especie, arg, antes, estadoAntes, agora) => {
    if (modo === 'referencia') return { especie, arg, estadoAntes, agora }
    if (modo === 'clone') return { especie, arg, clone: clonar(estadoAntes.modelo), agora }
    return { especie, arg, antes, agora }
  }

  const h = {
    modo,
    pilha,
    aplicar(estado, especie, arg, { agora = Date.now() } = {}) {
      const cmd = COMANDOS[especie]
      const { estado: novo, antes } = cmd.aplicar(estado, arg)

      if (cmd.sessao && !posicaoNoHistorico) return novo // aplica e não registra

      futuro = []

      // Coalescência: uma rajada de teclas é **um** ato. Sem isso, desfazer
      // devolve caractere por caractere — a pilha rival que o ADR-003 disse
      // ter dissolvido, reaparecendo por outra porta.
      const ultimo = pilha[pilha.length - 1]
      if (
        coalescer &&
        especie === 'documento' &&
        ultimo &&
        ultimo.especie === 'documento' &&
        agora - ultimo.agora <= janelaMs
      ) {
        ultimo.agora = agora // estende a rajada; o `antes` continua o do início dela
        return novo
      }

      pilha.push(entradaDe(especie, arg, antes, estado, agora))
      if (limite > 0 && pilha.length > limite) pilha.shift()
      return novo
    },

    desfazer(estado) {
      const e = pilha.pop()
      if (!e) return estado
      const anterior =
        modo === 'referencia'
          ? e.estadoAntes
          : modo === 'clone'
            ? { ...estado, modelo: e.clone }
            : COMANDOS[e.especie].desaplicar(estado, e.antes)
      futuro.push({ ...e, estadoDepois: estado })
      return anterior
    },

    refazer(estado) {
      const e = futuro.pop()
      if (!e) return estado
      pilha.push(e)
      return e.estadoDepois
    },

    podeDesfazer: () => pilha.length > 0,
    podeRefazer: () => futuro.length > 0,
    tamanho: () => pilha.length,
    /** O último ato que a linha "repetir a última alteração" consegue reexecutar. */
    ultimoRepetivel() {
      for (let i = pilha.length - 1; i >= 0; i--) {
        if (COMANDOS[pilha[i].especie].repetivel) return { especie: pilha[i].especie, arg: pilha[i].arg }
      }
      return null
    },
    /**
     * Tamanho lógico da pilha. Só faz sentido nos modos que **materializam** o
     * que guardam: no modo `referencia` o que está retido é compartilhado com o
     * estado vivo, e serializar contaria o mesmo objeto muitas vezes. Ali quem
     * responde é o heap do navegador, não este número.
     */
    bytesLogicos() {
      if (modo === 'referencia') return null
      return pilha.reduce((s, e) => s + JSON.stringify(modo === 'clone' ? e.clone : e.antes).length, 0)
    },
  }
  return h
}

/** Repete o último ato repetível noutra seleção. */
export function repetir(historico, estado, ids, opcoes) {
  const ultimo = historico.ultimoRepetivel()
  if (!ultimo) return { estado, feito: null }
  return {
    estado: historico.aplicar(estado, ultimo.especie, { ...ultimo.arg, ids }, opcoes),
    feito: ultimo,
  }
}

/** O código que a Marina copia — a outra vista do mesmo estado. */
export const codigoDe = (estado) => serializar(estado.modelo)
