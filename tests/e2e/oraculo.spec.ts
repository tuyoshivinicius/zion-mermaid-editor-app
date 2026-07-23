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

// R1 (T046): as medições escritas à mão — aresta-no-bloco (M2), dupla-menção (M4) e
// bloco-vazio (M5) — DEVEM estar no portão do oráculo. Se sumirem do corpus, falha aqui.
const HOSTIS_A_MAO = ['1x-aresta-no-bloco.mmd', '1x-dupla-mencao.mmd', '1x-bloco-vazio.mmd']

test('o corpus dirigido + os hostis à mão (M2/M4/M5) estão no portão do oráculo', () => {
  for (const nome of HOSTIS_A_MAO) expect(DOCS_NO_VOCABULARIO, nome).toContain(nome)
  expect(DOCS_NO_VOCABULARIO.filter((n) => n.startsWith('1x-')).length).toBeGreaterThanOrEqual(6)
})

test('o mermaid aceita 100% do corpus copiado (dentro do vocabulário, inclui grafo dirigido)', async ({ page }) => {
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
