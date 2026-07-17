import { expect, test } from '@playwright/test'
import { strings } from '@/strings'

test.describe('US1 — write a connection label from the canvas (SC-001/002/003/005/011)', () => {
  test('selecting a connection and typing a label rewrites only that edge line, keyboard-only', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')
    const before = await codeInput.inputValue()

    // Select the Início -> Revisar edge (e0, no label yet) via keyboard
    // focus (FR-002d) — a coordinate-based click risks landing on a
    // different edge's overlapping hit area (dagre routes back-edges in
    // wide loops that can visually cover other edges).
    await page.getByTestId('rf__edge-e0').focus()

    const labelInput = page.getByLabel('Rótulo da conexão')
    await expect(labelInput).toBeVisible()
    await expect(labelInput).toHaveValue('')

    await labelInput.focus()
    await page.keyboard.type('Confirmado')

    await expect(codeInput).toHaveValue(/inicio -->\|Confirmado\| revisar/)

    const afterTyping = (await codeInput.inputValue()).split('\n')
    const beforeLines = before.split('\n')
    let changedLines = 0
    for (let i = 0; i < beforeLines.length; i++) {
      if (beforeLines[i] !== afterTyping[i]) changedLines += 1
    }
    expect(changedLines).toBe(1)

    // No direct Mermaid textarea authoring took place — the input was the
    // panel field, never the code-input control.
    await expect(codeInput).not.toBeFocused()

    // Clearing the label returns the edge to its unlabeled form.
    await labelInput.selectText()
    await page.keyboard.press('Backspace')
    await expect(codeInput).toHaveValue(/inicio --> revisar/)
    await expect(codeInput).not.toHaveValue(/\|Confirmado\|/)
  })

  test('editing an existing label (Aprovado? -> Publicar, "Sim") shows the current text and updates it', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    await page.getByTestId('rf__edge-e2').focus()

    const labelInput = page.getByLabel('Rótulo da conexão')
    await expect(labelInput).toHaveValue('Sim')

    await labelInput.selectText()
    await page.keyboard.type('Aprovado')

    await expect(codeInput).toHaveValue(/aprovado -->\|Aprovado\| publicar/)
  })

  test('T038 — keyboard-only US1+US3: selection survives focus moving from canvas into the panel (SC-011/SC-015)', async ({
    page,
  }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    // US1: select a connection via keyboard focus (no mouse), then move
    // focus into the panel's label field — the edge's own highlight must
    // still be applied (FR-002d/SE3: nothing on the canvas blurring clears
    // the selection; only Escape, a pane click, or model reconciliation do).
    await page.getByTestId('rf__edge-e0').focus()
    const labelInput = page.getByLabel(strings.propertiesPanel.labelFieldLabel)
    await labelInput.focus()
    await expect(page.getByTestId('rf__edge-e0')).toHaveClass(/edge-selected/)
    await page.keyboard.type('Confirmado')
    await expect(codeInput).toHaveValue(/inicio -->\|Confirmado\| revisar/)

    // US3: same pattern for a node — focus it, move focus into the panel's
    // shape selector, confirm the node's own highlight persisted, then
    // choose a shape entirely via keyboard.
    await page.getByTestId('rf__node-fim').focus()
    const shapeSelect = page.getByLabel(strings.propertiesPanel.shapeFieldLabel)
    await shapeSelect.focus()
    await expect(page.getByTestId('rf__node-fim').locator('.node-shape')).toHaveAttribute('data-selected', 'true')

    await page.keyboard.press('Enter')
    const diamondOption = page.getByRole('option', { name: strings.shapeNames.diamond, exact: true })
    await diamondOption.waitFor()
    await page.keyboard.press('L')
    await expect(diamondOption).toHaveAttribute('data-highlighted', '')
    await page.keyboard.press('Enter')

    await expect(codeInput).toHaveValue(/fim\{Fim\}/)
    // Both edits landed — neither surface clobbered the other's change.
    await expect(codeInput).toHaveValue(/inicio -->\|Confirmado\| revisar/)
  })
})
