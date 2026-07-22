// Gera corpus/06-rotulos-hostis.mmd a partir do fixture — a versão codificada
// (válida para o oráculo mermaid) dos mesmos textos do round-trip byte-a-byte.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { ROTULOS_HOSTIS } from '../tests/fixtures/rotulos-hostis'
import { codificar } from '../src/codec/nucleo/rotulo'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const linhas = ['flowchart TD']
ROTULOS_HOSTIS.forEach((r, i) => {
  linhas.push(`  h${i + 1}[${codificar(r.texto).bruto}]`)
})
writeFileSync(join(raiz, 'corpus', '06-rotulos-hostis.mmd'), linhas.join('\n') + '\n')
console.log(`corpus/06-rotulos-hostis.mmd: ${ROTULOS_HOSTIS.length} rótulos`)
