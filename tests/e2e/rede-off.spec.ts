import { test, expect, type Page } from '@playwright/test'

// Portão só-navegador (T050 / Princípio XIII): o ciclo principal roda sem NENHUMA
// requisição de rede além do próprio bundle (mesma origem). Sem backend, sem
// download de imagem, sem sincronização remota.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const botao = (page: Page) => page.locator('[data-testid=botao-copiar]')

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('o ciclo (criar/editar/copiar) não faz requisição externa em runtime', async ({ page }) => {
  const externas: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    // permitido: mesma origem (o bundle estático) e o protocolo data:
    if (url.origin !== 'http://localhost:5173' && !req.url().startsWith('data:')) {
      externas.push(req.url())
    }
  })

  await page.goto('/')
  await editor(page).fill('flowchart TD\nn1[A]')
  await page.waitForTimeout(90)
  await area(page).dblclick({ position: { x: 400, y: 300 } })
  await page.waitForTimeout(60)
  await botao(page).click()
  await page.waitForTimeout(60)

  expect(externas, `requisições externas: ${externas.join(', ')}`).toEqual([])
})
