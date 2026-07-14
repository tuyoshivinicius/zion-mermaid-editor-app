import { expect, test } from '@playwright/test'

test.describe('US2 — canvas edits sync to deterministic text', () => {
  test('add node + connect via canvas rewrites the text with the new node/edge', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    await page.getByTestId('new-node-label').fill('Start')
    await page.getByTestId('add-node-button').click()
    await page.getByTestId('new-node-label').fill('End')
    await page.getByTestId('add-node-button').click()
    await expect(codeInput).toHaveValue(/start\[Start\]/)
    await expect(codeInput).toHaveValue(/end_\[End\]/)

    await page.getByTestId('connect-mode-button').click()
    await expect(page.getByTestId('connect-mode-button')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('rf__node-start').click()
    await expect(page.locator('[data-connect-source="true"]')).toBeVisible()
    await page.getByTestId('rf__node-end_').click()

    await expect(codeInput).toHaveValue(/start --> end_/)
  })

  test('rename via canvas rewrites the node id in the text and its style refs', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    await page.getByTestId('new-node-label').fill('Original')
    await page.getByTestId('add-node-button').click()
    await expect(codeInput).toHaveValue(/original\[Original\]/)

    const node = page.getByTestId('rf__node-original')
    await node.click()
    await node.press('Enter')
    await page.keyboard.type('Renamed')
    await page.keyboard.press('Enter')

    await expect(codeInput).toHaveValue(/renamed\[Renamed\]/)
    await expect(codeInput).not.toContainText('original[Original]')
  })

  test('remove node via canvas deletes it and its dependent edges from the text', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    await page.getByTestId('new-node-label').fill('A')
    await page.getByTestId('add-node-button').click()
    await page.getByTestId('new-node-label').fill('B')
    await page.getByTestId('add-node-button').click()
    await page.getByTestId('connect-mode-button').click()
    await page.getByTestId('rf__node-a').click()
    await page.getByTestId('rf__node-b').click()
    await expect(codeInput).toHaveValue(/a --> b/)

    const nodeA = page.getByTestId('rf__node-a')
    await nodeA.click()
    await nodeA.press('Delete')

    await expect(codeInput).not.toContainText('a[A]')
    await expect(codeInput).not.toContainText('a --> b')
    await expect(codeInput).toHaveValue(/b\[B\]/)
  })

  test('editing text after a canvas edit updates the canvas without conflict', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')

    await page.getByTestId('new-node-label').fill('Only')
    await page.getByTestId('add-node-button').click()
    await expect(canvas.getByText('Only')).toBeVisible()

    await page.getByTestId('code-input').fill('flowchart TD\n  x[Manual] --> y[Edit]')
    await expect(canvas.getByText('Manual')).toBeVisible()
    await expect(canvas.getByText('Edit')).toBeVisible()
  })

  test('all five canvas actions are reachable keyboard-only', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    // Adicionar nó (Tab + Enter, no mouse)
    await page.getByTestId('new-node-label').focus()
    await page.keyboard.type('One')
    await page.keyboard.press('Enter')
    await page.getByTestId('new-node-label').focus()
    await page.keyboard.type('Two')
    await page.keyboard.press('Enter')
    await expect(codeInput).toHaveValue(/one\[One\]/)
    await expect(codeInput).toHaveValue(/two\[Two\]/)

    // Modo conectar (Tab + Enter) then select source/target nodes via Enter (no click)
    await page.getByTestId('connect-mode-button').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('connect-mode-button')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('rf__node-one').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-connect-source="true"]')).toBeVisible()
    await page.getByTestId('rf__node-two').focus()
    await page.keyboard.press('Enter')
    await expect(codeInput).toHaveValue(/one --> two/)

    // Renomear (Enter on focused node, type, Enter to commit)
    await page.getByTestId('rf__node-one').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.type('Uno')
    await page.keyboard.press('Enter')
    await expect(codeInput).toHaveValue(/uno\[Uno\]/)

    // Remover (Delete on focused node)
    await page.getByTestId('rf__node-two').focus()
    await page.keyboard.press('Delete')
    await expect(codeInput).not.toContainText('two[Two]')
  })
})
