import { test, expect, type Page } from '@playwright/test'

// US2 — TRABALHO NA PROPORÇÃO QUE ESCOLHI (T021).
// Os 6 cenários de aceite: a proporção permanece, satura nos mínimos, redimensionar
// não reenquadra, o código não carrega vestígio, a RAZÃO é estável sob mudança de
// janela, e abaixo da soma dos mínimos quem cede é a página.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const trabalho = (page: Page) => page.locator('[data-testid=area-de-trabalho]')
const vistaEditor = (page: Page) => page.locator('.vista-editor')
const divisao = (page: Page) => page.locator('[data-testid=divisao]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')

async function enquadramento(page: Page) {
  const s = (await page.locator('.react-flow__viewport').getAttribute('style')) ?? ''
  const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(s)
  if (!m) throw new Error(`transform ilegível: ${s}`)
  return { x: +m[1], y: +m[2], zoom: +m[3] }
}

/** O ponto do PLANO que está no centro da área visível agora. */
async function centroNoPlano(page: Page) {
  const a = (await area(page).boundingBox())!
  const e = await enquadramento(page)
  // a barra de controles ocupa a faixa inferior; o centro medido aqui é o do
  // retângulo bruto, que basta para asserir "0 deslocamento" comparando iguais.
  return { x: (a.width / 2 - e.x) / e.zoom, y: (a.height / 2 - e.y) / e.zoom }
}

/** A razão do editor, medida na renderização. */
async function razaoRenderizada(page: Page) {
  const t = (await trabalho(page).boundingBox())!
  const ed = (await vistaEditor(page).boundingBox())!
  return ed.width / t.width
}

const DOC = ['flowchart TD', 'n1[Alfa]', 'n2[Beta]', 'n3[Gama]', 'n1 --> n2'].join('\n')

async function abrir(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await editor(page).fill(DOC)
  await expect(caixas(page)).toHaveCount(3)
  await page.waitForTimeout(150)
}

async function arrastarDivisao(page: Page, deltaX: number) {
  const d = (await divisao(page).boundingBox())!
  const y = d.y + d.height / 2
  await page.mouse.move(d.x + d.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(d.x + d.width / 2 + deltaX, y, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
}

test('US2-1: a proporção arrastada PERMANECE enquanto ela trabalha', async ({ page }) => {
  await abrir(page)
  expect(await razaoRenderizada(page)).toBeCloseTo(0.42, 2)

  await arrastarDivisao(page, -300) // mais espaço para o editor
  const escolhida = await razaoRenderizada(page)
  expect(escolhida).toBeGreaterThan(0.42)

  // ela continua trabalhando: editar o código não mexe na proporção
  await editor(page).fill(DOC + '\nn4[Delta]')
  await expect(caixas(page)).toHaveCount(4)
  await page.waitForTimeout(150)
  expect(await razaoRenderizada(page)).toBeCloseTo(escolhida, 3)
})

test('US2-2: o arrasto SATURA no mínimo de cada vista — nenhuma some', async ({ page }) => {
  await abrir(page)
  const t = (await trabalho(page).boundingBox())!

  await arrastarDivisao(page, -2000) // ao extremo do editor
  let ed = (await vistaEditor(page).boundingBox())!
  let ar = (await area(page).boundingBox())!
  expect(ar.width).toBeGreaterThanOrEqual(480 - 1)
  expect(ed.width).toBeGreaterThanOrEqual(320 - 1)
  expect(ed.width + ar.width).toBeLessThanOrEqual(t.width + 2)

  await arrastarDivisao(page, 2000) // ao extremo do diagrama
  ed = (await vistaEditor(page).boundingBox())!
  ar = (await area(page).boundingBox())!
  expect(ed.width).toBeGreaterThanOrEqual(320 - 1)
  expect(ed.width).toBeLessThanOrEqual(321)
  expect(ar.width).toBeGreaterThanOrEqual(480 - 1)
})

test('US2-3: redimensionar preserva zoom e ponto central, e 0 reenquadramentos', async ({ page }) => {
  await abrir(page)
  const areaR = (await area(page).boundingBox())!
  await page.mouse.move(areaR.x + areaR.width / 2, areaR.y + areaR.height / 2)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -240)
  await page.keyboard.up('Control')
  await page.waitForTimeout(200)

  const zoomAntes = (await enquadramento(page)).zoom
  const centroAntes = await centroNoPlano(page)

  // (a) a divisão arrastada
  await arrastarDivisao(page, -260)
  expect((await enquadramento(page)).zoom).toBeCloseTo(zoomAntes, 6) // 0 mudanças de zoom
  let centro = await centroNoPlano(page)
  expect(centro.x).toBeCloseTo(centroAntes.x, 0) // 0 deslocamento do ponto central
  expect(centro.y).toBeCloseTo(centroAntes.y, 0)

  // (b) a janela mudando de tamanho
  await page.setViewportSize({ width: 1100, height: 760 })
  await page.waitForTimeout(300)
  expect((await enquadramento(page)).zoom).toBeCloseTo(zoomAntes, 6)
  centro = await centroNoPlano(page)
  expect(centro.x).toBeCloseTo(centroAntes.x, 0)
  expect(centro.y).toBeCloseTo(centroAntes.y, 0)
})

test('US2-4: o código é byte-idêntico depois de arrastar a divisão', async ({ page }) => {
  await abrir(page)
  const antes = await editor(page).inputValue()
  await arrastarDivisao(page, -240)
  await arrastarDivisao(page, 180)
  expect(await editor(page).inputValue()).toBe(antes) // 0 diferenças (SC-001)
})

test('US2-5: mudar a JANELA muda os tamanhos, nunca a RAZÃO (SC-007)', async ({ page }) => {
  await abrir(page)
  await arrastarDivisao(page, -200)
  const razao = await razaoRenderizada(page)
  const larguraAntes = (await vistaEditor(page).boundingBox())!.width

  await page.setViewportSize({ width: 1800, height: 900 }) // alargar
  await page.waitForTimeout(250)
  expect(await razaoRenderizada(page)).toBeCloseTo(razao, 2)
  expect((await vistaEditor(page).boundingBox())!.width).toBeGreaterThan(larguraAntes)

  await page.setViewportSize({ width: 1200, height: 900 }) // estreitar
  await page.waitForTimeout(250)
  expect(await razaoRenderizada(page)).toBeCloseTo(razao, 2)

  await page.setViewportSize({ width: 1800, height: 900 }) // e a razão ORIGINAL volta
  await page.waitForTimeout(250)
  expect(await razaoRenderizada(page)).toBeCloseTo(razao, 2)
})

test('US2-6: janela abaixo de 800px — a área de trabalho para, e a PÁGINA rola', async ({ page }) => {
  await abrir(page)
  await page.setViewportSize({ width: 640, height: 800 })
  await page.waitForTimeout(300)

  // a área de trabalho parou de encolher na soma dos mínimos
  const t = (await trabalho(page).boundingBox())!
  expect(t.width).toBeGreaterThanOrEqual(800 - 1)

  // 0 vistas abaixo do próprio mínimo, 0 vistas ocultas
  const ed = (await vistaEditor(page).boundingBox())!
  const ar = (await area(page).boundingBox())!
  expect(ed.width).toBeGreaterThanOrEqual(320 - 1)
  expect(ar.width).toBeGreaterThanOrEqual(480 - 1)
  await expect(vistaEditor(page)).toBeVisible()
  await expect(area(page)).toBeVisible()

  // e quem cede é a página: ela passa a rolar horizontalmente
  const rolagem = await page.evaluate(() => {
    const r = document.getElementById('root')!
    return { scrollWidth: r.scrollWidth, clientWidth: r.clientWidth }
  })
  expect(rolagem.scrollWidth).toBeGreaterThan(rolagem.clientWidth)
})
