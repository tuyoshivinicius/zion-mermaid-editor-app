import { expect, test } from '@playwright/test'

const OWN_FLOWCHART = 'flowchart TD\n  meu[Meu] --> proprio[Próprio]'

test.describe('US3 — pasting over the starter leaves zero starter residue (SC-007)', () => {
  test('replacing the whole panel text shows only the pasted diagram, on canvas and in code', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')
    const codeInput = page.getByTestId('code-input')

    await codeInput.fill(OWN_FLOWCHART)

    await expect(codeInput).toHaveValue(OWN_FLOWCHART)
    await expect(codeInput).not.toContainText('inicio')
    await expect(codeInput).not.toContainText('aprovado')

    await expect(canvas.getByText('Meu')).toBeVisible()
    await expect(canvas.getByText('Próprio')).toBeVisible()
    await expect(canvas.getByText('Início', { exact: true })).not.toBeVisible()
    await expect(canvas.getByText('Aprovado?', { exact: true })).not.toBeVisible()
  })

  test('editing via the canvas after the paste never reintroduces a starter element', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')
    const codeInput = page.getByTestId('code-input')

    await codeInput.fill(OWN_FLOWCHART)
    await expect(canvas.getByText('Próprio')).toBeVisible()

    await page.getByTestId('new-node-label').fill('Extra')
    await page.getByTestId('add-node-button').click()

    await expect(codeInput).toHaveValue(/extra\[Extra\]/)
    await expect(codeInput).not.toContainText('inicio')
    await expect(codeInput).not.toContainText('revisar')
    await expect(codeInput).not.toContainText('aprovado')
    await expect(codeInput).not.toContainText('publicar')
    await expect(codeInput).not.toContainText('fim[Fim]')
  })
})
