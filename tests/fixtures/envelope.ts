// O DOCUMENTO DO ENVELOPE — 390 nós, 500 conexões e 10 agrupamentos (400
// elementos-nó), o envelope de densidade que o Princípio III declara.
//
// Vivia embutido em `tests/e2e/latencia-grafo.spec.ts`. Saiu de lá porque a spec
// 003 mede contra ELE em Vitest (`extensao`, `alvoAjustar`) e em Playwright (fps,
// resposta, e2e): dois geradores parecidos fariam `SC-003`, `SC-004`, `SC-005`,
// `SC-008` e `SC-012` medirem documentos diferentes sem que ninguém percebesse
// (research §1.1).

export const N_NOS = 390
export const N_GRUPOS = 10
export const N_CONEX = 500
/** Elementos-nó do envelope: nós + molduras de agrupamento. */
export const N_ELEMENTOS_NO = N_NOS + N_GRUPOS

/**
 * O envelope em arranjo DETERMINÍSTICO: os nós são declarados em sequência e a
 * colocação do R0 os põe em fila a partir de `ORIGEM`, com passo `ESPACO.dx`.
 * É essa fila que a conta do piso de zoom mede (research §1.1).
 */
export function documentoEnvelope(): string {
  const linhas = ['flowchart TD']
  for (let i = 1; i <= N_NOS; i++) linhas.push(`n${i}[Passo ${i}]`)
  for (let k = 0; k < N_CONEX; k++) {
    const a = (k % N_NOS) + 1
    const b = ((k + 1) % N_NOS) + 1
    linhas.push(`n${a} --> n${b}`)
  }
  for (let g = 1; g <= N_GRUPOS; g++) {
    const base = (g - 1) * 4 + 1
    linhas.push(`subgraph g${g}[Grupo ${g}]`)
    for (let j = 0; j < 4; j++) linhas.push(`  n${base + j}`)
    linhas.push('end')
  }
  return linhas.join('\n')
}
