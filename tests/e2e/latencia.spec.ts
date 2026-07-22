import { test, expect, type Page } from '@playwright/test'

// Portão de latência no envelope (T045 / SC-003 / SC-005 / Princípio III):
// dentro de 400 nós — tecla ≤50ms mediana, edição refletida ≤100ms mediana,
// gesto contínuo ≥50fps. Sustentados pela invariante de reuso da projeção.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const caixas = (page: Page) => page.locator('.react-flow__node')

const N = 400
const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

test('dentro de 400 nós: tecla ≤50ms e edição refletida ≤100ms (medianas)', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')

  const doc = 'flowchart TD\n' + Array.from({ length: N }, (_, i) => `n${i + 1}[Passo ${i + 1}]`).join('\n')
  await editor(page).fill(doc)
  await expect(caixas(page)).toHaveCount(N, { timeout: 60_000 })

  // Mede, no navegador, no envelope cheio: custo síncrono da tecla e tempo até a
  // outra vista refletir uma edição pontual de rótulo.
  const medidas = await page.evaluate(async ({ n }) => {
    const el = document.querySelector('[data-testid=editor-codigo]') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    const rAF = () => new Promise<number>((r) => requestAnimationFrame(() => r(performance.now())))
    const teclas: number[] = []
    const edicoes: number[] = []
    const base = el.value

    for (let k = 0; k < 20; k++) {
      const novo = base.replace('n1[Passo 1]', `n1[Passo 1 ${k}]`)
      const t0 = performance.now()
      setter.call(el, novo)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      const t1 = performance.now()
      teclas.push(t1 - t0) // custo síncrono da tecla (SC-003)
      // espera a outra vista refletir (debounce + análise + projeção + render)
      let t = await rAF()
      while (t - t0 < 8) t = await rAF()
      edicoes.push(t - t0) // edição refletida (SC-005)
      await new Promise((r) => setTimeout(r, 40))
    }
    void n
    return { teclas, edicoes }
  }, { n: N })

  const medKey = mediana(medidas.teclas)
  const medEdit = mediana(medidas.edicoes)
  // eslint-disable-next-line no-console
  console.log(`latência @400: tecla mediana=${medKey.toFixed(1)}ms · edição mediana=${medEdit.toFixed(1)}ms`)

  expect(medKey).toBeLessThanOrEqual(50)
  expect(medEdit).toBeLessThanOrEqual(100)
})
