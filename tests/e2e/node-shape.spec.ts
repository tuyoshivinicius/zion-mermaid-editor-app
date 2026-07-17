import { expect, test, type Page } from '@playwright/test'
import { strings } from '@/strings'

const ALL_SHAPES = [
  'rect',
  'round',
  'stadium',
  'subroutine',
  'cylinder',
  'circle',
  'doublecircle',
  'diamond',
  'hexagon',
  'odd',
  'trapezoid',
  'inv_trapezoid',
  'lean_right',
  'lean_left',
]

const SHAPE_DELIMITERS: Record<string, [string, string]> = {
  rect: ['[', ']'],
  round: ['(', ')'],
  stadium: ['([', '])'],
  subroutine: ['[[', ']]'],
  cylinder: ['[(', ')]'],
  circle: ['((', '))'],
  doublecircle: ['(((', ')))'],
  diamond: ['{', '}'],
  hexagon: ['{{', '}}'],
  odd: ['>', ']'],
  trapezoid: ['[/', '\\]'],
  inv_trapezoid: ['[\\', '/]'],
  lean_right: ['[/', '/]'],
  lean_left: ['[\\', '\\]'],
}

function flowchartWithAllShapes(): string {
  const lines = ['flowchart TD']
  ALL_SHAPES.forEach((shape, i) => {
    const [open, close] = SHAPE_DELIMITERS[shape]
    lines.push(`  n${i}${open}${shape}${close}`)
  })
  return lines.join('\n')
}

function shapeAttrLocator(page: Page, nodeTestId: string) {
  return page.getByTestId(nodeTestId).locator('[data-shape]').first()
}

test.describe('US2 — the canvas draws the 14 shapes the code already carries (SC-004/SC-012)', () => {
  test("the starter's decision node is drawn as a diamond", async ({ page }) => {
    await page.goto('/')
    await expect(shapeAttrLocator(page, 'rf__node-aprovado')).toHaveAttribute('data-shape', 'diamond')
  })

  test('pasting the 14 shapes produces 14 pairwise-distinct data-shape values with differing computed geometry', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByTestId('code-input').fill(flowchartWithAllShapes())

    const dataShapes = await Promise.all(
      ALL_SHAPES.map((_, i) => shapeAttrLocator(page, `rf__node-n${i}`).getAttribute('data-shape')),
    )
    expect(dataShapes).toEqual(ALL_SHAPES)
    expect(new Set(dataShapes).size).toBe(ALL_SHAPES.length)

    const rectClipPath = await shapeAttrLocator(page, 'rf__node-n0').evaluate((el) => getComputedStyle(el).clipPath)
    const diamondIndex = ALL_SHAPES.indexOf('diamond')
    const diamondClipPath = await shapeAttrLocator(page, `rf__node-n${diamondIndex}`).evaluate(
      (el) => getComputedStyle(el).clipPath,
    )
    expect(diamondClipPath).not.toBe('none')
    expect(diamondClipPath).not.toBe(rectClipPath)

    const circleIndex = ALL_SHAPES.indexOf('circle')
    const rectRadius = await shapeAttrLocator(page, 'rf__node-n0').evaluate((el) => getComputedStyle(el).borderRadius)
    const circleRadius = await shapeAttrLocator(page, `rf__node-n${circleIndex}`).evaluate(
      (el) => getComputedStyle(el).borderRadius,
    )
    expect(circleRadius).not.toBe(rectRadius)
  })
})

test.describe('US3 — choose a node shape from the properties panel (SC-004/005/008/012)', () => {
  test('choosing each of the 14 shapes rewrites only the node line, with the correct delimiters, and updates data-shape', async ({
    page,
  }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    // Select Início (rect) once; it stays selected across the loop (FR-002d).
    await page.getByTestId('rf__node-inicio').focus()
    const shapeSelect = page.getByLabel(strings.propertiesPanel.shapeFieldLabel)

    for (const shape of ALL_SHAPES) {
      const before = (await codeInput.inputValue()).split('\n')

      await shapeSelect.click()
      await page
        .getByRole('option', { name: strings.shapeNames[shape as keyof typeof strings.shapeNames], exact: true })
        .click()

      const after = (await codeInput.inputValue()).split('\n')
      expect(after.length).toBe(before.length)
      // <=1: choosing the shape already active (rect, the starter's initial
      // shape, on the first iteration) is a legitimate no-op — SC-005 only
      // promises "at most/exactly the node's own line", never a rewrite of
      // any other line.
      let changed = 0
      for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) changed += 1
      expect(changed).toBeLessThanOrEqual(1)

      const [open, close] = SHAPE_DELIMITERS[shape]
      expect(after.join('\n')).toContain(`inicio${open}Início${close}`)
      await expect(shapeAttrLocator(page, 'rf__node-inicio')).toHaveAttribute('data-shape', shape)
    }

    // No edge line was ever touched across the 14 choices.
    await expect(codeInput).toHaveValue(/inicio.*-->\s*revisar/)
  })

  test('keyboard-only: selecting a node then choosing a shape via keyboard rewrites its line (SC-011/SC-015)', async ({
    page,
  }) => {
    await page.goto('/')
    const codeInput = page.getByTestId('code-input')

    await page.getByTestId('rf__node-inicio').focus()
    const shapeSelect = page.getByLabel(strings.propertiesPanel.shapeFieldLabel)
    await shapeSelect.focus()
    await page.keyboard.press('Enter')

    const diamondOption = page.getByRole('option', { name: strings.shapeNames.diamond, exact: true })
    await diamondOption.waitFor() // don't send typeahead before the listbox has actually opened
    await page.keyboard.press('L') // Radix Select typeahead -> "Losango" (diamond)
    await expect(diamondOption).toHaveAttribute('data-highlighted', '')
    await page.keyboard.press('Enter')

    await expect(codeInput).toHaveValue(/inicio\{Início\}/)
    await expect(shapeAttrLocator(page, 'rf__node-inicio')).toHaveAttribute('data-shape', 'diamond')
  })
})
