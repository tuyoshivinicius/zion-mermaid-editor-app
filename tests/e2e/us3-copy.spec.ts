import { expect, test } from '@playwright/test'

test.describe('US3 — copy the final code', () => {
  test('single-action copy places the editor text on the clipboard, announces success', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('code-input').fill('flowchart TD\n  A[Start] --> B[End]')
    const expected = await page.getByTestId('code-input').inputValue()

    await page.getByTestId('copy-button').click()

    await expect(page.getByRole('status')).toContainText('código copiado')
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe(expected)
  })

  test('on clipboard write failure, the code stays selectable and failure is announced', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', {
        value: () => Promise.reject(new Error('denied')),
        configurable: true,
      })
    })
    await page.goto('/')
    await page.getByTestId('code-input').fill('flowchart TD\n  A[Start] --> B[End]')

    await page.getByTestId('copy-button').click()

    await expect(page.getByRole('status')).toContainText('falha ao copiar')
    const selection = await page.evaluate(() => {
      const el = document.activeElement as HTMLTextAreaElement
      return { tag: el?.tagName, start: el?.selectionStart, end: el?.selectionEnd }
    })
    expect(selection.tag).toBe('TEXTAREA')
    expect(selection.end).toBeGreaterThan(selection.start ?? 0)
  })
})
