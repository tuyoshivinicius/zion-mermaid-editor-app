# Contrato — Descritor discreto de mudança (canvas → modelo)

ADR-002/003. A área do diagrama **consome a projeção** e devolve gesto como **descritor discreto de
mudança**, nunca como escrita direta no modelo nem no texto. A engine (React Flow) **não é fonte**: o
gesto vira comando; o comando atravessa uma **transação** (Princípio IV) e escreve **cirurgicamente**
no editor (research §3).

## Gestos do R0 e seus comandos

| Gesto na área do diagrama | Descritor | Comando de modelo | Escrita no editor (FR-017) |
|---|---|---|---|
| Duplo-clique no **espaço vazio** (FR-001) | `{ tipo: 'criarNo', ponto: {x,y} }` | novo `No`: `id = contador.emitir()`, `rotulo = "Nó N"`; grava `arranjo.porId[id] = ponto` | **append** de `emitirNo(no)` no **fim** do documento |
| Duplo-clique **sobre a caixa** (FR-001) | — | **ignorado**: nenhum nó nasce, nada abre | nenhuma (código byte-idêntico) |
| Arrastar nó (FR-007) | `{ tipo: 'moverNo', id, para: {x,y} }` | grava `arranjo.porId[id] = para` | **nenhuma** — zero bytes (posição é efêmera, FR-008) |
| Rolar o plano (FR-007) | estado de vista | — | nenhuma (rolar não move nada — FR-009) |

**Fora do R0 (não emitidos):** excluir por gesto (`elementos-grafo-dirigido`), conectar
(`elementos-grafo-dirigido`), editar rótulo por gesto (`RF-02`), zoom/pan/ajustar-à-tela
(`area-de-trabalho`). O `onNodesChange` do React Flow é **filtrado**: só o descritor de posição de um
arraste concluído vira `moverNo`; eventos de seleção/hover não sujam nada (ADR-003).

## Pós-condição da escrita por gesto (FR-002 / SC-010)

Depois de um `criarNo` que fez append, o **editor revela** a linha nova (rola até ela + destaque
transitório) **sem** mover o cursor de digitação e **sem** tomar o foco (ADR-005, research §7).

```ts
revelarLinha(indice: number)   // ajusta scrollTop + flash; NÃO chama focus() nem mexe em selectionStart/End
```

## Invariantes verificáveis

| Invariante | Teste | Requisito |
|---|---|---|
| Mover não escreve no código | após `moverNo`, texto do editor byte-idêntico | FR-008 · SC-004 · Princípio V |
| Criar é append no fim | nada acima da linha nova muda | FR-017 · SC-009 |
| Duplo-clique na caixa é no-op | 0 nós novos, código byte-idêntico | FR-001 |
| Nenhuma edição reposiciona preexistente | posição de todos os demais idêntica antes/depois | FR-009 · SC-008 · Princípio VII |
| Revelar sem tomar | 0 deslocamentos de cursor, 0 perdas de foco do editor | FR-002 · SC-010 |
| Toda mutação é transação | fronteira de módulo: sem escrita direta no modelo | Princípio IV |
