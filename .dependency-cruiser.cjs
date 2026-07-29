/**
 * Checagem de fronteira de importação — os portões de arquitetura do R0.
 *
 * - Princípio X: nenhum módulo do caminho de edição importa `mermaid` (só teste/oráculo).
 * - Princípio IV: ninguém escreve no modelo fora da transação. Para a área de trabalho
 *   (spec 003) isso é EXECUTÁVEL, não disciplinar: nenhum gesto dela abre transação,
 *   e a regra abaixo proíbe até o caminho até `commit()` (FR-014 / SC-009).
 * - Princípio XII: o núcleo do codec (`src/codec/nucleo`) não referencia nomes de família
 *   (verificado também por grep no teste `nucleo-sem-familia`).
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'sem-mermaid-no-caminho-de-edicao',
      comment:
        'Princípio X — mermaid entra só como oráculo de teste; nenhum módulo de runtime o importa.',
      severity: 'error',
      from: {
        path: '^src/(modelo|projecao|canvas|editor|codec|areatrabalho)',
      },
      to: {
        path: 'node_modules/mermaid',
      },
    },
    {
      name: 'sem-transacao-na-area-de-trabalho',
      comment:
        'Princípio IV / FR-014 — nenhum gesto da área de trabalho abre transação. As ações do ' +
        'slot escrevem por set() direto, FORA de commit(), irmãs de `revelar`: não é filtragem ' +
        'do histórico, é ausência de entrada para filtrar.',
      severity: 'error',
      from: {
        path: '^src/areatrabalho',
      },
      to: {
        path: '^src/modelo/transacao',
      },
    },
    {
      name: 'nucleo-nao-conhece-familia',
      comment:
        'Princípio XII — o núcleo do codec não depende de um módulo de família (flowchart/…).',
      severity: 'error',
      from: {
        path: '^src/codec/nucleo',
      },
      to: {
        path: '^src/codec/(flowchart|class|state|sequence|er)',
      },
    },
    {
      name: 'nao-ha-orfaos',
      comment: 'Higiene: módulo sem quem o importe é morto.',
      severity: 'warn',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', 'main\\.tsx$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '(^tests|\\.test\\.tsx?$)' },
  },
}
