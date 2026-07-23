import { test, expect, type Page } from '@playwright/test'

// US2 — rotulo por gesto e colo texto de fora sem que ele mude.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const caixa = (page: Page) => page.locator('[data-testid=caixa-no]')
const editorRotulo = (page: Page) => page.locator('[data-testid=editor-rotulo]')

async function umNo(page: Page) {
  await area(page).dblclick({ position: { x: 260, y: 200 } })
  await expect(caixas(page)).toHaveCount(1)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(editor(page)).toHaveValue('flowchart TD')
})

test('US2-1: editar o rótulo por gesto propaga ao código ao vivo, sem confirmação', async ({ page }) => {
  await umNo(page)
  await caixa(page).dblclick()
  await editorRotulo(page).fill('Início')
  await page.waitForTimeout(60)
  await expect(editor(page)).toHaveValue(/n1\[Início\]/)
})

test('US2-3/5: colar de editor rico entra só como texto puro; multi-linha vira <br/> (SC-003)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await umNo(page)
  // área de transferência com formatação (text/html) + texto puro (text/plain).
  await page.evaluate(async () => {
    const item = new ClipboardItem({
      'text/html': new Blob(['<b style="color:red">linha 1</b><br><i>linha 2</i>'], { type: 'text/html' }),
      'text/plain': new Blob(['linha 1\nlinha 2'], { type: 'text/plain' }),
    })
    await navigator.clipboard.write([item])
  })
  await caixa(page).dblclick()
  await editorRotulo(page).fill('') // limpa o neutro antes de colar
  await editorRotulo(page).focus()
  await page.keyboard.press('ControlOrMeta+v')
  await page.waitForTimeout(80)
  // 0 vestígios de formatação: nada de <b>/<i>/style; a quebra vira <br/>
  await expect(editor(page)).toHaveValue(/n1\["linha 1<br\/>linha 2"\]/)
  await expect(editor(page)).not.toHaveValue(/<b>|<i>|color/)
})

test('US2-5: texto que o tipo não expressa fielmente → caixa marcada', async ({ page }) => {
  await umNo(page)
  await caixa(page).dblclick()
  await editorRotulo(page).fill('  borda com espaços  ') // espaços de borda colapsam ao renderizar
  await page.waitForTimeout(60)
  await expect(caixa(page)).toHaveAttribute('data-marcado', 'true')
})

test('US2-8: apagar todo o rótulo → caixa sem rótulo; NÃO exibe o identificador nem o neutro', async ({ page }) => {
  await umNo(page)
  await expect(caixa(page).locator('span')).toHaveText('Nó 1')
  await caixa(page).dblclick()
  await editorRotulo(page).fill('')
  await page.waitForTimeout(60)
  await editorRotulo(page).press('Escape') // fecha o editor
  await page.waitForTimeout(60)
  const txt = await caixa(page).locator('span').textContent()
  expect(txt).toBe('') // vazio — nem "n1", nem "Nó 1"
})
