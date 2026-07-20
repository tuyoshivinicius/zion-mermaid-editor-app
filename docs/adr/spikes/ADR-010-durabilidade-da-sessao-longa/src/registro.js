// O ponto onde as três famílias viram uma coisa só para o resto do app.
//
// Se o modelo único do ADR-003 se estende, é esta interface que prova: canvas,
// editor de código e instrumentação falam com `analisar`/`serializar`/
// `normalizar` sem saber de que tipo é o documento. O que cada família tem de
// próprio fica atrás dela.

import * as flowchartModelo from './tipos/flowchart/modelo.js'
import { analisar as analisarFlowchart } from './tipos/flowchart/parser.js'
import { serializar as serializarFlowchart } from './tipos/flowchart/serializar.js'

import * as classeModelo from './tipos/classe/modelo.js'
import { analisar as analisarClasse } from './tipos/classe/parser.js'
import { serializar as serializarClasse } from './tipos/classe/serializar.js'

import * as sequenciaModelo from './tipos/sequencia/modelo.js'
import { analisar as analisarSequencia } from './tipos/sequencia/parser.js'
import { serializar as serializarSequencia } from './tipos/sequencia/serializar.js'

export const TIPOS = {
  flowchart: {
    rotulo: 'Flowchart',
    familia: 'grafo dirigido',
    analisar: analisarFlowchart,
    serializar: serializarFlowchart,
    normalizar: flowchartModelo.normalizar,
    vazio: flowchartModelo.vazio,
    gerarDensoTexto: flowchartModelo.gerarDensoTexto,
    // A vista genérica: o que o canvas desenha, sem saber de que família é.
    vista: (m) => ({
      nos: m.nos.map((n) => ({ id: n.id, rotulo: n.rotulo ?? n.id, linhas: [], marcado: n.alertas.length > 0 })),
      ligacoes: m.conexoes.map((c) => ({ id: c.id, de: c.de, para: c.para, rotulo: c.rotulo })),
    }),
    // O agregado cuja ordem o braço de permutação testa.
    agregado: (m) => m.conexoes,
    permutar: (m) => ({ ...m, conexoes: [...m.conexoes].reverse() }),
    contar: (m) => ({ nos: m.nos.length, ligacoes: m.conexoes.length }),
  },
  classe: {
    rotulo: 'Class',
    familia: 'nós estruturados',
    analisar: analisarClasse,
    serializar: serializarClasse,
    normalizar: classeModelo.normalizar,
    vazio: classeModelo.vazio,
    gerarDensoTexto: classeModelo.gerarDensoTexto,
    // O nó estruturado aparece aqui: `linhas` é o corpo da classe, e é o campo
    // que o Flowchart não tem.
    vista: (m) => ({
      nos: m.classes.map((c) => ({
        id: c.id,
        rotulo: c.rotulo ?? c.id,
        linhas: [
          ...(c.anotacao ? [`<<${c.anotacao}>>`] : []),
          ...c.membros.map((mb) => `${mb.visibilidade ?? ''}${mb.corpo}${mb.classificador ?? ''}`),
        ],
        marcado: c.alertas.length > 0,
      })),
      ligacoes: m.relacoes.map((r) => ({ id: r.id, de: r.de, para: r.para, rotulo: r.rotulo })),
    }),
    agregado: (m) => m.relacoes,
    permutar: (m) => ({ ...m, relacoes: [...m.relacoes].reverse() }),
    contar: (m) => ({ nos: m.classes.length, ligacoes: m.relacoes.length }),
  },
  sequencia: {
    rotulo: 'Sequence',
    familia: 'sequência temporal',
    analisar: analisarSequencia,
    serializar: serializarSequencia,
    normalizar: sequenciaModelo.normalizar,
    vazio: sequenciaModelo.vazio,
    gerarDensoTexto: sequenciaModelo.gerarDensoTexto,
    // As mensagens saem **em ordem**: a vista herda a ordem do modelo, e é ela
    // que o canvas usaria como índice de tempo.
    vista: (m) => {
      const msgs = sequenciaModelo.eventosEmOrdem(m).filter((e) => e.especie === 'mensagem')
      return {
        nos: m.participantes.map((p) => ({
          id: p.id,
          rotulo: p.rotulo ?? p.id,
          linhas: [p.papel],
          marcado: p.alertas.length > 0,
        })),
        ligacoes: msgs.map((msg, i) => ({
          id: `m${i + 1}`,
          de: msg.de,
          para: msg.para,
          rotulo: msg.texto,
          instante: i,
        })),
      }
    },
    agregado: (m) => m.corpo,
    permutar: (m) => ({ ...m, corpo: [...m.corpo].reverse() }),
    contar: (m) => ({
      nos: m.participantes.length,
      ligacoes: sequenciaModelo.contarMensagens(m),
    }),
  },
}

const RE_TIPO = [
  [/^classDiagram(-v2)?\b/i, 'classe'],
  [/^sequenceDiagram\b/i, 'sequencia'],
  [/^(flowchart|graph)\b/i, 'flowchart'],
]

/** Qual família o documento declara, lida da primeira linha útil. */
export function detectar(texto) {
  let corpo = texto
  const fm = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/.exec(corpo)
  if (fm) corpo = corpo.slice(fm[0].length)
  for (const crua of corpo.split(/\r?\n/)) {
    const linha = crua.trim()
    if (!linha || linha.startsWith('%%')) continue
    for (const [re, tipo] of RE_TIPO) if (re.test(linha)) return tipo
    return null
  }
  return null
}

/** A superfície única: o resto do app não sabe de que tipo é o documento. */
export function analisar(texto, opcoes = {}) {
  const tipo = detectar(texto) || 'flowchart'
  const t = TIPOS[tipo]
  const r = t.analisar(texto, opcoes)
  return { tipo, ...r }
}

export function serializar(modelo, opcoes = {}) {
  return TIPOS[modelo.tipo || 'flowchart'].serializar(modelo, opcoes)
}

export function normalizar(modelo) {
  return TIPOS[modelo.tipo || 'flowchart'].normalizar(modelo)
}

export function contar(modelo) {
  return TIPOS[modelo.tipo || 'flowchart'].contar(modelo)
}

export function vista(modelo) {
  return TIPOS[modelo.tipo || 'flowchart'].vista(modelo)
}
