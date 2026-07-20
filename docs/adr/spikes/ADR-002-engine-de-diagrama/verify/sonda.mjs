// Sonda de diagnóstico: dumpa o DOM/CSS que a engine gera, para o spike
// falar sobre o comportamento real da lib em vez de sobre suposição.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

const srv = spawn('npx', ['vite', 'preview', '--port', '5199', '--strictPort'], {
  cwd: raiz,
  stdio: ['ignore', 'pipe', 'pipe'],
})
await new Promise((ok) => srv.stdout.on('data', (d) => String(d).includes('5199') && ok()))
await espera(700)

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message))
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
await page.waitForSelector('.react-flow__node')
await espera(600)

const dump = await page.evaluate(() => {
  const info = (el) =>
    el && {
      classe: el.className?.baseVal ?? el.className,
      pe: getComputedStyle(el).pointerEvents,
      z: getComputedStyle(el).zIndex,
      rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }))(el.getBoundingClientRect()),
    }
  const h = document.querySelector('.react-flow__node[data-id="p1"] [data-handleid="linha-2"]')
  const rot = document.querySelector('[data-testid="mensagem-m5"]')
  const upd = document.querySelector('.react-flow__edge[data-id="m1"] .react-flow__edgeupdater-target')
  const noP1 = document.querySelector('.react-flow__node[data-id="p1"]')
  const frag = document.querySelector('.react-flow__node[data-id="f1"]')
  const elr = document.querySelector('.react-flow__edgelabel-renderer')

  const noPonto = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    const alvo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return alvo ? `${alvo.tagName}.${alvo.className?.baseVal ?? alvo.className}` : null
  }

  return {
    handle: info(h),
    handleAtributos: h ? [...h.attributes].map((a) => `${a.name}="${a.value}"`) : null,
    quemRecebeOHandle: noPonto(h),
    rotulo: info(rot),
    quemRecebeORotulo: noPonto(rot),
    edgelabelRenderer: info(elr),
    edgeupdater: info(upd),
    quemRecebeOUpdater: noPonto(upd),
    nodeP1: info(noP1),
    fragmento: info(frag),
    seletoresUpdater: [...document.querySelectorAll('[class*="edgeupdater"], [class*="reconnect"]')].map(
      (e) => e.getAttribute('class'),
    ),
    camadas: [...document.querySelectorAll('.react-flow__viewport > *')].map(
      (e) => `${e.className?.baseVal ?? e.className} z=${getComputedStyle(e).zIndex} pe=${getComputedStyle(e).pointerEvents}`,
    ),
  }
})

console.log(JSON.stringify(dump, null, 2))
await b.close()
srv.kill('SIGTERM')
