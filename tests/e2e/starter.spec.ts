import { expect, test } from '@playwright/test'
import { STARTER_TEXT } from '@/starter/model'

const STARTER_LABELS = ['Início', 'Revisar', 'Aprovado?', 'Publicar', 'Fim']

test.use({ viewport: { width: 1280, height: 800 } })

test.describe('US1 — starter appears on open (SC-001/002/003/004/005/009/011, FR-002a)', () => {
  test('the starter is drawn on the canvas and written in the code panel with zero actions', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')

    for (const label of STARTER_LABELS) {
      await expect(canvas.getByText(label, { exact: true })).toBeVisible()
    }

    await expect(page.getByTestId('code-input')).toHaveValue(STARTER_TEXT)
  })

  test('the whole starter diagram is visible without zoom or pan', async ({ page }) => {
    await page.goto('/')
    const canvas = page.getByTestId('canvas-panel')

    for (const label of STARTER_LABELS) {
      await expect(canvas.getByText(label, { exact: true })).toBeInViewport()
    }
  })

  test('FR-002a — the decision node is a diamond in code but rendered identically to every other node on the canvas', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('code-input')).toHaveValue(/aprovado\{Aprovado\?\}/)

    const decisionClass = await page.getByLabel('Aprovado?', { exact: true }).getAttribute('class')
    const plainClass = await page.getByLabel('Início', { exact: true }).getAttribute('class')
    expect(decisionClass).toBe(plainClass)

    const html = await page.locator('.react-flow__nodes').innerHTML()
    expect(html).not.toMatch(/clip-path/)
    expect(html).not.toMatch(/<polygon/)
    expect(html).not.toMatch(/rotate\(/)
  })

  test('SC-011 — no template-choice surface is presented at first contact', async ({ page }) => {
    await page.goto('/')

    const toolbarControls = await page.getByTestId('toolbar').locator('input, button').all()
    const testIds = await Promise.all(toolbarControls.map((el) => el.getAttribute('data-testid')))
    expect(new Set(testIds)).toEqual(new Set(['new-node-label', 'add-node-button', 'connect-mode-button', 'clear-button']))

    await expect(page.locator('[role="listbox"], [role="combobox"], [role="menu"]')).toHaveCount(0)
  })
})

test.describe('US1 — the five core S0 actions operate on the starter with no preparatory step', () => {
  test('add, connect, rename, remove-edge and remove-node each rewrite the code', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    const initial = await codeInput.inputValue()

    // Adicionar nó
    await page.getByTestId('new-node-label').fill('Arquivar')
    await page.getByTestId('add-node-button').click()
    await expect(codeInput).toHaveValue(/arquivar\[Arquivar\]/)
    const afterAdd = await codeInput.inputValue()
    expect(afterAdd).not.toBe(initial)

    // Conectar
    await page.getByTestId('connect-mode-button').click()
    await page.getByTestId('rf__node-fim').click()
    await page.getByTestId('rf__node-arquivar').click()
    await expect(codeInput).toHaveValue(/fim --> arquivar/)
    const afterConnect = await codeInput.inputValue()
    expect(afterConnect).not.toBe(afterAdd)

    // Renomear
    const arquivarNode = page.getByTestId('rf__node-arquivar')
    await arquivarNode.click()
    await arquivarNode.press('Enter')
    await page.keyboard.type('Arquivado')
    await page.keyboard.press('Enter')
    await expect(codeInput).toHaveValue(/arquivado\[Arquivado\]/)
    const afterRename = await codeInput.inputValue()
    expect(afterRename).not.toBe(afterConnect)

    // Remover aresta (a aresta recém-criada fim --> arquivado)
    const edge = page.locator('[data-testid^="rf__edge-"]').first()
    await edge.click({ force: true })
    await page.keyboard.press('Delete')
    const afterRemoveEdge = await codeInput.inputValue()
    expect(afterRemoveEdge).not.toBe(afterRename)

    // Remover nó
    const arquivadoNode = page.getByTestId('rf__node-arquivado')
    await arquivadoNode.click()
    await arquivadoNode.press('Delete')
    await expect(codeInput).not.toContainText('arquivado[Arquivado]')
  })

  test('copying the code yields a valid, renderable Flowchart', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('copy-button').click()
    await expect(page.getByRole('status')).toContainText('código copiado')

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe(STARTER_TEXT)

    const svg = await page.evaluate(async (text) => {
      const mermaid = (window as unknown as { __mermaid: { render: (id: string, t: string) => Promise<{ svg: string }> } }).__mermaid
      const result = await mermaid.render('starter-copy-check', text)
      return result.svg
    }, clipboardText)
    expect(svg).toContain('<svg')
  })

  test('SC-003 — renaming rewrites only the lines the id cascade touches, in order, with no gratuitous diff', async ({ page }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')
    const before = (await codeInput.inputValue()).split('\n')

    const revisarNode = page.getByTestId('rf__node-revisar')
    await revisarNode.click()
    await revisarNode.press('Enter')
    await page.keyboard.type('Revisado')
    await page.keyboard.press('Enter')

    const after = (await codeInput.inputValue()).split('\n')
    expect(after.length).toBe(before.length)

    let changedLines = 0
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) changedLines += 1
    }
    expect(changedLines).toBe(4)
  })
})
