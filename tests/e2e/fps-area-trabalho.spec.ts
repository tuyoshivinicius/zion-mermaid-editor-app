import { test, expect, type Page } from '@playwright/test'
import { documentoEnvelope, N_NOS, N_CONEX } from '../fixtures/envelope'

// O ORÇAMENTO DO ENVELOPE (T014 / SC-003 / FR-016 / Princípio III).
//
// Zoom, arrasto do enquadramento, arrasto da divisão e o trânsito são gestos
// contínuos e medem-se pela MESMA barra do `NFR-03`: ≥50fps dentro de 400 nós e 500
// conexões. Esta spec mede o próprio consumo e não pode nascer estourando-o.
//
// O que sustenta a barra é o corte do plano: o gesto contínuo não passa pelo React.
// Zoom e arrasto do enquadramento correm no transform da engine; o arrasto da
// divisão escreve uma variável CSS por `ref`. O store é reconciliado no FIM do gesto.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const arestas = (page: Page) => page.locator('.react-flow__edge')

const BARRA_FPS = 50

/** Conta os quadros enquanto `gesto` corre, e devolve o fps mediano. */
async function fpsDurante(page: Page, gesto: () => Promise<void>): Promise<number> {
  await page.evaluate(() => {
    const w = window as unknown as { __marcos: number[]; __medindo: boolean }
    w.__marcos = []
    w.__medindo = true
    const passo = () => {
      if (!w.__medindo) return
      w.__marcos.push(performance.now())
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })

  await gesto()

  return page.evaluate(() => {
    const w = window as unknown as { __marcos: number[]; __medindo: boolean }
    w.__medindo = false
    const intervalos = w.__marcos
      .slice(1)
      .map((m, i) => m - w.__marcos[i])
      .sort((a, b) => a - b)
    if (intervalos.length < 4) return 0
    return 1000 / intervalos[Math.floor(intervalos.length / 2)]
  })
}

async function abrirEnvelope(page: Page) {
  await page.goto('/')
  await editor(page).fill(documentoEnvelope())
  await expect(caixas(page)).toHaveCount(N_NOS, { timeout: 90_000 })
  await expect(arestas(page)).toHaveCount(N_CONEX, { timeout: 90_000 })
  await page.waitForTimeout(400)
}

test('envelope 400/500: zoom e arrasto do enquadramento mantêm ≥50fps', async ({ page }) => {
  test.setTimeout(240_000)
  await abrirEnvelope(page)

  const area = (await page.locator('[data-testid=area-diagrama]').boundingBox())!
  const centro = { x: area.x + area.width / 2, y: area.y + area.height / 2 }

  // (1) ZOOM — gesto contínuo por roda com Ctrl (ancorado no ponteiro)
  const fpsZoom = await fpsDurante(page, async () => {
    await page.mouse.move(centro.x, centro.y)
    await page.keyboard.down('Control')
    for (let k = 0; k < 24; k++) {
      await page.mouse.wheel(0, k % 2 === 0 ? -100 : 100)
      await page.waitForTimeout(16)
    }
    await page.keyboard.up('Control')
  })

  // (2) ARRASTO DO ENQUADRAMENTO — modo hand, arrasto contínuo
  await page.locator('[data-testid=btn-modo-hand]').click()
  const fpsArrasto = await fpsDurante(page, async () => {
    await page.mouse.move(centro.x, centro.y)
    await page.mouse.down()
    for (let k = 0; k < 24; k++) {
      await page.mouse.move(centro.x + Math.sin(k / 3) * 120, centro.y + Math.cos(k / 3) * 80)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
  })

  // eslint-disable-next-line no-console
  console.log(`SC-003 @400/500: zoom=${fpsZoom.toFixed(0)}fps · arrasto=${fpsArrasto.toFixed(0)}fps`)

  expect(fpsZoom).toBeGreaterThanOrEqual(BARRA_FPS)
  expect(fpsArrasto).toBeGreaterThanOrEqual(BARRA_FPS)
})

// T022 — o terceiro gesto contínuo: o arrasto da DIVISÃO. Além do fps, ele carrega
// uma promessa própria: durante o gesto a razão é escrita na variável CSS por `ref`,
// então NENHUM dos 400 nós é re-renderizado. A prova é o DOM: se um re-render
// chegasse aos nós, o observador de mutações o veria.
test('envelope 400/500: o arrasto da divisão mantém ≥50fps e 0 re-renders dos nós', async ({ page }) => {
  test.setTimeout(240_000)
  await abrirEnvelope(page)

  await page.evaluate(() => {
    const w = window as unknown as { __mut: number; __obs: MutationObserver }
    const alvo = document.querySelector('.react-flow__nodes')!
    w.__mut = 0
    w.__obs = new MutationObserver((rs) => {
      w.__mut += rs.length
    })
    w.__obs.observe(alvo, { attributes: true, childList: true, subtree: true, characterData: true })
  })

  const d = (await page.locator('[data-testid=divisao]').boundingBox())!
  const y = d.y + d.height / 2

  const fpsDivisao = await fpsDurante(page, async () => {
    await page.mouse.move(d.x + d.width / 2, y)
    await page.mouse.down()
    for (let k = 0; k < 24; k++) {
      await page.mouse.move(d.x + d.width / 2 - k * 8, y)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
  })

  const mutacoes = await page.evaluate(() => {
    const w = window as unknown as { __mut: number; __obs: MutationObserver }
    w.__obs.disconnect()
    return w.__mut
  })

  // eslint-disable-next-line no-console
  console.log(`SC-003 @400/500: divisão=${fpsDivisao.toFixed(0)}fps · mutações nos nós=${mutacoes}`)

  expect(fpsDivisao).toBeGreaterThanOrEqual(BARRA_FPS)
  expect(mutacoes).toBe(0)
})

// T053 — o QUARTO gesto contínuo: o TRÂNSITO. Ele é gesto contínuo para todos os
// efeitos (`FR-016`) e mede-se pela mesma barra. Um quadro de trânsito é UM transform
// CSS do painel: 0 reprojeções, 0 re-renders dos 400 nós, 0 recomputações de extensão
// — o único trabalho novo por quadro é interpolar três números.
//
// Se este portão reprovar, o recuo declarado é SALTAR em vez de transitar: a spec fixa
// o destino, não o caminho, e os dois estados finais são idênticos (research §7).
test('envelope 400/500: o trânsito mantém ≥50fps', async ({ page }) => {
  test.setTimeout(240_000)
  await abrirEnvelope(page)

  const fpsTransito = await fpsDurante(page, async () => {
    // alterna ajustar/resetar mantendo a janela de 180ms sempre ocupada
    for (let k = 0; k < 8; k++) {
      await page.evaluate((code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, shiftKey: true, bubbles: true }))
      }, k % 2 === 0 ? 'Digit1' : 'Digit0')
      await page.waitForTimeout(190)
    }
  })

  // eslint-disable-next-line no-console
  console.log(`SC-003 @400/500: trânsito=${fpsTransito.toFixed(0)}fps`)
  expect(fpsTransito).toBeGreaterThanOrEqual(BARRA_FPS)
})
