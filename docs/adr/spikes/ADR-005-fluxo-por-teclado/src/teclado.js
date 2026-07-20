// A máquina de estados do ciclo principal por teclado.
//
// O ciclo que o discovery chama de inegociável é `criar caixa -> escrever o
// rótulo -> conectar -> rotular a conexão`. Aqui ele é uma sequência de estados,
// e o custo em teclas por elemento é o número que o spike reporta:
//
//   c   -> entra em modo de conexão a partir do nó focado
//   n   -> nasce o nó já conectado, direto em edição de rótulo
//   ... -> o texto do rótulo do nó
//   Enter -> confirma e cai no rótulo da conexão
//   ... -> o texto do rótulo da conexão
//   Enter -> confirma; o foco fica no nó novo, pronto para repetir
//
// São 4 teclas de controle por elemento, fora o texto. Nenhuma delas é gesto de
// mouse, e nenhuma é primitiva da engine — este arquivo é código de produto.

import {
  conectar,
  criarNo,
  editarRotuloConexao,
  editarRotuloNo,
  removerNo,
  vazio,
} from './modelo.js'
import { COLS } from './projecao.js'

export function estadoInicial(modelo = vazio()) {
  return {
    modelo,
    modo: 'navegando',
    noFocado: modelo.nos.length ? modelo.nos[0].id : null,
    noEditando: null,
    conexaoEditando: null,
    origem: null,
    alvo: null,
    pendenteRotularConexao: null,
  }
}

const idx = (e, id) => e.modelo.nos.findIndex((n) => n.id === id)

function moverFoco(e, passo) {
  const nos = e.modelo.nos
  if (!nos.length) return e
  const atual = e.noFocado ? idx(e, e.noFocado) : 0
  const prox = Math.max(0, Math.min(nos.length - 1, atual + passo))
  return { ...e, noFocado: nos[prox].id }
}

function moverAlvo(e, passo) {
  const cands = e.modelo.nos.filter((n) => n.id !== e.origem)
  if (!cands.length) return e
  const atual = Math.max(0, cands.findIndex((n) => n.id === e.alvo))
  const prox = (atual + passo + cands.length) % cands.length
  return { ...e, alvo: cands[prox].id }
}

const SETAS = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }

export function reduzir(e, acao) {
  if (acao.tipo === 'texto') {
    if (e.modo === 'editando-no' && e.noEditando) {
      return { ...e, modelo: editarRotuloNo(e.modelo, e.noEditando, acao.valor) }
    }
    if (e.modo === 'editando-conexao' && e.conexaoEditando) {
      return { ...e, modelo: editarRotuloConexao(e.modelo, e.conexaoEditando, acao.valor) }
    }
    return e
  }

  const k = acao.key

  switch (e.modo) {
    case 'navegando': {
      if (k === 'n') {
        const { modelo, noId } = criarNo(e.modelo)
        return { ...e, modelo, modo: 'editando-no', noEditando: noId, noFocado: noId }
      }
      if (k === 'c' && e.noFocado) {
        const cands = e.modelo.nos.filter((n) => n.id !== e.noFocado)
        return {
          ...e,
          modo: 'conectando',
          origem: e.noFocado,
          alvo: cands.length ? cands[0].id : null,
        }
      }
      if (k === 'Enter' && e.noFocado) {
        return { ...e, modo: 'editando-no', noEditando: e.noFocado }
      }
      if (k === 'Delete' && e.noFocado) {
        const modelo = removerNo(e.modelo, e.noFocado)
        return { ...e, modelo, noFocado: modelo.nos.length ? modelo.nos[0].id : null }
      }
      if (k in SETAS) return moverFoco(e, SETAS[k])
      return e
    }

    case 'editando-no': {
      if (k === 'Enter') {
        if (e.pendenteRotularConexao) {
          return {
            ...e,
            modo: 'editando-conexao',
            conexaoEditando: e.pendenteRotularConexao,
            pendenteRotularConexao: null,
            noEditando: null,
          }
        }
        return { ...e, modo: 'navegando', noFocado: e.noEditando, noEditando: null }
      }
      if (k === 'Escape') {
        return { ...e, modo: 'navegando', noFocado: e.noEditando, noEditando: null }
      }
      return e
    }

    case 'conectando': {
      // O gesto do ciclo: o elemento novo nasce já conectado.
      if (k === 'n') {
        const { modelo, noId, conexaoId } = criarNo(e.modelo, { de: e.origem })
        return {
          ...e,
          modelo,
          modo: 'editando-no',
          noEditando: noId,
          noFocado: noId,
          origem: null,
          alvo: null,
          pendenteRotularConexao: conexaoId,
        }
      }
      if (k === 'Enter' && e.alvo) {
        const { modelo, conexaoId } = conectar(e.modelo, e.origem, e.alvo)
        return {
          ...e,
          modelo,
          modo: 'editando-conexao',
          conexaoEditando: conexaoId,
          noFocado: e.alvo,
          origem: null,
          alvo: null,
        }
      }
      if (k === 'Escape') return { ...e, modo: 'navegando', origem: null, alvo: null }
      if (k === 'Tab') return moverAlvo(e, 1)
      if (k in SETAS) return moverAlvo(e, SETAS[k] > 0 ? 1 : -1)
      return e
    }

    case 'editando-conexao': {
      if (k === 'Enter' || k === 'Escape') {
        const c = e.modelo.conexoes.find((x) => x.id === e.conexaoEditando)
        return {
          ...e,
          modo: 'navegando',
          conexaoEditando: null,
          noFocado: c ? c.para : e.noFocado,
        }
      }
      return e
    }

    default:
      return e
  }
}

/** Onde o foco do DOM precisa estar para cada modo. Lido pelo efeito da App. */
export function alvoDeFoco(e) {
  if (e.modo === 'editando-no' && e.noEditando) return `input-no-${e.noEditando}`
  if (e.modo === 'editando-conexao' && e.conexaoEditando) return `input-conexao-${e.conexaoEditando}`
  if (e.noFocado) return `no-${e.noFocado}`
  return 'palco'
}
