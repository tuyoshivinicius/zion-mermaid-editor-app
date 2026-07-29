// Tela única (ADR-001): área do diagrama | editor de código + botão copiar.
// R2 (spec 003): a casca passa a ser `AreaDeTrabalho` — as duas vistas e a divisão
// arrastável entre elas (`FR-006`). A página ganha rolagem horizontal: abaixo da
// soma dos mínimos das duas vistas, quem cede é ela (a regra está no `index.css`,
// junto das outras três que o CSS entrega sem JavaScript no `resize`).

import { AreaDeTrabalho } from './areatrabalho/AreaDeTrabalho'

export default function App() {
  return <AreaDeTrabalho />
}
