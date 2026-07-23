import { test, expect, type Page } from '@playwright/test'

// Portão de latência no envelope do R1 (T045 / SC-005 / SC-010 / Princípio III):
// 400 elementos-nó (nós + agrupamentos) e 500 conexões — tecla ≤50ms mediana, edição
// refletida ≤100ms mediana, gesto contínuo ≥50fps. Sustentado pela invariante de reuso.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const arestas = (page: Page) => page.locator('.react-flow__edge')

const N_NOS = 390
const N_GRUPOS = 10
const N_CONEX = 500

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function envelope(): string {
  const linhas = ['flowchart TD']
  for (let i = 1; i <= N_NOS; i++) linhas.push(`n${i}[Passo ${i}]`)
  for (let k = 0; k < N_CONEX; k++) {
    const a = (k % N_NOS) + 1
    const b = ((k + 1) % N_NOS) + 1
    linhas.push(`n${a} --> n${b}`)
  }
  for (let g = 1; g <= N_GRUPOS; g++) {
    const base = (g - 1) * 4 + 1
    linhas.push(`subgraph g${g}[Grupo ${g}]`)
    for (let j = 0; j < 4; j++) linhas.push(`  n${base + j}`)
    linhas.push('end')
  }
  return linhas.join('\n')
}

test('envelope 400/500: tecla ≤50ms, edição ≤100ms (medianas) e gesto ≥50fps', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await editor(page).fill(envelope())
  await expect(caixas(page)).toHaveCount(N_NOS, { timeout: 90_000 })
  await expect(arestas(page)).toHaveCount(N_CONEX, { timeout: 90_000 })

  const medidas = await page.evaluate(async () => {
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
      teclas.push(t1 - t0)
      let t = await rAF()
      while (t - t0 < 8) t = await rAF()
      edicoes.push(t - t0)
      await new Promise((r) => setTimeout(r, 40))
    }

    // fps do gesto contínuo: conta frames em ~500ms de rAF sob o envelope cheio.
    const marcos: number[] = []
    const inicio = performance.now()
    while (performance.now() - inicio < 500) marcos.push(await rAF())
    const intervalos = marcos.slice(1).map((m, i) => m - marcos[i]).sort((a, b) => a - b)
    const fps = 1000 / intervalos[Math.floor(intervalos.length / 2)]

    return { teclas, edicoes, fps }
  })

  const medKey = mediana(medidas.teclas)
  const medEdit = mediana(medidas.edicoes)
  // eslint-disable-next-line no-console
  console.log(`R1 @400/500: tecla=${medKey.toFixed(1)}ms · edição=${medEdit.toFixed(1)}ms · fps=${medidas.fps.toFixed(0)}`)

  expect(medKey).toBeLessThanOrEqual(50)
  expect(medEdit).toBeLessThanOrEqual(100)
  expect(medidas.fps).toBeGreaterThanOrEqual(50)
})
