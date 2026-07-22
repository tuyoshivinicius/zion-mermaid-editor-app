// Registro da família flowchart no núcleo do codec. O R0 registra EXATAMENTE
// dois reconhecedores (cabeçalho + nó retangular) e o emissor de nó.
// (contracts/codec.md — `registrar('flowchart', […])`.)

import { registrar } from '../nucleo/reconhecedores'
import { reconhecedorCabecalho } from './cabecalho'
import { reconhecedorNoRetangular, emitirNo } from './no'

let registrado = false

export function registrarFlowchart(): void {
  if (registrado) return
  registrar('flowchart', {
    reconhecedores: [reconhecedorCabecalho, reconhecedorNoRetangular],
    emitir: emitirNo,
  })
  registrado = true
}

export { emitirNo } from './no'
