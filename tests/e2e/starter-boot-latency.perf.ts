import { expect, test } from '@playwright/test'
import { percentile } from '../helpers/percentile'
import { STARTER_TEXT } from '@/starter/model'

const WARMUP_RUNS = 1
const RUNS = 30
const P95_BUDGET_MS = 1000

// Gate SC-012/FR-018: p95 time-to-starter from page.goto('/') to the starter
// simultaneously drawn on the canvas and written in the code panel, measured
// against the production build (vite preview), not the dev server.

async function loadAndWaitForStarter(page: import('@playwright/test').Page): Promise<number> {
  const start = performance.now()
  await page.goto('/')
  await expect(page.getByTestId('canvas-panel').getByText('Início', { exact: true })).toBeVisible()
  await expect(page.getByTestId('code-input')).toHaveValue(STARTER_TEXT)
  return performance.now() - start
}

test('p95 boot-to-starter latency stays within the 1s budget over 30 samples', async ({ page }) => {
  for (let i = 0; i < WARMUP_RUNS; i++) {
    await loadAndWaitForStarter(page)
  }

  const durations: number[] = []
  for (let i = 0; i < RUNS; i++) {
    durations.push(await loadAndWaitForStarter(page))
  }

  durations.sort((a, b) => a - b)
  const p95 = percentile(durations, 0.95)
  expect(p95).toBeLessThanOrEqual(P95_BUDGET_MS)
})
