import { test, expect, type Page } from '@playwright/test'
import { documentoEnvelope, N_NOS, N_CONEX } from '../fixtures/envelope'

// A RESPOSTA DE AJUSTAR E RESETAR (T032 / SC-012).
//
// Os dois gestos RESPONDEM em ≤100ms na mediana dentro do envelope, na mesma barra da
// edição pontual do `NFR-03`. O critério mede o tempo até o enquadramento COMEÇAR a
// mudar — a duração do trânsito não entra na conta, porque o que se está medindo é a
// resposta ao gesto, não a viagem até o destino.
//
// A varredura O(n+m) da extensão desenhada roda aqui dentro (é ela que decide o
// destino), e é por isso que este portão mede no envelope CHEIO.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const arestas = (page: Page) => page.locator('.react-flow__edge')

const BARRA_MS = 100
const REPETICOES = 15

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

async function abrirEnvelope(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await editor(page).fill(documentoEnvelope())
  await expect(caixas(page)).toHaveCount(N_NOS, { timeout: 90_000 })
  await expect(arestas(page)).toHaveCount(N_CONEX, { timeout: 90_000 })
  await page.waitForTimeout(600)
}

test('envelope 400/500: ajustar e resetar RESPONDEM em ≤100ms na mediana', async ({ page }) => {
  test.setTimeout(240_000)
  await abrirEnvelope(page)

  const medidas = await page.evaluate(async (repeticoes) => {
    const vp = document.querySelector('.react-flow__viewport') as HTMLElement
    const rAF = () => new Promise((r) => requestAnimationFrame(r))

    /** Dispara um atalho e cronometra até o enquadramento COMEÇAR a mudar. */
    const responder = async (code: string): Promise<number> => {
      const antes = vp.style.transform
      const t0 = performance.now()
      window.dispatchEvent(new KeyboardEvent('keydown', { code, shiftKey: true, bubbles: true }))
      let voltas = 0
      while (vp.style.transform === antes && voltas < 60) {
        await rAF()
        voltas++
      }
      return performance.now() - t0
    }

    const ajustar: number[] = []
    const resetar: number[] = []
    for (let k = 0; k < repeticoes; k++) {
      ajustar.push(await responder('Digit1')) // Shift + 1
      await new Promise((r) => setTimeout(r, 260)) // deixa o trânsito assentar
      resetar.push(await responder('Digit0')) // Shift + 0
      await new Promise((r) => setTimeout(r, 260))
    }
    return { ajustar, resetar }
  }, REPETICOES)

  const medAjustar = mediana(medidas.ajustar)
  const medResetar = mediana(medidas.resetar)
  // eslint-disable-next-line no-console
  console.log(`SC-012 @400/500: ajustar=${medAjustar.toFixed(1)}ms · resetar=${medResetar.toFixed(1)}ms`)

  expect(medAjustar).toBeLessThanOrEqual(BARRA_MS)
  expect(medResetar).toBeLessThanOrEqual(BARRA_MS)
})

test('envelope 400/500: gesto no meio do trânsito — 0 enfileiramentos, 0 ignorados', async ({ page }) => {
  test.setTimeout(240_000)
  await abrirEnvelope(page)

  const r = await page.evaluate(async () => {
    const vp = document.querySelector('.react-flow__viewport') as HTMLElement
    const rAF = () => new Promise((r) => requestAnimationFrame(r))
    const atirar = (code: string) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { code, shiftKey: true, bubbles: true }))

    // quatro gestos em rajada, todos DENTRO da janela de trânsito de 180ms
    atirar('Digit1')
    await new Promise((r) => setTimeout(r, 40))
    atirar('Digit0')
    await new Promise((r) => setTimeout(r, 40))
    atirar('Digit1')
    await new Promise((r) => setTimeout(r, 40))
    atirar('Digit0') // este é o que ASSUME

    // deixa o último trânsito terminar…
    await new Promise((r) => setTimeout(r, 500))
    const aoTerminar = vp.style.transform

    // …e confere que NADA mais se move depois: 0 gestos enfileirados esperando a vez
    for (let k = 0; k < 40; k++) await rAF()
    return { aoTerminar, depois: vp.style.transform }
  })

  // o destino final é o do gesto que assumiu (resetar → escala 1), e ele é estável
  expect(r.depois).toBe(r.aoTerminar)
  expect(r.aoTerminar).toMatch(/scale\(1\)/)
})
