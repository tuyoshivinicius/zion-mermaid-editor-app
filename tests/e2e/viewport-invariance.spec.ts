import { expect, test } from '@playwright/test'

// Gate VIII (Principle VIII / FR-013): zoom, pan, and code-panel collapse are
// ephemeral view state and must never change the generated Mermaid text.

test('generated text is byte-identical before and after zoom, pan, and canvas interaction', async ({ page }) => {
  await page.goto('/')
  const codeInput = page.getByTestId('code-input')

  await codeInput.fill('flowchart TD\n  A[Start] --> B[End]')
  const before = await codeInput.inputValue()

  const canvas = page.getByTestId('canvas-panel')
  await canvas.hover()
  await page.mouse.wheel(0, -200) // zoom in
  await page.mouse.wheel(0, 200) // zoom out
  await page.mouse.move(300, 300)
  await page.mouse.down()
  await page.mouse.move(200, 250) // pan
  await page.mouse.up()

  const after = await codeInput.inputValue()
  expect(after).toBe(before)
})
