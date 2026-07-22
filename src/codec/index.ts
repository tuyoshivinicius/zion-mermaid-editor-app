// Superfície pública do codec. Importar daqui registra a família flowchart uma
// vez (efeito de borda) e reexporta a superfície única `analisar`/`serializar`/
// `emitirNo`/`normalizar` + as escritas cirúrgicas.

import { registrarFlowchart } from './flowchart'

registrarFlowchart()

export { analisar } from './nucleo/analisar'
export type { Analise } from './nucleo/analisar'
export { serializar, normalizar } from './nucleo/serializar'
export type { ModeloNormalizado } from './nucleo/serializar'
export { emitirNo } from './flowchart/no'
export { appendLinhaNoFim, normalizarCabecalhoParaCopia } from './cirurgica'
export type { Achado } from './nucleo/reconhecedores'
