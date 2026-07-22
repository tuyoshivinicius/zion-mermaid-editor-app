import { test, expect, type Page } from '@playwright/test'

// US1 — o nó nasce e a linha aparece no código (a metade IDA do cano).

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const caixas = (page: Page) => page.locator('.react-flow__node')

async function setEditor(page: Page, texto: string) {
  await editor(page).fill(texto)
  await page.waitForTimeout(90) // debounce (24ms) + folga
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(editor(page)).toHaveValue('flowchart TD') // semente (FR-019)
  await expect(caixas(page)).toHaveCount(0)
})

test('US1-1: duplo-clique no vazio cria o nó e a linha nasce no código', async ({ page }) => {
  await area(page).dblclick({ position: { x: 260, y: 180 } })
  await expect(editor(page)).toHaveValue('flowchart TD\nn1[Nó 1]')
  await expect(caixas(page)).toHaveCount(1)
})

test('US1-2: o segundo nó preserva a linha do primeiro', async ({ page }) => {
  await area(page).dblclick({ position: { x: 200, y: 140 } })
  await area(page).dblclick({ position: { x: 420, y: 300 } })
  await expect(editor(page)).toHaveValue('flowchart TD\nn1[Nó 1]\nn2[Nó 2]')
  await expect(caixas(page)).toHaveCount(2)
})

test('US1-3: texto próprio (com trecho ilegível) fica byte-idêntico (SC-009)', async ({ page }) => {
  const proprio = 'flowchart TD\n%% minha nota\nn1[a]\n   lixo (  ilegível'
  await setEditor(page, proprio)
  await area(page).dblclick({ position: { x: 500, y: 360 } })
  await expect(editor(page)).toHaveValue(proprio + '\nn2[Nó 2]')
})

test('US1-4: cabeçalho apagado NÃO é recolocado ao criar (FR-019)', async ({ page }) => {
  await setEditor(page, 'n1[a]')
  await area(page).dblclick({ position: { x: 300, y: 220 } })
  await expect(editor(page)).toHaveValue('n1[a]\nn2[Nó 2]')
})

test('US1-5: id/rótulo saltam para valor livre (FR-016)', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn3[x]')
  await area(page).dblclick({ position: { x: 300, y: 220 } })
  await expect(editor(page)).toHaveValue('flowchart TD\nn3[x]\nn4[Nó 4]')
})

test('US1-6: revela a linha sem mover o cursor nem tomar foco (SC-010)', async ({ page }) => {
  const longo = 'flowchart TD\n' + Array.from({ length: 60 }, (_, i) => `n${i + 100}[Linha ${i}]`).join('\n')
  await setEditor(page, longo)
  const ta = editor(page)
  // foca o editor e fixa o cursor
  await ta.evaluate((el: HTMLTextAreaElement) => {
    el.focus()
    el.selectionStart = el.selectionEnd = 5
    el.scrollTop = 0
  })
  await area(page).dblclick({ position: { x: 500, y: 300 } })
  // 0 deslocamentos de cursor, 0 perdas de foco, e a linha nova foi revelada
  const estado = await ta.evaluate((el: HTMLTextAreaElement) => ({
    cursor: el.selectionStart,
    focado: document.activeElement === el,
    scrollTop: el.scrollTop,
  }))
  expect(estado.cursor).toBe(5)
  expect(estado.focado).toBe(true)
  expect(estado.scrollTop).toBeGreaterThan(0)
})

test('US1-7: duplo-clique SOBRE a caixa é no-op (FR-001)', async ({ page }) => {
  await area(page).dblclick({ position: { x: 260, y: 180 } })
  await expect(caixas(page)).toHaveCount(1)
  const antes = await editor(page).inputValue()
  await caixas(page).first().dblclick()
  await page.waitForTimeout(60)
  await expect(caixas(page)).toHaveCount(1)
  await expect(editor(page)).toHaveValue(antes)
})
