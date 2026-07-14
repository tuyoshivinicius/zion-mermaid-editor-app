import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// Gate VI (Princípio VI): só src/core/mermaid-acl/ pode tocar a API interna do Mermaid.
// ADR-004: nenhum artefato Next.js/App Router pode aparecer no código.
const mermaidInternalApiRestriction = {
  paths: [
    {
      name: 'mermaid',
      importNames: ['default'],
      message:
        'Import the Mermaid internal API only inside src/core/mermaid-acl/ (Principle VI). Use the ACL module elsewhere.',
    },
  ],
  patterns: [
    {
      group: ['next', 'next/*'],
      message: 'This project is a Vite SPA (ADR-004) — Next.js imports are forbidden.',
    },
  ],
}

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': ['error', mermaidInternalApiRestriction],
    },
  },
  {
    files: ['src/core/mermaid-acl/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
)
