# Contrato — Cópia do código (o produto final que se leva embora)

FR-010/FR-014. Único caminho de saída para o mundo de fora (área de transferência). A cópia entrega **o
texto da pessoa** com **uma** normalização cirúrgica: exatamente uma declaração de tipo, `flowchart TD`.
Não re-serializa o modelo (research §4).

## Gesto (FR-010 / SC-006)

Um **clique** num **botão de copiar visível e permanente** na área do código. Sem seleção manual de
texto. O retorno — copiou ou não — aparece **no próprio botão**. Atalho de teclado é `ciclo-por-teclado`.

```ts
async function copiar(textoEditor: string): Promise<'copiado' | 'falhou'>
```

## Transformação da saída (FR-014)

Sobre o **texto do editor**, aplica-se **só** ao cabeçalho, achado pelo reconhecedor de cabeçalho do codec:

| Estado do editor | Saída copiada | Editor |
|---|---|---|
| Sem declaração reconhecida | texto + `flowchart TD` acrescentada (no topo) | intocado |
| Declaração de **outro** tipo (qualquer dos 5, qualquer posição) | aquela linha **substituída** por `flowchart TD` | intocado |
| Já tem `flowchart` / `flowchart TD` | idêntico ao editor | intocado |
| Zero nós / editor todo apagado | `flowchart TD` sozinha (documento válido) | continua vazio |

Todo o **resto** vai **byte-idêntico**, inclusive trechos ilegíveis que o mermaid de fora recusa
(US3-8): o produto **nunca** remove texto da pessoa para salvar a validade (FR-017). A saída **nunca**
carrega duas declarações. A declaração que sai é sempre `flowchart TD` (FR-019), nunca dependente de
orientação implícita.

## Retorno visível e falha (FR-010 / SC-006)

- Sucesso → confirmação no botão.
- `navigator.clipboard` negado/ausente → `'falhou'` e aviso no botão. **Falhar em silêncio não é opção**
  (Assumptions da spec). O gesto nunca deixa a pessoa acreditar que copiou sem ter copiado.

## Invariantes verificáveis

| Invariante | Teste | Requisito |
|---|---|---|
| 100% aceito e mesmo desenho | corpus do R0 → `mermaid.parse()` + mesmo SVG, sem tolerância parcial | SC-001 · Princípio V |
| Uma só declaração | outro-tipo no topo → saída com 1 declaração | FR-014 · US3-7 |
| Difere só na declaração | trecho ilegível → saída = editor + cabeçalho, resto byte-idêntico | US3-8 · SC-009 |
| Zero nós copiável | editor apagado → copia `flowchart TD` | FR-014 · US3-6 |
| 1 gesto, 0 seleções | contagem de gestos; retorno visível em 100% | SC-006 |
| Sem efêmero na saída | 0 posição/zoom/seleção/foco em qualquer saída | SC-004 · Princípio V |
