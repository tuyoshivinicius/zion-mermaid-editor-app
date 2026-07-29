import { test, expect, type Page } from '@playwright/test'

// US1 — NAVEGO NUM DIAGRAMA MAIOR QUE A TELA (T013).
// Os 7 cenários de aceite da história: zoom ancorado, saturação legível, a rolagem
// herdada do R0 intacta, o modo hand nas suas três formas, a fronteira com a seleção
// retangular declarada pelo cursor, o trabalho em curso preservado, e o arrasto que
// não se interrompe.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')
const nivel = (page: Page) => page.locator('[data-testid=nivel-zoom]')
const pane = (page: Page) => page.locator('.react-flow__pane')

/** O enquadramento corrente, lido do transform do painel. */
async function enquadramento(page: Page) {
  const s = (await page.locator('.react-flow__viewport').getAttribute('style')) ?? ''
  const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(s)
  if (!m) throw new Error(`transform ilegível: ${s}`)
  return { x: +m[1], y: +m[2], zoom: +m[3] }
}

/** A posição NO PLANO de um nó, retro-calculada da tela pelo transform corrente. */
async function posicaoNoPlano(page: Page, indice: number) {
  const caixa = caixas(page).nth(indice)
  const r = (await caixa.boundingBox())!
  const areaR = (await area(page).boundingBox())!
  const e = await enquadramento(page)
  return { x: (r.x - areaR.x - e.x) / e.zoom, y: (r.y - areaR.y - e.y) / e.zoom }
}

const DOC = ['flowchart TD', 'n1[Alfa]', 'n2[Beta]', 'n3[Gama]', 'n1 --> n2', 'n2 --> n3'].join('\n')

async function abrir(page: Page, doc = DOC) {
  await page.goto('/')
  await editor(page).fill(doc)
  await expect(caixas(page)).toHaveCount(doc.split('\n').filter((l) => /^n\d+\[/.test(l)).length)
  await page.waitForTimeout(120)
}

async function rodaComCtrl(page: Page, ponto: { x: number; y: number }, delta: number) {
  await page.mouse.move(ponto.x, ponto.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, delta)
  await page.keyboard.up('Control')
  await page.waitForTimeout(120)
}

test('US1-1: o zoom ancora no ponteiro e nenhum elemento muda de posição no plano', async ({ page }) => {
  await abrir(page)
  const antes = await posicaoNoPlano(page, 0)
  const areaR = (await area(page).boundingBox())!
  const ponto = { x: areaR.x + areaR.width * 0.7, y: areaR.y + areaR.height * 0.3 }

  const e0 = await enquadramento(page)
  const planoSobPonteiroAntes = {
    x: (ponto.x - areaR.x - e0.x) / e0.zoom,
    y: (ponto.y - areaR.y - e0.y) / e0.zoom,
  }

  await rodaComCtrl(page, ponto, -240) // aproximar

  const e1 = await enquadramento(page)
  expect(e1.zoom).toBeGreaterThan(e0.zoom)

  const planoSobPonteiroDepois = {
    x: (ponto.x - areaR.x - e1.x) / e1.zoom,
    y: (ponto.y - areaR.y - e1.y) / e1.zoom,
  }
  // o ponto do plano sob o ponteiro continua sob o ponteiro (FR-002)
  expect(planoSobPonteiroDepois.x).toBeCloseTo(planoSobPonteiroAntes.x, 0)
  expect(planoSobPonteiroDepois.y).toBeCloseTo(planoSobPonteiroAntes.y, 0)

  // e nenhum elemento mudou de posição NO PLANO (SC-002)
  const depois = await posicaoNoPlano(page, 0)
  expect(depois.x).toBeCloseTo(antes.x, 0)
  expect(depois.y).toBeCloseTo(antes.y, 0)
})

test('US1-2: o zoom SATURA nos limites, continua respondendo e o nível fica legível', async ({ page }) => {
  await abrir(page)
  const areaR = (await area(page).boundingBox())!
  const ponto = { x: areaR.x + areaR.width / 2, y: areaR.y + areaR.height / 2 }

  // afastar até o limite
  for (let k = 0; k < 40; k++) await rodaComCtrl(page, ponto, 400)
  const noPiso = await enquadramento(page)
  expect(noPiso.zoom).toBeCloseTo(0.01, 3)

  // continua RESPONDENDO: afastar de novo não trava nem salta
  await rodaComCtrl(page, ponto, 400)
  expect((await enquadramento(page)).zoom).toBeCloseTo(0.01, 3)
  await expect(area(page)).toBeVisible()

  // aproximar volta a subir
  await rodaComCtrl(page, ponto, -400)
  expect((await enquadramento(page)).zoom).toBeGreaterThan(0.01)

  // aproximar até o teto
  for (let k = 0; k < 60; k++) await rodaComCtrl(page, ponto, -400)
  expect((await enquadramento(page)).zoom).toBeCloseTo(4, 2)

  // o nível corrente permanece LEGÍVEL (FR-001)
  await expect(nivel(page)).toBeVisible()
  await expect(nivel(page)).toHaveText(/^\d+ %$/)
  expect(Number(await nivel(page).getAttribute('data-nivel'))).toBe(400)
})

test('US1-3: a roda PURA continua rolando o plano — a rolagem herdada do R0 (FR-005)', async ({ page }) => {
  await abrir(page)
  const antes = await enquadramento(page)
  const areaR = (await area(page).boundingBox())!

  await page.mouse.move(areaR.x + areaR.width / 2, areaR.y + areaR.height / 2)
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(150)

  const depois = await enquadramento(page)
  expect(depois.zoom).toBeCloseTo(antes.zoom, 6) // rolar não é dar zoom
  expect(depois.y).not.toBeCloseTo(antes.y, 1) // mas o plano rolou
})

test('US1-4: modo hand — persistente, temporário (Espaço) e o botão do meio', async ({ page }) => {
  await abrir(page)
  const codigoAntes = await editor(page).inputValue()
  const posAntes = await posicaoNoPlano(page, 0)
  const areaR = (await area(page).boundingBox())!
  const vazio = { x: areaR.x + areaR.width * 0.75, y: areaR.y + areaR.height * 0.8 }

  // (a) persistente — a alternância da barra
  await page.locator('[data-testid=btn-modo-hand]').click()
  await expect(area(page)).toHaveAttribute('data-modo-hand', 'on')
  const e0 = await enquadramento(page)
  await page.mouse.move(vazio.x, vazio.y)
  await page.mouse.down()
  await page.mouse.move(vazio.x - 120, vazio.y - 60, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(120)
  const e1 = await enquadramento(page)
  expect(e1.x).toBeLessThan(e0.x) // a área visível se deslocou
  expect(e1.zoom).toBeCloseTo(e0.zoom, 6)
  await page.locator('[data-testid=btn-modo-hand]').click()
  await expect(area(page)).toHaveAttribute('data-modo-hand', 'off')

  // (b) temporário — segurar Espaço, e VOLTAR ao soltar
  await page.locator('.react-flow__pane').click({ position: { x: 40, y: 40 } })
  await page.keyboard.down('Space')
  await expect(area(page)).toHaveAttribute('data-modo-hand', 'on')
  const e2 = await enquadramento(page)
  await page.mouse.move(vazio.x, vazio.y)
  await page.mouse.down()
  await page.mouse.move(vazio.x + 90, vazio.y + 40, { steps: 6 })
  await page.mouse.up()
  await page.keyboard.up('Space')
  await expect(area(page)).toHaveAttribute('data-modo-hand', 'off')
  expect((await enquadramento(page)).x).toBeGreaterThan(e2.x)

  // (c) no modo hand o arrasto pega o PLANO também SOBRE UM ELEMENTO (FR-003)
  await page.locator('[data-testid=btn-modo-hand]').click()
  const sobreONo = (await caixas(page).first().boundingBox())!
  const posAntesDoArrasto = await posicaoNoPlano(page, 0)
  const eSobreNo = await enquadramento(page)
  await page.mouse.move(sobreONo.x + sobreONo.width / 2, sobreONo.y + sobreONo.height / 2)
  await page.mouse.down()
  await page.mouse.move(sobreONo.x + sobreONo.width / 2 - 110, sobreONo.y + sobreONo.height / 2 - 70, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(150)
  expect((await enquadramento(page)).x).toBeLessThan(eSobreNo.x) // a vista se deslocou
  const posDepoisDoArrasto = await posicaoNoPlano(page, 0)
  expect(posDepoisDoArrasto.x).toBeCloseTo(posAntesDoArrasto.x, 0) // e o nó NÃO se moveu
  expect(posDepoisDoArrasto.y).toBeCloseTo(posAntesDoArrasto.y, 0)
  await page.locator('[data-testid=btn-modo-hand]').click()

  // (d) o gesto auxiliar: o BOTÃO DO MEIO, sem entrar no modo
  const e3 = await enquadramento(page)
  await page.mouse.move(vazio.x, vazio.y)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(vazio.x - 70, vazio.y, { steps: 6 })
  await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(120)
  expect((await enquadramento(page)).x).toBeLessThan(e3.x)
  await expect(area(page)).toHaveAttribute('data-modo-hand', 'off')

  // 0 elementos movidos, criados, selecionados; código byte-idêntico (FR-003)
  const posDepois = await posicaoNoPlano(page, 0)
  expect(posDepois.x).toBeCloseTo(posAntes.x, 0)
  expect(posDepois.y).toBeCloseTo(posAntes.y, 0)
  expect(await editor(page).inputValue()).toBe(codigoAntes)
  await expect(caixas(page)).toHaveCount(3)
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(0)
})

test('US1-4b: fora do modo, o arrasto no vazio nasce SELEÇÃO — e o cursor declarava', async ({ page }) => {
  await abrir(page)
  const areaR = (await area(page).boundingBox())!

  // o cursor declara o destino ANTES do primeiro pixel (SC-014)
  await expect(pane(page)).toHaveCSS('cursor', 'crosshair')

  const e0 = await enquadramento(page)
  await page.mouse.move(areaR.x + 20, areaR.y + 20)
  await page.mouse.down()
  await page.mouse.move(areaR.x + areaR.width - 40, areaR.y + areaR.height - 80, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(120)

  // nasceu seleção retangular, não deslocamento
  await expect(page.locator('.react-flow__node.selected')).not.toHaveCount(0)
  const e1 = await enquadramento(page)
  expect(e1.x).toBeCloseTo(e0.x, 1)
  expect(e1.y).toBeCloseTo(e0.y, 1)

  // no modo hand o cursor declara o OUTRO destino
  await page.locator('[data-testid=btn-modo-hand]').click()
  await expect(pane(page)).toHaveCSS('cursor', 'grab')
})

// SC-010 mede o EFEITO DO GESTO desta spec: o que estava aberto continua aberto, e a
// seleção que existia continua a mesma. Por isso as duas metades são asseridas contra
// o estado imediatamente ANTES do gesto — o gesto não pode encerrar, descartar nem
// mudar nada; o que ele encontrar, ele devolve.

test('US1-5a: a SELEÇÃO ativa sobrevive ao zoom e ao arrasto do enquadramento (SC-010)', async ({ page }) => {
  await abrir(page)
  const areaR = (await area(page).boundingBox())!
  const centro = { x: areaR.x + areaR.width / 2, y: areaR.y + areaR.height / 2 }

  await caixas(page).first().click()
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(1)

  await rodaComCtrl(page, centro, -200)
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(1) // 0 mudanças

  await page.locator('[data-testid=btn-modo-hand]').click()
  await page.mouse.move(centro.x, centro.y)
  await page.mouse.down()
  await page.mouse.move(centro.x - 90, centro.y - 50, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(120)
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(1) // 0 mudanças

  // e entrar/sair do modo hand também não mexe na seleção (SC-014)
  await page.locator('[data-testid=btn-modo-hand]').click()
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(1)
})

test('US1-5b: o RÓTULO EM EDIÇÃO continua aberto e acompanha o elemento (SC-010)', async ({ page }) => {
  await abrir(page)
  const areaR = (await area(page).boundingBox())!
  const centro = { x: areaR.x + areaR.width / 2, y: areaR.y + areaR.height / 2 }

  await caixas(page).first().dblclick()
  const campo = page.locator('[data-testid=editor-rotulo]')
  await expect(campo).toBeVisible()
  await campo.fill('Em edição')

  const antes = (await campo.boundingBox())!
  const e0 = await enquadramento(page)

  await rodaComCtrl(page, centro, -200)

  // 0 edições encerradas: continua aberta, com o que ela digitou
  await expect(campo).toBeVisible()
  await expect(campo).toHaveValue('Em edição')
  await expect(campo).toBeFocused()

  // e ACOMPANHA o elemento: cresceu na escala nova, porque é filho do painel
  const depois = (await campo.boundingBox())!
  const e1 = await enquadramento(page)
  expect(e1.zoom).toBeGreaterThan(e0.zoom)
  expect(depois.width / antes.width).toBeCloseTo(e1.zoom / e0.zoom, 1)
})

test('US1-6: rajada de zoom e arrasto deixa o código byte-idêntico (FR-013, FR-014)', async ({ page }) => {
  await abrir(page)
  const antes = await editor(page).inputValue()
  const areaR = (await area(page).boundingBox())!
  const centro = { x: areaR.x + areaR.width / 2, y: areaR.y + areaR.height / 2 }

  await page.locator('[data-testid=btn-modo-hand]').click()
  for (let k = 0; k < 10; k++) {
    await rodaComCtrl(page, centro, k % 2 === 0 ? -160 : 160)
    await page.mouse.move(centro.x, centro.y)
    await page.mouse.down()
    await page.mouse.move(centro.x + (k % 3) * 25 - 25, centro.y + 15, { steps: 3 })
    await page.mouse.up()
  }
  await page.waitForTimeout(200)

  expect(await editor(page).inputValue()).toBe(antes) // 0 diferenças (SC-001)
})

test('US1-7: zoom no meio de um arrasto de nó — 0 cancelamentos e 0 saltos (SC-010)', async ({ page }) => {
  await abrir(page)
  const caixa = caixas(page).first()
  const box = (await caixa.boundingBox())!
  const pegada = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

  const planoAntes = await posicaoNoPlano(page, 0)

  await page.mouse.move(pegada.x, pegada.y)
  await page.mouse.down()
  await page.mouse.move(pegada.x + 40, pegada.y + 30, { steps: 4 })

  // …e SEM soltar: zoom por roda (ancorado no ponteiro) e por Ctrl + = (no centro)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -180)
  await page.keyboard.up('Control')
  await page.waitForTimeout(80)
  await page.keyboard.press('Control+Equal')
  await page.waitForTimeout(80)

  // o arrasto CONTINUA — não cancelado, não concluído à força, não inerte
  const e = await enquadramento(page)
  const antesDoUltimoPasso = (await caixa.boundingBox())!
  await page.mouse.move(pegada.x + 80, pegada.y + 30, { steps: 4 })
  await page.waitForTimeout(60)
  const depoisDoUltimoPasso = (await caixa.boundingBox())!

  // o elemento acompanhou o ponteiro pelos 40px de tela que ele pediu, e nada mais:
  // 0 deslocamentos além do que o ponteiro pediu (SC-010)
  expect(depoisDoUltimoPasso.x - antesDoUltimoPasso.x).toBeCloseTo(40, 0)
  expect(depoisDoUltimoPasso.y - antesDoUltimoPasso.y).toBeCloseTo(0, 0)

  await page.mouse.up()
  await page.waitForTimeout(150)

  // o total percorrido no PLANO é o que o ponteiro pediu, convertido pela escala
  const planoDepois = await posicaoNoPlano(page, 0)
  const pedidoNoPlano = { x: (40 + 80 - 40) / e.zoom, y: 30 / e.zoom }
  expect(planoDepois.x - planoAntes.x).toBeGreaterThan(0)
  expect(Math.abs(planoDepois.y - planoAntes.y)).toBeLessThan(Math.abs(pedidoNoPlano.y) + 4)
})
