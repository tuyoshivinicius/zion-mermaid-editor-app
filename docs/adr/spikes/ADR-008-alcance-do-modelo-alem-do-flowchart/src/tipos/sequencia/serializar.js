// modelo interno -> mermaid (sequenceDiagram).
//
// A diferença de trabalho em relação às outras duas famílias está aqui, e é
// pequena de escrever justamente porque o modelo já guarda a ordem: serializar
// é **percorrer a árvore temporal**, não juntar conjuntos. O Flowchart do
// ADR-006 pode emitir nós, depois conexões, depois estilos, em qualquer ordem
// interna; aqui trocar duas linhas de lugar produz outro diagrama.

import { emitirPreambulo, emitirComentarios } from '../../nucleo/modelo.js'
import { codificarSemAspas } from '../../nucleo/rotulo.js'
import { SETAS } from './modelo.js'

export function serializar(m, { indentacao = '  ' } = {}) {
  const fora = emitirPreambulo(m, indentacao)
  fora.push('sequenceDiagram')
  fora.push(...emitirComentarios(m, indentacao))

  if (m.autonumber) fora.push(`${indentacao}autonumber`)

  for (const p of m.participantes) {
    const alias = p.rotulo != null ? ` as ${codificarSemAspas(p.rotulo).bruto}` : ''
    fora.push(`${indentacao}${p.papel} ${p.id}${alias}`)
  }

  fora.push(...emitirItens(m.corpo, indentacao, 1))
  return fora.join('\n')
}

function emitirItens(itens, ind, nivel) {
  const pad = ind.repeat(nivel)
  const fora = []
  for (const it of itens) {
    if (it.especie === 'bloco') {
      it.ramos.forEach((ramo, i) => {
        const palavra = i === 0 ? it.tipo : ramoExtra(it.tipo)
        const rotulo = ramo.rotulo ? ` ${codificarSemAspas(ramo.rotulo).bruto}` : ''
        fora.push(`${pad}${palavra}${rotulo}`)
        fora.push(...emitirItens(ramo.itens, ind, nivel + 1))
      })
      fora.push(`${pad}end`)
      continue
    }
    if (it.especie === 'mensagem') {
      fora.push(pad + emitirMensagem(it))
      continue
    }
    if (it.especie === 'nota') {
      fora.push(`${pad}Note ${it.posicao} ${it.alvos.join(',')}: ${codificarSemAspas(it.texto ?? '').bruto}`)
      continue
    }
    fora.push(`${pad}${it.especie === 'ativacao' ? 'activate' : 'deactivate'} ${it.alvo}`)
  }
  return fora
}

const EXTRA = { alt: 'else', par: 'and', critical: 'option' }
function ramoExtra(tipo) {
  return EXTRA[tipo] || tipo
}

function emitirMensagem(msg) {
  const seta = SETAS.find(([, f]) => f.linha === msg.linha && f.ponta === msg.ponta)
  const token = seta ? seta[0] : '->>'
  const marca = msg.ativa ? '+' : msg.desativa ? '-' : ''
  const texto = msg.texto == null ? '' : codificarSemAspas(msg.texto).bruto
  return `${msg.de}${token}${marca}${msg.para}: ${texto}`
}
