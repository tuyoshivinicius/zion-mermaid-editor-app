import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizarCabecalhoParaCopia } from '../../src/codec'

// Portão do oráculo mermaid (T046 / SC-001 / Princípio V): o código que SAI da
// cópia é aceito 100% pelo mermaid.parse() de verdade, sem tolerância parcial.
// O mermaid é importado SÓ pela página de teste `/oraculo.html` (Princípio X: o
// app nunca o importa). O "mesmo desenho" vale por construção — o código copiado
// é o texto da pessoa que desenha o diagrama visível.

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const corpusDir = join(raiz, 'corpus')

const DOCS_NO_VOCABULARIO = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.mmd') && f !== '07-ilegivel.mmd')
  .sort()

test('o mermaid aceita 100% do corpus copiado (dentro do vocabulário)', async ({ page }) => {
  await page.goto('/oraculo.html')
  await page.waitForFunction(() => (window as unknown as { __oraculoPronto?: boolean }).__oraculoPronto === true)

  for (const nome of DOCS_NO_VOCABULARIO) {
    const bruto = readFileSync(join(corpusDir, nome), 'utf8')
    const copiado = normalizarCabecalhoParaCopia(bruto)
    const r = await page.evaluate(
      (t) => (window as unknown as { validarMermaid: (s: string) => Promise<{ ok: boolean; erro?: string }> }).validarMermaid(t),
      copiado,
    )
    expect(r.ok, `${nome}: ${r.erro ?? ''}`).toBe(true)
  }
})
