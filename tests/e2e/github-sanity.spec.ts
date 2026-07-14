import { expect, test } from '@playwright/test'

// Gate III (Principle III / FR-005): the output must render with the
// current-stable Mermaid engine — the same engine GitHub uses to render
// ```mermaid``` code blocks — not just re-parse successfully. Run inside the
// real page (not jsdom/Node): SVG layout APIs like getBBox() that
// mermaid.render() needs aren't implemented by jsdom.

test('canvas-authored Flowchart output renders with the current-stable Mermaid engine', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('new-node-label').fill('Start')
  await page.getByTestId('add-node-button').click()
  await page.getByTestId('new-node-label').fill('End')
  await page.getByTestId('add-node-button').click()
  await page.getByTestId('connect-mode-button').click()
  await page.getByTestId('rf__node-start').click()
  await page.getByTestId('rf__node-end_').click()

  const generated = await page.getByTestId('code-input').inputValue()
  expect(generated).toContain('start --> end_')

  const svg = await page.evaluate(async (text) => {
    const mermaid = (window as unknown as { __mermaid: { render: (id: string, t: string) => Promise<{ svg: string }> } }).__mermaid
    const result = await mermaid.render('github-sanity-check', text)
    return result.svg
  }, generated)

  expect(svg).toContain('<svg')
})
