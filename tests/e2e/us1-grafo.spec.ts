import { test, expect, type Page } from '@playwright/test'
import { normalizarCabecalhoParaCopia } from '../../src/codec'

// US1 — monto a estrutura do fluxo por gestos: nós, conexões e agrupamentos.
// Inclui o oráculo mermaid.parse() sobre o código construído por gesto (SC-001).

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const arestas = (page: Page) => page.locator('.react-flow__edge')
const no = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`)

async function criarDoisNos(page: Page) {
  await area(page).dblclick({ position: { x: 250, y: 120 } }) // n1 (em cima)
  await area(page).dblclick({ position: { x: 250, y: 340 } }) // n2 (embaixo)
  await expect(caixas(page)).toHaveCount(2)
}

async function puxar(page: Page, deId: string, ateId: string) {
  const src = no(page, deId).locator('.react-flow__handle-bottom')
  const tgt = no(page, ateId).locator('.react-flow__handle-top')
  const a = (await src.boundingBox())!
  const b = (await tgt.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 8 })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 })
  await page.mouse.up()
}

async function oraculoAceita(page: Page, texto: string): Promise<{ ok: boolean; erro?: string }> {
  const p = await page.context().newPage()
  await p.goto('/oraculo.html')
  await p.waitForFunction(() => (window as unknown as { __oraculoPronto?: boolean }).__oraculoPronto === true)
  const r = await p.evaluate(
    (t) => (window as unknown as { validarMermaid: (s: string) => Promise<{ ok: boolean; erro?: string }> }).validarMermaid(t),
    normalizarCabecalhoParaCopia(texto),
  )
  await p.close()
  return r
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(editor(page)).toHaveValue('flowchart TD')
})

test('US1-conectar: puxar do handle de origem ao nó destino cria a aresta no código', async ({ page }) => {
  await criarDoisNos(page)
  await puxar(page, 'n1', 'n2')
  await expect(editor(page)).toHaveValue(/n1 --> n2/)
  await expect(arestas(page)).toHaveCount(1)
})

test('US1-conexão no vazio: soltar fora de um nó não cria conexão nem nó (FR-001)', async ({ page }) => {
  await criarDoisNos(page)
  const src = no(page, 'n1').locator('.react-flow__handle-bottom')
  const a = (await src.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(600, 500, { steps: 8 }) // espaço vazio
  await page.mouse.up()
  await expect(arestas(page)).toHaveCount(0)
  await expect(caixas(page)).toHaveCount(2) // nenhum nó novo
})

test('US1-agrupar: selecionar nós e agrupar cria o bloco `subgraph…end` no código', async ({ page }) => {
  await criarDoisNos(page)
  await no(page, 'n1').click()
  await no(page, 'n2').click({ modifiers: ['Shift'] })
  await page.getByTestId('btn-agrupar').click()
  await expect(editor(page)).toHaveValue(/subgraph sub1\[Grupo 1\]/)
  await expect(editor(page)).toHaveValue(/subgraph sub1\[Grupo 1\]\n\s*n1\n\s*n2\nend/)
  await expect(page.getByTestId('moldura-agrupamento')).toBeVisible()
})

test('US1-digitar aresta no editor → a conexão nasce na área do diagrama (FR-013)', async ({ page }) => {
  await editor(page).fill('flowchart TD\na --> b')
  await page.waitForTimeout(90)
  await expect(caixas(page)).toHaveCount(2)
  await expect(arestas(page)).toHaveCount(1)
})

test('US1-oráculo: o código construído por gesto é aceito pelo mermaid de fora (SC-001)', async ({ page }) => {
  await criarDoisNos(page)
  await puxar(page, 'n1', 'n2')
  await no(page, 'n1').click()
  await no(page, 'n2').click({ modifiers: ['Shift'] })
  await page.getByTestId('btn-agrupar').click()
  await expect(editor(page)).toHaveValue(/subgraph sub1/)
  const texto = await editor(page).inputValue()
  const r = await oraculoAceita(page, texto)
  expect(r.ok, r.erro ?? '').toBe(true)
})
