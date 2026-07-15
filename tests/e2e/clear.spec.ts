import { expect, test } from '@playwright/test'

test.describe('US2 — clear the starter scaffold (SC-006)', () => {
  test('1 — clearing the untouched starter needs no confirmation and empties canvas and code', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('clear-button').click()

    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.getByTestId('code-input')).toHaveValue('')
    await expect(page.getByTestId('canvas-panel').getByText('Início', { exact: true })).not.toBeVisible()
  })

  test('2/3 — editing the starter requires confirmation; cancelling (button or Escape) leaves content untouched and returns focus', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')
    await codeInput.fill('flowchart TD\n  x[Meu] --> y[Trabalho]')

    const clearButton = page.getByTestId('clear-button')
    await clearButton.click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId('clear-dialog-cancel')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(codeInput).toHaveValue('flowchart TD\n  x[Meu] --> y[Trabalho]')
    await expect(clearButton).toBeFocused()

    await clearButton.click()
    await expect(dialog).toBeVisible()
    await page.getByTestId('clear-dialog-cancel').click()
    await expect(dialog).toHaveCount(0)
    await expect(codeInput).toHaveValue('flowchart TD\n  x[Meu] --> y[Trabalho]')
    await expect(clearButton).toBeFocused()
  })

  test('4 — after clearing, the starter does not return during the session', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('clear-button').click()
    await expect(page.getByTestId('code-input')).toHaveValue('')

    await page.getByTestId('new-node-label').fill('Qualquer')
    await page.getByTestId('add-node-button').click()
    await expect(page.getByTestId('code-input')).not.toContainText('Início')
  })

  test('5 — after clearing, the tool behaves like S0’s empty editor with no starter trace', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('clear-button').click()

    const codeInput = page.getByTestId('code-input')
    await codeInput.fill('flowchart TD\n  m[Manual] --> n[Novo]')
    const canvas = page.getByTestId('canvas-panel')
    await expect(canvas.getByText('Manual')).toBeVisible()
    await expect(canvas.getByText('Novo')).toBeVisible()
    await expect(codeInput).not.toContainText('inicio')
  })

  test('6 — clear completion is announced to assistive technology', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('clear-button').click()
    await expect(page.getByRole('status')).toContainText('diagrama limpo')
  })

  test('7 — non-parseable text typed over the starter requires confirmation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('code-input').fill('not mermaid at all !!')
    await expect(page.getByRole('status')).toContainText('não interpretável')

    await page.getByTestId('clear-button').click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
  })

  test('8 — clearing with a pending connect source leaves no implicit starter node when new nodes are connected', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('connect-mode-button').click()
    await page.getByTestId('rf__node-inicio').click()
    await expect(page.locator('[data-connect-source="true"]')).toBeVisible()

    await page.getByTestId('clear-button').click()
    await expect(page.getByTestId('code-input')).toHaveValue('')

    await page.getByTestId('new-node-label').fill('Um')
    await page.getByTestId('add-node-button').click()
    await page.getByTestId('new-node-label').fill('Dois')
    await page.getByTestId('add-node-button').click()

    await page.getByTestId('connect-mode-button').click()
    await page.getByTestId('rf__node-um').click()
    await page.getByTestId('rf__node-dois').click()

    const codeInput = page.getByTestId('code-input')
    await expect(codeInput).toHaveValue(/um --> dois/)
    await expect(codeInput).not.toContainText('inicio')
    await expect(codeInput).not.toContainText('revisar')
  })

  test('9 — clearing while a parse is in flight leaves canvas and code empty and they stay empty', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    await codeInput.fill('flowchart TD\n  z[Zeta] --> w[Omega]')
    await page.getByTestId('clear-button').click()
    await page.getByTestId('clear-dialog-confirm').click()

    await expect(codeInput).toHaveValue('')
    await page.waitForTimeout(300)
    await expect(codeInput).toHaveValue('')
    await expect(page.getByTestId('canvas-panel').getByText('Zeta')).not.toBeVisible()
  })

  test('10 — clearing mid-rename does not swallow keystrokes for nodes created afterwards', async ({ page }) => {
    await page.goto('/')
    const revisarNode = page.getByTestId('rf__node-revisar')
    await revisarNode.click()
    await revisarNode.press('Enter')
    await page.keyboard.type('Parcial')

    await page.getByTestId('clear-button').click()
    await expect(page.getByTestId('code-input')).toHaveValue('')

    await page.getByTestId('new-node-label').fill('Fresco')
    await page.getByTestId('add-node-button').click()
    const freshNode = page.getByTestId('rf__node-fresco')
    await freshNode.click()
    await freshNode.press('Enter')
    await page.keyboard.type('Editado')
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('code-input')).toHaveValue(/editado\[Editado\]/)
  })
})
