import { expect, test } from '@playwright/test'

const VALID_FLOWCHART = `flowchart TD
  A[Start] --> B[End]`

test.describe('US1 — text to canvas live preview', () => {
  test('pasting a valid Flowchart renders nodes and edges on the canvas', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')
    await page.getByTestId('code-input').fill(VALID_FLOWCHART)
    await expect(canvas.getByText('Start')).toBeVisible()
    await expect(canvas.getByText('End')).toBeVisible()
  })

  test('typing a new edge live-updates the preview with no extra action', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')
    await page.getByTestId('code-input').fill(VALID_FLOWCHART)
    await expect(canvas.getByText('End')).toBeVisible()
    await page.getByTestId('code-input').fill(`${VALID_FLOWCHART}\n  B --> C[Third]`)
    await expect(canvas.getByText('Third')).toBeVisible()
  })

  test('renaming a label in the text updates the canvas label', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')
    await page.getByTestId('code-input').fill(VALID_FLOWCHART)
    await expect(canvas.getByText('Start')).toBeVisible()
    await page.getByTestId('code-input').fill('flowchart TD\n  A[Renamed] --> B[End]')
    await expect(canvas.getByText('Renamed')).toBeVisible()
    await expect(canvas.getByText('Start', { exact: true })).not.toBeVisible()
  })

  test('invalid text keeps the last valid preview and shows the "não interpretável" indicator', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')
    await page.getByTestId('code-input').fill(VALID_FLOWCHART)
    await expect(canvas.getByText('End')).toBeVisible()
    await page.getByTestId('code-input').fill('flowchart TD\n  A[Broken -->')
    await expect(canvas.getByText('End')).toBeVisible()
    await expect(page.getByRole('status')).toContainText('não interpretável')
  })

  test('invalid text typed over the starter keeps the starter as the last valid preview and shows the indicator', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')
    await expect(canvas.getByText('Início', { exact: true })).toBeVisible()

    await page.getByTestId('code-input').fill('not mermaid at all !!')

    await expect(page.getByRole('status')).toContainText('não interpretável')
    await expect(canvas.getByText('Início', { exact: true })).toBeVisible()
  })

  test('a non-Flowchart diagram shows a distinct "apenas Flowchart" message and is not rendered', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('code-input').fill('sequenceDiagram\n  Alice->>Bob: Hi')
    await expect(page.getByRole('status')).toContainText('apenas Flowchart')
  })
})
