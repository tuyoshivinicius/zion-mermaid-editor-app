// Sonda de diagnóstico — a evidência do achado mais caro do spike.
//
// Pergunta: quando a projeção devolve um objeto de aresta NOVO a cada tecla
// (`memo=0`, o oposto da invariante que o ADR-004 fixou), o que acontece com o
// input do rótulo da conexão que está em edição?
//
// O método não é olhar a tela: marca-se o elemento do DOM (`data-marca`) e
// observa-se se a marca sobrevive à tecla seguinte. Marca perdida = o elemento
// foi remontado, não re-renderizado.
//
//   node verify/sonda.mjs
//
// Resultado observado com @xyflow/react 12.11.2:
//   memo=1 -> mesmo DOM=true  em todas as teclas, foco preservado, rótulo inteiro
//   memo=0 -> mesmo DOM=false já na primeira tecla, foco vai para BODY, e o
//             rótulo congela na primeira letra
//
// A assimetria importa: o input DENTRO DO NÓ sobrevive ao mesmo tratamento. É
// só a aresta que é remontada.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORTA = 5315

const p = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], {
  cwd: raiz,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
})
await new Promise((ok) => p.stdout.on('data', (d) => String(d).includes(String(PORTA)) && ok()))
await new Promise((r) => setTimeout(r, 700))
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

const b = await chromium.launch()

for (const memo of ['1', '0']) {
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  await page.goto(`http://localhost:${PORTA}/?memo=${memo}`)
  await page.waitForFunction(() => window.__spike?.pronto === true)
  await page.evaluate(() => document.querySelector('[data-foco="palco"]').focus())

  // dois nós e uma conexão, tudo por teclado, até parar no rótulo da conexão
  await page.keyboard.press('n'); await pausa(250)
  await page.keyboard.type('Um', { delay: 15 }); await pausa(200)
  await page.keyboard.press('Enter'); await pausa(250)
  await page.keyboard.press('c'); await pausa(250)
  await page.keyboard.press('n'); await pausa(250)
  await page.keyboard.type('Dois', { delay: 15 }); await pausa(200)
  await page.keyboard.press('Enter'); await pausa(400)

  console.log(`\n=== memo=${memo} — em edição do rótulo da conexão ===`)
  console.log('foco:', await page.evaluate(() => window.__spike.foco()))
  await page.evaluate(() => {
    const el = document.querySelector('.rotulo-conexao input')
    if (el) el.dataset.marca = 'original'
  })

  for (const ch of ['v', 'i', 'a']) {
    await page.keyboard.press(ch)
    await pausa(250)
    console.log(
      `apos "${ch}": foco=${String(await page.evaluate(() => window.__spike.foco()))}`,
      `| mesmo DOM=${await page.evaluate(
        () => document.querySelector('.rotulo-conexao input')?.dataset.marca === 'original',
      )}`,
      `| rotulo=${JSON.stringify(
        await page.evaluate(() => window.__spike.modelo().conexoes[0]?.rotulo),
      )}`,
      `| activeEl=${await page.evaluate(() => document.activeElement?.tagName)}`,
    )
  }
  await page.close()
}

await b.close()
try {
  process.kill(-p.pid, 'SIGTERM')
} catch {
  p.kill('SIGTERM')
}
