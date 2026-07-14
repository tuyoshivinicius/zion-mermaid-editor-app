import { expect, test } from '@playwright/test'

// FR-011/SC-007: the session is ephemeral — nothing persists across a
// reload, and the UI never implies anything was saved (no save button, no
// "saved"/"salvo" indicator, no localStorage/sessionStorage/IndexedDB use).

test('reloading the page loses uncopied work — nothing persists', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('code-input').fill('flowchart TD\n  A[Start] --> B[End]')
  await expect(page.getByTestId('code-input')).toHaveValue(/Start/)

  await page.reload()

  await expect(page.getByTestId('code-input')).toHaveValue('')
})

test('the UI has no save affordance and uses no client-side storage', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('code-input').fill('flowchart TD\n  A[Start] --> B[End]')

  const bodyText = await page.locator('body').innerText()
  expect(bodyText.toLowerCase()).not.toMatch(/salvo|salvar|saved|save/)

  const storageState = await page.evaluate(() => ({
    localStorageLength: window.localStorage.length,
    sessionStorageLength: window.sessionStorage.length,
  }))
  expect(storageState.localStorageLength).toBe(0)
  expect(storageState.sessionStorageLength).toBe(0)
})
