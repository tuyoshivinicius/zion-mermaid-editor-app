# Contrato — Descritores discretos de mudança (canvas → modelo), R1

ADR-002/003. A área do diagrama **consome a projeção** e devolve gesto como **descritor discreto de
mudança**, nunca como escrita direta no modelo nem no texto. A engine (React Flow) **não é fonte**: o
gesto vira comando; o comando atravessa uma **transação** (Princípio IV) e escreve **cirurgicamente** no
editor (research §3). Estende os descritores do R0 (`criarNo`, `moverNo`).

## Gestos do R1 e seus comandos

| Gesto na área do diagrama | Descritor | Comando de modelo (1 transação) | Escrita no editor (cirúrgica) |
|---|---|---|---|
| Puxar conexão nó→nó (`FR-001`) | `{ tipo:'conectar', origem, destino }` | nova `Conexao` (id de sessão `eN`); pontas garantidas | **append** de `origem --> destino` no fim |
| Soltar conexão no vazio / sobre moldura (`FR-001`) | — | **ignorado**: nada nasce (a moldura não tem handle) | nenhuma |
| Agrupar seleção (`FR-002`) | `{ tipo:'agrupar', ids }` | novo `Agrupamento` (`subN`, título neutro) reunindo os membros da seleção (nós/agrupamentos); reparenta os que mudam de dono; aninha por menção | **append** do bloco + menções; **remove** menção do dono antigo dos reparentados |
| Agrupar seleção vazia / só conexões / 0 membros | — | **ignorado**: nenhuma moldura, nenhuma entrada de histórico (`FR-002`) | nenhuma |
| Editar rótulo de nó / texto de conexão (`FR-004`) | `{ tipo:'editarTexto', id, texto }` | grava `rotulo`/`texto`; recomputa a marca | reescreve **só a linha** do elemento (rajada coalesce, `FR-007`) |
| Colar dentro do rótulo/texto (`FR-005`) | `{ tipo:'editarTexto', id, texto }` (via `text/plain`) | idem; **0 vestígios** de formatação (`SC-003`); multi-linha inteiro (`FR-005`) | idem |
| Selecionar / retângulo por contenção (`FR-008`) | `{ tipo:'selecionar', … }` | **estado de sessão** — NÃO é transação, NÃO entra no histórico, NÃO toca o código | **nenhuma** |
| Mover elemento / seleção / moldura (`FR-009`) | `{ tipo:'moverSelecao', deltas }` | grava arranjo; membros/moldura acompanham | **nenhuma** — zero bytes (`SC-004`) |
| Duplicar seleção (`FR-010`) | `{ tipo:'duplicar', ids }` | fecho transitivo → ids próprios, textos/título copiados, colocação local; conexões conforme pontas | **append** das declarações + menções; **0** preexistentes movidos |
| Excluir seleção (`FR-011`) | `{ tipo:'excluir', ids }` | nó leva conexões presas; agrupamento tira só a moldura; cascata de esvaziamento | remove as linhas exatas; cascata na mesma entrada |
| Adicionar/retirar membro, desagrupar (`FR-016`) | `{ tipo:'mudarPertencimento', … }` | muda o dono (exclusivo, 1 nível); esvaziamento cascateia | **insere/remove** só a **menção** no bloco; declaração fica no lugar (`SC-009`) |

**Normalização da seleção** (antes de agrupar/duplicar/excluir/mover): expande pelo **fecho transitivo
de pertencimento** e **deduplica** → cada elemento afetado **exatamente 1×** (`SC-006`): 0 deslocamentos
em dobro, 0 cópias em dobro, mesmo com agrupamento **e** membros na seleção.

**Fora do R1 (não emitidos):** reconectar ponta (`reconectar-conexao`), copiar-e-colar por área de
transferência (`copiar-e-colar`), repetir alteração (`repetir-alteracao`), trocar tipo/shape/estilo
(`tipo-*`/`estilo-de-elementos`), desfazer/refazer **visível** (`desfazer-e-refazer` — a transação nasce
aqui, o gesto não), editar título de agrupamento por gesto (edita-se pelo código). `onNodesChange`/
`onEdgesChange` continuam **filtrados**: só o descritor de um gesto concluído vira comando; seleção/hover
não sujam o modelo (ADR-003).

## Editor inline de rótulo/texto (FR-004, edge case)

Abrir a edição por gesto **não** cria estado pendente — o texto propaga ao vivo (sem confirmação). Se o
elemento em edição **deixa de existir** porque a pessoa o removeu **pelo código**, o editor **fecha e
descarta** com o elemento (nada de fantasma) — é **um** ato, o da exclusão pelo código. O foco é do
produto (ADR-005): abrir/fechar sem roubar o foco quando não é o caso.

## Pós-condição da escrita por gesto (herdada do R0)

Depois de um append, o **editor revela** a linha nova (rola + destaque transitório) **sem** mover o
cursor de digitação e **sem** tomar o foco (`revelarLinha`, ADR-005). Zero deslocamentos de cursor, zero
perdas de foco.

## Invariantes verificáveis

| Invariante | Teste | Requisito |
|---|---|---|
| Conexão exige duas pontas | soltar no vazio/sobre moldura → 0 conexões, 0 nós | FR-001 |
| Mover não escreve no código | após `moverSelecao` (incl. arrastar p/ dentro/fora de moldura) → texto byte-idêntico; 0 mudanças de pertencimento | FR-009 · SC-004 |
| Seleção não é histórico nem código | `selecionar` → 0 entradas de histórico, 0 bytes no editor | FR-008 · RN-01 |
| Ato em bloco = 1 entrada | mover/duplicar/excluir até 400 → 1 entrada; cascata em qualquer profundidade → 1 entrada | FR-012 · SC-006 · SC-008 |
| Cada elemento 1× | seleção com agrupamento **e** membros → 0 processados em dobro | SC-006 |
| Excluir nó zera conexões pendentes | 0 arestas apontando p/ ponta que sumiu | SC-007 |
| Excluir agrupamento preserva membros | 100% dos membros ficam; 0 molduras vazias sobram | SC-008 |
| Duplicar conforme pontas | 2 pontas → liga cópias; 0 pontas → paralela às originais; 1 ponta → não renasce | FR-010 |
| Agrupar é inserção pura | 0 linhas preexistentes realocadas; só bloco + menções | FR-014 · SC-009 |
| Colar é texto puro | 0 vestígios de formatação; multi-linha inteiro; sem truncar | SC-003 · FR-005 |
| Toda mutação é transação | fronteira de módulo: sem escrita direta no modelo fora da transação | Princípio IV |
