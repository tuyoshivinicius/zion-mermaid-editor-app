import { test, expect, type Page } from '@playwright/test'

// US3 — corrijo o que errei: seleciono, movo, duplico e excluo.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const arestas = (page: Page) => page.locator('.react-flow__edge')
const moldura = (page: Page) => page.locator('.react-flow__node-agrupamento')
const no = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`)

async function criarDoisNos(page: Page) {
  await area(page).dblclick({ position: { x: 240, y: 130 } }) // n1
  await area(page).dblclick({ position: { x: 240, y: 340 } }) // n2
  await expect(caixas(page)).toHaveCount(2)
}
async function conectar(page: Page, a: string, b: string) {
  const src = no(page, a).locator('.react-flow__handle-bottom')
  const tgt = no(page, b).locator('.react-flow__handle-top')
  const ba = (await src.boundingBox())!
  const bb = (await tgt.boundingBox())!
  await page.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2)
  await page.mouse.down()
  await page.mouse.move((ba.x + bb.x) / 2, (ba.y + bb.y) / 2, { steps: 8 })
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(editor(page)).toHaveValue('flowchart TD')
})

test('US3-2: arrastar um nó deixa o código byte-idêntico (SC-004)', async ({ page }) => {
  await criarDoisNos(page)
  const antes = await editor(page).inputValue()
  const box = (await no(page, 'n1').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 160, box.y + 40, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(60)
  await expect(editor(page)).toHaveValue(antes) // 0 bytes mudados
})

test('US3-4: duplicar dois nós ligados → 2 nós novos + conexão nova', async ({ page }) => {
  await criarDoisNos(page)
  await conectar(page, 'n1', 'n2')
  await expect(arestas(page)).toHaveCount(1)
  await no(page, 'n1').click()
  await no(page, 'n2').click({ modifiers: ['Shift'] })
  await page.getByTestId('btn-duplicar').click()
  await expect(caixas(page)).toHaveCount(4)
  await expect(arestas(page)).toHaveCount(2)
})

test('US3-6: excluir um nó leva as conexões presas', async ({ page }) => {
  await criarDoisNos(page)
  await conectar(page, 'n1', 'n2')
  await no(page, 'n1').click()
  await page.getByTestId('btn-excluir').click()
  await expect(caixas(page)).toHaveCount(1) // só n2
  await expect(arestas(page)).toHaveCount(0) // a conexão presa saiu
})

test('US3-8: excluir só a moldura preserva os membros (SC-008)', async ({ page }) => {
  await criarDoisNos(page)
  await no(page, 'n1').click()
  await no(page, 'n2').click({ modifiers: ['Shift'] })
  await page.getByTestId('btn-agrupar').click()
  await expect(moldura(page)).toBeVisible()
  // seleciona SÓ a moldura (faixa do título, livre de membros) e exclui
  await moldura(page).click({ position: { x: 14, y: 6 } })
  await page.getByTestId('btn-excluir').click()
  await expect(moldura(page)).toHaveCount(0) // moldura foi
  await expect(caixas(page)).toHaveCount(2) // membros ficam
  await expect(editor(page)).not.toHaveValue(/subgraph/)
})

test('US3-10: arrastar um membro para fora NÃO desagrupa; código byte-idêntico', async ({ page }) => {
  await criarDoisNos(page)
  await no(page, 'n1').click()
  await no(page, 'n2').click({ modifiers: ['Shift'] })
  await page.getByTestId('btn-agrupar').click()
  await expect(moldura(page)).toBeVisible()
  const antes = await editor(page).inputValue()
  const box = (await no(page, 'n1').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 300, box.y + 10, { steps: 8 }) // arrasta para longe
  await page.mouse.up()
  await page.waitForTimeout(60)
  await expect(editor(page)).toHaveValue(antes) // pertencimento intacto, 0 bytes
})
