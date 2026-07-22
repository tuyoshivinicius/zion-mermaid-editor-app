// O store único de sessão (ADR-003). Slots: modelo (a única verdade estrutural),
// arranjo (efêmero: posição por id), contador (efêmero), textoEditor (a vista do
// editor — texto da pessoa). Semeia `flowchart TD` UMA vez e faz o parse inicial
// (modelo vazio, FR-019). Toda mutação atravessa uma transação e carrega a ORIGEM
// (canvas | editor) para quebrar o eco entre as vistas (ADR-003).

import { create } from 'zustand'
import type { Modelo, No } from './modelo'
import { Arranjo, materializarPosicoes } from './arranjo'
import type { Pos } from './arranjo'
import { Contador } from './contador'
import { Historico } from './transacao'
import type { Origem } from './transacao'
import { projetar } from '../projecao/projetar'
import type { Projecao } from '../projecao/projetar'
import { analisar, appendLinhaNoFim, normalizarCabecalhoParaCopia } from '../codec'

export const SEMENTE = 'flowchart TD'

export interface SinalRevelar {
  linha: number
  seq: number
}

export interface EstadoSessao {
  // as quatro fatias do store (data-model.md)
  modelo: Modelo
  arranjo: Arranjo
  contador: Contador
  textoEditor: string
  // derivado + costura
  projecao: Projecao
  historico: Historico
  ultimaOrigem: Origem | null
  revelar: SinalRevelar | null
  // ações (cada uma é uma transação)
  criarNo(ponto: Pos): void
  aplicarTexto(texto: string): void
  moverNo(id: string, para: Pos): void
  copiar(): Promise<'copiado' | 'falhou'>
}

/** Cria um store de sessão isolado (fresco). O app usa o singleton `useSessao`;
 *  os testes criam o seu para não compartilharem estado. */
export function criarSessaoStore() {
  return create<EstadoSessao>((set, get) => {
  const arranjo = new Arranjo()
  const contador = new Contador()
  const historico = new Historico()

  // Deriva modelo + posições a partir do texto (o caminho texto→modelo ao vivo).
  function derivar(texto: string): Modelo {
    const { modelo } = analisar(texto)
    const ids = modelo.nos.map((n) => n.id)
    contador.observar(ids)
    materializarPosicoes(arranjo, ids)
    return modelo
  }

  // Como derivar, mas detecta renomeio de id (FR-018): um id que sai + um que
  // entra → transfere a lembrança de arranjo (o nó fica no mesmo lugar).
  function derivarComRenomeio(texto: string, anterior: Modelo): Modelo {
    const { modelo } = analisar(texto)
    const antigos = new Set(anterior.nos.map((n) => n.id))
    const novos = new Set(modelo.nos.map((n) => n.id))
    const sumidos = [...antigos].filter((id) => !novos.has(id))
    const surgidos = [...novos].filter((id) => !antigos.has(id))
    if (sumidos.length === 1 && surgidos.length === 1) {
      arranjo.transferir(sumidos[0], surgidos[0])
    }
    const ids = modelo.nos.map((n) => n.id)
    contador.observar(ids)
    materializarPosicoes(arranjo, ids)
    return modelo
  }

  // A fronteira transacional: NINGUÉM escreve no modelo fora daqui (Princípio IV).
  function commit(origem: Origem, coalescerCom: string | null, textoEditor: string, modelo: Modelo): void {
    const projecao = projetar(modelo, arranjo)
    historico.registrar(
      { origem, textoEditor, modelo, arranjo: new Map(arranjo.porId) },
      coalescerCom,
    )
    set({ textoEditor, modelo, projecao, ultimaOrigem: origem })
  }

  const modeloInicial = derivar(SEMENTE) // seed, parse inicial (modelo vazio)

  return {
    modelo: modeloInicial,
    arranjo,
    contador,
    historico,
    textoEditor: SEMENTE,
    projecao: projetar(modeloInicial, arranjo),
    ultimaOrigem: null,
    revelar: null,

    // US1 — o nó nasce e a linha aparece (ida).
    criarNo(ponto: Pos) {
      const { modelo, textoEditor } = get()
      const ocupados = new Set(modelo.nos.map((n) => n.id))
      const { id, rotulo } = contador.emitir(ocupados)
      arranjo.gravar(id, ponto) // nasce no ponto clicado (US1-1)
      const no: No = { id, rotulo, alertas: [] } // nasce neutro (Princípio XIV)
      const novoTexto = appendLinhaNoFim(textoEditor, no) // append cirúrgico (FR-017)
      const m2 = derivar(novoTexto)
      historico.encerrarRajada()
      commit('canvas', null, novoTexto, m2)
      const linha = novoTexto.split('\n').length - 1
      set({ revelar: { linha, seq: (get().revelar?.seq ?? 0) + 1 } })
    },

    // US2 — escrevo no código e o diagrama acompanha (volta).
    aplicarTexto(texto: string) {
      const anterior = get().modelo
      const m2 = derivarComRenomeio(texto, anterior)
      commit('editor', 'editor-digitacao', texto, m2) // rajada coalesce (SC-007)
    },

    // US3 — arrasto o nó (posição é efêmera; zero bytes no editor).
    moverNo(id: string, para: Pos) {
      const { modelo, textoEditor } = get()
      arranjo.gravar(id, para)
      historico.encerrarRajada()
      commit('canvas', null, textoEditor, modelo) // textoEditor byte-idêntico (SC-004)
    },

    // US3 — copiar o produto final, limpo e válido.
    async copiar() {
      const texto = normalizarCabecalhoParaCopia(get().textoEditor)
      try {
        await navigator.clipboard.writeText(texto)
        return 'copiado'
      } catch {
        return 'falhou'
      }
    },
    }
  })
}

/** O store único de sessão do app (singleton). */
export const useSessao = criarSessaoStore()
