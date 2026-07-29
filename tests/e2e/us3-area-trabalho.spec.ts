import { test, expect, type Page } from '@playwright/test'
import { documentoEnvelope, N_NOS } from '../fixtures/envelope'

// US3 — DEVOLVO O DIAGRAMA AO QUADRO, OU O ZOOM AO NATURAL (T031).
// Dois gestos com duas promessas: ajustar à tela reenquadra e reescala; resetar o
// zoom só reescala. E a área de trabalho ABRE já ajustada quando há conteúdo.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const nivel = (page: Page) => page.locator('[data-testid=nivel-zoom]')

const DURACAO_TRANSITO = 180

async function enquadramento(page: Page) {
  const s = (await page.locator('.react-flow__viewport').getAttribute('style')) ?? ''
  const m = /translate\((-?[\d.e]+)px,\s*(-?[\d.e]+)px\)\s*scale\(([\d.e-]+)\)/.exec(s)
  if (!m) throw new Error(`transform ilegível: ${s}`)
  return { x: +m[1], y: +m[2], zoom: +m[3] }
}

/** Espera o trânsito (180ms) terminar e o enquadramento assentar. */
const assentar = (page: Page) => page.waitForTimeout(DURACAO_TRANSITO + 220)

async function abrir(page: Page, doc: string, nos: number) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await editor(page).fill(doc)
  await expect(caixas(page)).toHaveCount(nos, { timeout: 90_000 })
  await assentar(page)
}

/** Leva a vista para um lugar arbitrário — a "partida" de cada cenário. */
async function partirDe(page: Page, e: { x: number; y: number; zoom: number }) {
  const a = (await area(page).boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.keyboard.down('Control')
  for (let k = 0; k < 6; k++) await page.mouse.wheel(0, e.zoom > 1 ? -120 : 120)
  await page.keyboard.up('Control')
  await page.locator('[data-testid=btn-modo-hand]').click()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + e.x, a.y + a.height / 2 + e.y, { steps: 6 })
  await page.mouse.up()
  await page.locator('[data-testid=btn-modo-hand]').click()
  await page.waitForTimeout(120)
}

/** Todo elemento visível está DENTRO do retângulo da área do diagrama? */
async function todosDentro(page: Page) {
  const a = (await area(page).boundingBox())!
  const barra = (await page.locator('[data-testid=controles-enquadramento]').boundingBox())!
  return page.evaluate(
    ({ a, barra }) => {
      const fora: string[] = []
      const alvos = document.querySelectorAll('.react-flow__node, .react-flow__edge path.react-flow__edge-path')
      for (const el of alvos) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        const dentro =
          r.left >= a.x - 0.5 && r.top >= a.y - 0.5 && r.right <= a.x + a.width + 0.5 && r.bottom <= barra.y + 0.5
        if (!dentro) fora.push((el as HTMLElement).dataset.id ?? el.className.toString())
      }
      return fora
    },
    { a, barra },
  )
}

const DOC3 = ['flowchart TD', 'n1[Alfa]', 'n2[Beta]', 'n3[Gama]', 'n1 --> n2', 'n2 --> n3'].join('\n')

test('US3-1: 3 partidas distintas → 1 estado final, centralizado (SC-004)', async ({ page }) => {
  const finais: { x: number; y: number; zoom: number }[] = []
  for (const partida of [
    { x: -300, y: -200, zoom: 2 },
    { x: 420, y: 260, zoom: 0.4 },
    { x: 0, y: 0, zoom: 1 },
  ]) {
    await abrir(page, DOC3, 3)
    await partirDe(page, partida)
    await page.locator('[data-testid=btn-ajustar]').click()
    await assentar(page)
    finais.push(await enquadramento(page))
  }

  // 1 estado final a partir de N partidas — 0 desvios
  for (const f of finais.slice(1)) {
    expect(f.x).toBeCloseTo(finais[0].x, 1)
    expect(f.y).toBeCloseTo(finais[0].y, 1)
    expect(f.zoom).toBeCloseTo(finais[0].zoom, 6)
  }
  expect(await todosDentro(page)).toEqual([]) // 100% dos elementos dentro
})

test('US3-2: um nó só fica visível e centralizado, SEM ampliar além do natural (SC-005)', async ({ page }) => {
  await abrir(page, 'flowchart TD\nn1[Só este]', 1)
  await partirDe(page, { x: 200, y: 150, zoom: 0.4 })
  await page.locator('[data-testid=btn-ajustar]').click()
  await assentar(page)

  const e = await enquadramento(page)
  expect(e.zoom).toBeCloseTo(1, 6) // 0 ajustes ultrapassam o tamanho natural

  // e CENTRALIZADO: é o centro que responde quando a escala não decide nada
  const a = (await area(page).boundingBox())!
  const barra = (await page.locator('[data-testid=controles-enquadramento]').boundingBox())!
  const caixa = (await caixas(page).first().boundingBox())!
  const centroCaixa = { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 }
  expect(centroCaixa.x).toBeCloseTo(a.x + a.width / 2, 0)
  expect(centroCaixa.y).toBeCloseTo(a.y + (barra.y - a.y) / 2, 0)
})

test('US3-3: diagrama VAZIO — ajustar à tela não acusa erro', async ({ page }) => {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto('/')
  await editor(page).fill('flowchart TD')
  await page.waitForTimeout(200)

  await page.locator('[data-testid=btn-ajustar]').click()
  await assentar(page)

  expect(erros).toEqual([])
  const e = await enquadramento(page)
  expect(e.zoom).toBeCloseTo(1, 6)
  await expect(area(page)).toBeVisible()
})

test('US3-4: resetar leva ao natural EXATO com 0 deslocamento do centro (SC-006)', async ({ page }) => {
  await abrir(page, DOC3, 3)
  await partirDe(page, { x: -180, y: 120, zoom: 2 })

  const antes = await enquadramento(page)
  const a = (await area(page).boundingBox())!
  const barra = (await page.locator('[data-testid=controles-enquadramento]').boundingBox())!
  const centroQuadro = { x: a.width / 2, y: (barra.y - a.y) / 2 }
  const noPlanoAntes = {
    x: (centroQuadro.x - antes.x) / antes.zoom,
    y: (centroQuadro.y - antes.y) / antes.zoom,
  }

  await nivel(page).click() // o indicador É o botão de resetar
  await assentar(page)

  const depois = await enquadramento(page)
  expect(depois.zoom).toBe(1) // tamanho natural EXATO
  const noPlanoDepois = {
    x: (centroQuadro.x - depois.x) / depois.zoom,
    y: (centroQuadro.y - depois.y) / depois.zoom,
  }
  expect(noPlanoDepois.x).toBeCloseTo(noPlanoAntes.x, 0) // 0 deslocamento
  expect(noPlanoDepois.y).toBeCloseTo(noPlanoAntes.y, 0)
})

test('US3-5: arranjo e código intocados depois dos dois gestos (SC-002, SC-001)', async ({ page }) => {
  await abrir(page, DOC3, 3)
  const codigo = await editor(page).inputValue()

  const posNoPlano = async () => {
    const e = await enquadramento(page)
    const a = (await area(page).boundingBox())!
    const saida: { x: number; y: number }[] = []
    for (let i = 0; i < 3; i++) {
      const r = (await caixas(page).nth(i).boundingBox())!
      saida.push({ x: (r.x - a.x - e.x) / e.zoom, y: (r.y - a.y - e.y) / e.zoom })
    }
    return saida
  }
  const antes = await posNoPlano()

  await page.locator('[data-testid=btn-ajustar]').click()
  await assentar(page)
  await nivel(page).click()
  await assentar(page)

  const depois = await posNoPlano()
  for (let i = 0; i < 3; i++) {
    expect(depois[i].x).toBeCloseTo(antes[i].x, 0) // 0 elementos movidos
    expect(depois[i].y).toBeCloseTo(antes[i].y, 0)
  }
  expect(await editor(page).inputValue()).toBe(codigo) // byte-idêntico
})

test('US3-6: envelope DENTRO da faixa; espalhado à mão, ABAIXO do piso (SC-005)', async ({ page }) => {
  test.setTimeout(240_000)
  // `SC-005` mede o compromisso da faixa contra a ÁREA DE REFERÊNCIA (1280×720): é
  // com a área do diagrama nesse tamanho OU MAIOR que a escala do envelope
  // determinístico fica dentro da faixa. Com a área menor, o gesto continua
  // entregando o diagrama inteiro — abaixo do piso, pela válvula que ele já tem.
  await page.setViewportSize({ width: 2400, height: 1000 })
  await page.goto('/')
  await editor(page).fill(documentoEnvelope())
  await expect(caixas(page)).toHaveCount(N_NOS, { timeout: 90_000 })
  await assentar(page)
  expect((await area(page).boundingBox())!.width).toBeGreaterThanOrEqual(1280)

  // (a) arranjo determinístico, área ≥ referência → escala DENTRO da faixa
  await page.locator('[data-testid=btn-ajustar]').click()
  await assentar(page)
  const determinístico = await enquadramento(page)
  expect(determinístico.zoom).toBeGreaterThanOrEqual(0.01)
  expect(determinístico.zoom).toBeLessThanOrEqual(4)

  // (b) o mesmo envelope numa área MENOR que a referência: o gesto desce abaixo do
  // piso em vez de entregar "quase tudo" — e nada é recortado
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.waitForTimeout(400)
  await page.locator('[data-testid=btn-ajustar]').click()
  await assentar(page)
  const espalhado = await enquadramento(page)
  expect(espalhado.zoom).toBeLessThan(0.01) // desceu abaixo do piso declarado
  expect(espalhado.zoom).toBeLessThan(determinístico.zoom)

  // (c) afastar mais SATURA no nível corrente — não salta para o piso
  const a = (await area(page).boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.keyboard.down('Control')
  for (let k = 0; k < 12; k++) await page.mouse.wheel(0, 300)
  await page.keyboard.up('Control')
  await page.waitForTimeout(250)
  const saturado = await enquadramento(page)
  expect(saturado.zoom).toBeCloseTo(Math.min(espalhado.zoom, 0.01), 6)

  // (d) aproximar traz de volta
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -300)
  await page.keyboard.up('Control')
  await page.waitForTimeout(250)
  expect((await enquadramento(page)).zoom).toBeGreaterThan(saturado.zoom)

  // (e) apagar conteúdo NÃO reescala sozinho
  const antesDeApagar = await enquadramento(page)
  await editor(page).fill('flowchart TD\nn1[A]\nn2[B]')
  await expect(caixas(page)).toHaveCount(2, { timeout: 60_000 })
  await page.waitForTimeout(400)
  const depoisDeApagar = await enquadramento(page)
  expect(depoisDeApagar.zoom).toBeCloseTo(antesDeApagar.zoom, 6) // 0 reescalonamentos
})

test('US3-7: gesto novo no meio do trânsito INTERROMPE E ASSUME (SC-012)', async ({ page }) => {
  await abrir(page, DOC3, 3)
  await partirDe(page, { x: -260, y: 180, zoom: 2 })

  // aciona ajustar e, ANTES de o trânsito terminar, aciona resetar
  await page.locator('[data-testid=btn-ajustar]').click()
  await page.waitForTimeout(60) // no meio dos 180ms
  await nivel(page).click()
  await assentar(page)

  // 0 enfileiramentos: o destino final é o do gesto que ASSUMIU, não um meio-termo
  expect((await enquadramento(page)).zoom).toBe(1)

  // e o estado assenta: nenhum quadro pendente move a vista depois
  const parado = await enquadramento(page)
  await page.waitForTimeout(400)
  expect(await enquadramento(page)).toEqual(parado)
})

test('US3-7b: a área de trabalho ABRE já ajustada quando há conteúdo (SC-013)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  // um documento inteiro colado, com o arranjo determinístico longe da origem
  const doc = ['flowchart TD', ...Array.from({ length: 30 }, (_, i) => `n${i + 1}[Passo ${i + 1}]`)].join('\n')
  await editor(page).fill(doc)
  await expect(caixas(page)).toHaveCount(30, { timeout: 60_000 })
  await assentar(page)

  // 0 gestos dela, e 100% dos elementos dentro
  expect(await todosDentro(page)).toEqual([])
  expect((await enquadramento(page)).zoom).toBeLessThan(1) // coube reduzindo
})

test('US3-8: os atalhos sem ponteiro — Shift+1 ajusta, Shift+0 reseta (FR-018)', async ({ page }) => {
  await abrir(page, DOC3, 3)
  await partirDe(page, { x: -200, y: 140, zoom: 2 })

  await page.locator('.react-flow__pane').click({ position: { x: 30, y: 30 } })
  await page.keyboard.press('Shift+Digit1')
  await assentar(page)
  expect(await todosDentro(page)).toEqual([])

  await page.keyboard.press('Shift+Digit0')
  await assentar(page)
  expect((await enquadramento(page)).zoom).toBe(1)
})

test('US3-9: com o foco no editor de código, os atalhos NÃO disparam (guarda única)', async ({ page }) => {
  await abrir(page, DOC3, 3)
  await partirDe(page, { x: -200, y: 140, zoom: 2 })
  const antes = await enquadramento(page)

  await editor(page).click()
  await page.keyboard.press('Shift+Digit1')
  await page.keyboard.press('Shift+Digit0')
  await page.keyboard.press('Control+Equal')
  await assentar(page)

  expect(await enquadramento(page)).toEqual(antes) // 0 gestos disparados
})
