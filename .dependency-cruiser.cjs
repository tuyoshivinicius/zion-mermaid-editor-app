/**
 * Checagem de fronteira de importação — os portões de arquitetura do R0.
 *
 * - Princípio X: nenhum módulo do caminho de edição importa `mermaid` (só teste/oráculo).
 * - Princípio IV: ninguém escreve no modelo fora da transação (esboço; a fronteira
 *   forte é a de importação de `mermaid` + o teste de transação).
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
        path: '^src/(modelo|projecao|canvas|editor|codec)',
      },
      to: {
        path: 'node_modules/mermaid',
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
