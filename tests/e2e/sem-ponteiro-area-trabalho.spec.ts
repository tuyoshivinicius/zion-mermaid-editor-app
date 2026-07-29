import { test, expect, type Page } from '@playwright/test'
import { documentoEnvelope, N_NOS } from '../fixtures/envelope'

// TRABALHAR SEM PONTEIRO (T054 / SC-011 / FR-005, FR-018).
//
// Zoom, ajustar à tela e resetar TÊM caminho sem ponteiro. Mover o enquadramento
// livremente e mudar a proporção NÃO — e a enumeração do `FR-018` é EXAUSTIVA.
//
// Isso não prende ninguém, e é isso que este portão mede: o que garante a saída é
// que ajustar à tela devolve o diagrama inteiro, que a abertura já entrega as duas
// vistas com o diagrama enquadrado, e que o elemento criado por teclado vem até a
// área visível (`FR-012`, o dever do `R-05`). A medição é feita SEM que pan livre ou
// proporção tenham caminho sem ponteiro.

const editor = (page: Page) => page.locator('[data-testid=editor-codigo]')
const area = (page: Page) => page.locator('[data-testid=area-diagrama]')
const caixas = (page: Page) => page.locator('.react-flow__node-caixa')

/** Conta TODA alternância para o mouse: 0 é o que o `SC-011` exige. */
async function contarPonteiro(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __ponteiro: string[] }
    w.__ponteiro = []
    for (const tipo of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'wheel']) {
      window.addEventListener(tipo, () => w.__ponteiro.push(tipo), { capture: true })
    }
  })
  return () => page.evaluate(() => (window as unknown as { __ponteiro: string[] }).__ponteiro)
}

async function enquadramento(page: Page) {
  const s = (await page.locator('.react-flow__viewport').getAttribute('style')) ?? ''
  const m = /translate\((-?[\d.e]+)px,\s*(-?[\d.e]+)px\)\s*scale\(([\d.e-]+)\)/.exec(s)
  if (!m) throw new Error(`transform ilegível: ${s}`)
  return { x: +m[1], y: +m[2], zoom: +m[3] }
}

const assentar = (page: Page) => page.waitForTimeout(420)

test('zoom, ajustar e resetar são alcançáveis por atalho com 0 alternâncias para o mouse', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await editor(page).fill(documentoEnvelope())
  await expect(caixas(page)).toHaveCount(N_NOS, { timeout: 90_000 })
  await assentar(page)

  const ponteiros = await contarPonteiro(page)

  // Sair do editor de código — por `Tab`, que é o caminho de quem não tem ponteiro.
  // Enquanto o foco está no `textarea`, as teclas são de quem digita e NENHUM atalho
  // dispara (a guarda única do `FR-018`); o portão aqui é que sair dele não custa uma
  // alternância para o mouse.
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('TEXTAREA')

  // (1) RESETAR — Shift + 0. Vem primeiro porque a abertura já ajustou o envelope à
  // tela, e nesta janela isso termina ABAIXO do piso; afastar dali satura no nível
  // corrente, que é o comportamento correto (`FR-008`) e não um zoom a medir.
  await page.keyboard.press('Shift+Digit0')
  await assentar(page)
  expect((await enquadramento(page)).zoom).toBe(1)

  // (2) AFASTAR e APROXIMAR — Ctrl + − / Ctrl + =
  const antesDoZoom = (await enquadramento(page)).zoom
  await page.keyboard.press('Control+Minus')
  await assentar(page)
  const afastado = (await enquadramento(page)).zoom
  expect(afastado).toBeLessThan(antesDoZoom)

  await page.keyboard.press('Control+Equal')
  await assentar(page)
  expect((await enquadramento(page)).zoom).toBeGreaterThan(afastado)

  // (3) AJUSTAR À TELA — Shift + 1
  await page.keyboard.press('Shift+Digit1')
  await assentar(page)
  expect((await enquadramento(page)).zoom).toBeLessThan(1)

  // 0 alternâncias para o mouse em todo o percurso
  expect(await ponteiros()).toEqual([])
})

test('0 elementos inalcançáveis no envelope: 1 gesto devolve o diagrama inteiro', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await editor(page).fill(documentoEnvelope())
  await expect(caixas(page)).toHaveCount(N_NOS, { timeout: 90_000 })
  await assentar(page)

  const ponteiros = await contarPonteiro(page)

  // de um enquadramento arbitrário, alcançado SÓ por teclado…
  for (let k = 0; k < 5; k++) await page.keyboard.press('Control+Equal')
  await assentar(page)

  // …UM gesto devolve o diagrama inteiro à vista
  await page.keyboard.press('Shift+Digit1')
  await assentar(page)

  const a = (await area(page).boundingBox())!
  const barra = (await page.locator('[data-testid=controles-enquadramento]').boundingBox())!
  const fora = await page.evaluate(
    ({ a, barra }) => {
      let n = 0
      for (const el of document.querySelectorAll('.react-flow__node')) {
        const r = el.getBoundingClientRect()
        if (r.left < a.x - 0.5 || r.right > a.x + a.width + 0.5 || r.top < a.y - 0.5 || r.bottom > barra.y + 0.5) n++
      }
      return n
    },
    { a, barra },
  )

  expect(fora).toBe(0) // 0 elementos inalcançáveis
  expect(await ponteiros()).toEqual([]) // 0 sessões por teclado sem saída, 0 mouse
})

test('a rolagem herdada do R0 continua intacta — o alcance não foi substituído (FR-005)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await editor(page).fill('flowchart TD\nn1[A]\nn2[B]\nn1 --> n2')
  await expect(caixas(page)).toHaveCount(2)
  await assentar(page)

  const antes = await enquadramento(page)
  const a = (await area(page).boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.wheel(0, 400) // roda PURA
  await page.waitForTimeout(200)

  const depois = await enquadramento(page)
  expect(depois.zoom).toBeCloseTo(antes.zoom, 6) // rolar não é dar zoom
  expect(depois.y).not.toBeCloseTo(antes.y, 1) // e o plano rolou, como no R0
})

test('a enumeração do FR-018 é EXAUSTIVA: pan livre e proporção NÃO têm atalho', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await editor(page).fill('flowchart TD\nn1[A]\nn2[B]')
  await expect(caixas(page)).toHaveCount(2)
  await assentar(page)

  await page.locator('.react-flow__pane').click({ position: { x: 30, y: 30 } })
  const enqAntes = await enquadramento(page)
  const razaoAntes = await page.evaluate(() => {
    const t = document.querySelector('[data-testid=area-de-trabalho]')!.getBoundingClientRect()
    const e = document.querySelector('.vista-editor')!.getBoundingClientRect()
    return e.width / t.width
  })

  // as setas e as teclas de proporção que "poderiam existir" simplesmente não fazem
  // nada: teclas para isso, se um dia existirem, são afordância de `ciclo-por-teclado`
  for (const tecla of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'BracketLeft', 'BracketRight']) {
    await page.keyboard.press(tecla)
  }
  await assentar(page)

  expect(await enquadramento(page)).toEqual(enqAntes)
  const razaoDepois = await page.evaluate(() => {
    const t = document.querySelector('[data-testid=area-de-trabalho]')!.getBoundingClientRect()
    const e = document.querySelector('.vista-editor')!.getBoundingClientRect()
    return e.width / t.width
  })
  expect(razaoDepois).toBeCloseTo(razaoAntes, 6)
})
