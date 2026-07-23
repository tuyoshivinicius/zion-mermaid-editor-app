// Registro da família flowchart no núcleo do codec. R1 registra CINCO reconhecedores
// na ordem em que a gramática exige (contracts/codec-grafo-dirigido.md):
//   cabeçalho → abre-subgraph → end → conexão → nó
// `end`/`subgraph` casam ANTES do nó (senão viram nó pelo identificador sozinho); a
// conexão casa antes do nó (o nó já rejeita tokens de link, mas a conexão os consome).

import { registrar } from '../nucleo/reconhecedores'
import { reconhecedorCabecalho } from './cabecalho'
import { reconhecedorAbreAgrupamento, reconhecedorFechaAgrupamento, emitirAgrupamentoAbre, emitirAgrupamentoFecha } from './agrupamento'
import { reconhecedorConexao, emitirConexao } from './conexao'
import { reconhecedorNoRetangular, emitirNo } from './no'

let registrado = false

export function registrarFlowchart(): void {
  if (registrado) return
  registrar('flowchart', {
    reconhecedores: [
      reconhecedorCabecalho,
      reconhecedorAbreAgrupamento,
      reconhecedorFechaAgrupamento,
      reconhecedorConexao,
      reconhecedorNoRetangular,
    ],
    emitir: emitirNo,
    emitirConexao,
    emitirAgrupamentoAbre,
    emitirAgrupamentoFecha,
  })
  registrado = true
}

export { emitirNo } from './no'
export { emitirConexao } from './conexao'
export { emitirAgrupamentoAbre, emitirAgrupamentoFecha } from './agrupamento'
