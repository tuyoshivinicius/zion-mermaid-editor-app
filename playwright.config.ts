import { defineConfig, devices } from '@playwright/test'

// Playwright cobre o navegador: as 3 histórias, o oráculo mermaid (SC-001), a
// latência (SC-003/SC-005) e a rede desligada (Princípio XIII).
//
// SERIAL, e por uma razão de portão: boa parte desta suíte MEDE — fps do gesto
// contínuo (`SC-003`), resposta de ajustar e resetar (`SC-012`), tecla e edição do R1
// (Princípio III). Com navegadores concorrendo pela máquina, o número medido é o da
// contenção, não o do produto: o mesmo arrasto da divisão deu 57fps sozinho e 40fps
// com quatro trabalhadores. O Princípio III cobra os três números medidos no envelope
// cheio, e um número medido sob disputa não fecha portão — nem para aprovar, nem para
// reprovar.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
