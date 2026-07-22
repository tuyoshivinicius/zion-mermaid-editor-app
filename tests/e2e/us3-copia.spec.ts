import { test, expect, type Page } from '@playwright/test'

// US3 — arrasto o nó e levo embora o código, sem a minha bagunça dentro.

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const caixas = (page: Page) => page.locator('.react-flow__node')
const botao = (page: Page) => page.locator('[data-testid=botao-copiar]')

async function setEditor(page: Page, texto: string) {
  await editor(page).fill(texto)
  await page.waitForTimeout(90)
}
const lerClipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText())

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('US3-1: arrastar → código byte-idêntico (SC-004)', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[A]\nn2[B]')
  const antes = await editor(page).inputValue()

  const caixa = caixas(page).first()
  const bb = await caixa.boundingBox()
  if (!bb) throw new Error('sem caixa')
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
  await page.mouse.down()
  await page.mouse.move(bb.x + 220, bb.y + 160, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(60)

  await expect(editor(page)).toHaveValue(antes) // 0 bytes mudados
})

test('US3-2/US3-5: 1 clique copia tudo; confirmação visível', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[A]\nn2[B]')
  await botao(page).click()
  await expect(botao(page)).toHaveText(/Copiado/)
  const clip = await lerClipboard(page)
  expect(clip).toBe('flowchart TD\nn1[A]\nn2[B]')
})

test('US3-4: nenhum efêmero na saída (posição/zoom/seleção/foco)', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[A]')
  await botao(page).click()
  const clip = await lerClipboard(page)
  expect(clip).not.toMatch(/position|zoom|"x"|"y"|scroll|foco/i)
})

test('US3-6: editor apagado → copia `flowchart TD` sozinha', async ({ page }) => {
  await setEditor(page, '')
  await botao(page).click()
  expect(await lerClipboard(page)).toBe('flowchart TD')
})

test('US3-7: outro tipo no topo → saída com UMA só declaração', async ({ page }) => {
  await setEditor(page, 'classDiagram\nn1[a]')
  await botao(page).click()
  expect(await lerClipboard(page)).toBe('flowchart TD\nn1[a]')
})

test('US3-8: trecho ilegível vai junto; difere só na declaração', async ({ page }) => {
  const editorTexto = 'flowchart TD\nn1[ok]\na --> b\nn2(fora)'
  await setEditor(page, editorTexto)
  await botao(page).click()
  expect(await lerClipboard(page)).toBe(editorTexto) // já tem flowchart → byte-idêntico
})
