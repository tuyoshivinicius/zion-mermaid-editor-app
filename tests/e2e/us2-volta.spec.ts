import { test, expect, type Page } from '@playwright/test'

// US2 — escrevo no código e o diagrama acompanha (a metade VOLTA do cano).

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const caixas = (page: Page) => page.locator('.react-flow__node')
const rotulos = (page: Page) => page.locator('[data-testid=caixa-no] span')

async function setEditor(page: Page, texto: string) {
  await editor(page).fill(texto)
  await page.waitForTimeout(90)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('US2-1/US2-2: editar id muda; apagar a linha remove; os demais ficam', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[A]\nn2[B]\nn3[C]')
  await expect(caixas(page)).toHaveCount(3)
  await setEditor(page, 'flowchart TD\nn1[A]\nn3[C]') // apaga n2
  await expect(caixas(page)).toHaveCount(2)
})

test('US2-4: código incompleto → sempre um diagrama, nunca vazio nem quebrado', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[Nó ') // sem fecho
  await expect(caixas(page)).toHaveCount(1)
  await expect(rotulos(page).first()).toHaveText('Nó')
})

test('US2-6: apagar tudo → vazio; o cabeçalho NÃO é recolocado', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[A]')
  await expect(caixas(page)).toHaveCount(1)
  await setEditor(page, '')
  await expect(caixas(page)).toHaveCount(0)
  await expect(editor(page)).toHaveValue('')
})

test('US2-8: duplicar a linha → um nó só, com o rótulo da última', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[A]\nn1[B]')
  await expect(caixas(page)).toHaveCount(1)
  await expect(rotulos(page).first()).toHaveText('B')
})

test('US2-9: `n1[Nó A]` letra a letra — nasce ao id, acompanha, sem exibir colchete', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[Nó A')
  await expect(caixas(page)).toHaveCount(1)
  await expect(rotulos(page).first()).toHaveText('Nó A') // sem `[`
})

test('US2-10: segunda declaração de tipo no meio → nenhuma caixa nasce dela', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[A]\nstateDiagram-v2\nn2[B]')
  await expect(caixas(page)).toHaveCount(2) // só n1 e n2
})

test('US2-12: `n1[Nó A] --> n2` some por inteiro; apagar o excedente reaparece', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1[Nó A] --> n2')
  await expect(caixas(page)).toHaveCount(0) // linha ilegível por inteiro
  await setEditor(page, 'flowchart TD\nn1[Nó A]')
  await expect(caixas(page)).toHaveCount(1)
})

test('US2-13: `n1["Nó, A"]` → caixa exibe `Nó, A` sem aspas', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1["Nó, A"]')
  await expect(rotulos(page).first()).toHaveText('Nó, A')
})

test('US2-14: `n1(Nó A)` → nenhuma caixa (fora do vocabulário)', async ({ page }) => {
  await setEditor(page, 'flowchart TD\nn1(Nó A)')
  await expect(caixas(page)).toHaveCount(0)
})
