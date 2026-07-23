// Carregador do corpus de referência (corpus/*.mmd). Divide o que é DENTRO do
// vocabulário (base do oráculo SC-001) do documento propositalmente ilegível.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dir = join(raiz, 'corpus')

export function lerCorpus(nome: string): string {
  return readFileSync(join(dir, nome), 'utf8')
}

export function todosOsDocumentos(): { nome: string; texto: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.mmd'))
    .sort()
    .map((nome) => ({ nome, texto: lerCorpus(nome) }))
}

/** Documento propositalmente fora do vocabulário (trechos ilegíveis) — não vai ao oráculo 100%. */
export const DOC_ILEGIVEL = '07-ilegivel.mmd'

/** Documentos inteiramente dentro do vocabulário — o corpus do oráculo (SC-001). */
export function documentosNoVocabulario(): { nome: string; texto: string }[] {
  return todosOsDocumentos().filter((d) => d.nome !== DOC_ILEGIVEL)
}

/** O corpus do grafo dirigido (R1): conexões, blocos, aninhados e os hostis à mão. */
export function corpusDirigido(): { nome: string; texto: string }[] {
  return todosOsDocumentos().filter((d) => d.nome.startsWith('1x-'))
}

/** Os documentos escritos à mão que o produto NÃO escreveria (medições M2/M4/M5). */
export const DOC_ARESTA_NO_BLOCO = '1x-aresta-no-bloco.mmd' // M2: aresta dentro do bloco agrupa as pontas
export const DOC_DUPLA_MENCAO = '1x-dupla-mencao.mmd' // M4: id em dois blocos → primeiro vence
export const DOC_BLOCO_VAZIO = '1x-bloco-vazio.mmd' // M5: subgraph vazio existe e é exibido
