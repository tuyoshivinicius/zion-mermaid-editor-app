# Quickstart — Validar "Elementos do grafo dirigido" (R1)

Roteiro de validação de ponta a ponta. Prova que **montar, rotular e corrigir um fluxo inteiro por
gestos** funciona, com cada ato projetado no código **menos o arranjo**, dentro das decisões dos ADRs.
Detalhe dos tipos em [data-model.md](./data-model.md); das superfícies em [contracts/](./contracts/).

## Pré-requisitos

```bash
npm install
npm run dev          # app em http://localhost:5173 (herdado do R0)
```

Testes:

```bash
npm run test         # Vitest — unidade + integração (codec, pertencimento, cascata, reuso, cirurgia)
npm run test:e2e     # Playwright — 3 histórias + oráculo mermaid (SC-001) + latência (SC-005) + fps (SC-010)
```

O **oráculo mermaid** roda pela página de teste `/oraculo.html` (Princípio X: o app nunca importa
mermaid). O corpus do grafo dirigido vive em `corpus/*.mmd`.

---

## Cenário 1 — Monto a estrutura por gestos (US1, P1)

1. Numa sessão com dois nós, **puxe uma conexão** de um ao outro (handle → handle).
   - **Esperado:** aparece a aresta na área do diagrama **e** `origem --> destino` no código, sem gesto
     de sincronização. *(US1-1; contracts/change-descriptor.md → `conectar`)*
2. Puxe uma conexão e **solte no vazio** (e depois **sobre a moldura** de um agrupamento).
   - **Esperado:** nada nasce — nem conexão nem nó. *(US1-2, edge "conexão solta sobre agrupamento"; FR-001)*
3. Selecione três nós e **agrupe**.
   - **Esperado:** a moldura reúne os três; o bloco `subgraph subN[Grupo N] … end` aparece no código
     listando os três como **menções isoladas**; o agrupamento nasce com **título neutro**. *(US1-3; FR-002)*
4. Com um código **escrito à mão** (espaçamento próprio + trecho ilegível), crie uma conexão/agrupamento.
   - **Esperado:** só as linhas novas aparecem; **todo o resto byte-idêntico**. *(US1-4; FR-014, SC-009)*
5. Inspecione o código dos recém-criados.
   - **Esperado:** **0** posição/coordenada/seleção/estado de sessão — só estrutura. *(US1-5; SC-004)*
6. Digite à mão uma aresta (`a --> b`) e um bloco de agrupamento no editor.
   - **Esperado:** a conexão/agrupamento nasce na área do diagrama conforme você digita. *(US1-6; FR-013, FR-019)*

**Portão:** `tests/e2e/us1-grafo.spec.ts`; oráculo `corpus/1x-*.mmd` (conexões, blocos) → `SC-001`.

---

## Cenário 2 — Rotulo e colo texto de fora sem que ele mude (US2, P2)

1. Edite o **rótulo de um nó** por gesto e digite.
   - **Esperado:** o rótulo muda ao vivo e o texto aparece no código, sem confirmação. *(US2-1; FR-004)*
2. Edite o **texto de uma conexão** por gesto.
   - **Esperado:** o texto muda ao vivo e reaparece no código na linha daquela conexão (`origem -->|texto|
     destino`). *(US2-2; FR-004)*
3. **Cole** dentro do rótulo um texto com negrito/cor/links de um editor rico.
   - **Esperado:** entra **só texto puro** (0 vestígios de formatação); igual no rótulo e no código.
     *(US2-3; SC-003)*
4. Cole um texto que o tipo **expressa** fielmente.
   - **Esperado:** volta **byte a byte** no diagrama e no código. *(US2-4; FR-006, SC-002)*
5. Cole um texto que o tipo **não expressa** (controle, tab, espaços colados, **multi-linha**).
   - **Esperado:** o elemento aparece **marcado** no diagrama; o texto integral fica no modelo; o código
     leva a forma mais fiel **sem artefato**; nada truncado nem alterado em silêncio; a colagem multi-linha
     **não encerra** a edição nem colapsa quebras. *(US2-5, edges de texto; FR-006, FR-005, SC-002)*
6. Digite rápido e cole no **mesmo** rótulo.
   - **Esperado:** **1** ato no modelo, não um por tecla. *(US2-6; FR-007)*
7. Reescreva o rótulo de um nó.
   - **Esperado:** a **identidade** do nó não muda (mesmo nó, renomeado). *(US2-7; FR-007)*
8. Apague **todo** o rótulo.
   - **Esperado:** caixa **sem rótulo**; o produto **não** repõe o neutro nem exibe o identificador; o
     código leva a forma de rótulo vazio (ou marca). *(US2-8; FR-018)*
9. **Durabilidade:** com um elemento marcado, edite **outra** linha do código e deixe o documento reler.
   - **Esperado:** o texto integral e a marca **permanecem** (a forma degradada não foi tocada); só editar
     **aquele** texto no código faz o modelo adotar o novo. *(edge "texto de fora que o tipo não expressa";
     FR-006, SC-002)*

**Portão:** `tests/e2e/us2-grafo.spec.ts`; `tests/fixtures/rotulos-hostis.ts` estendido a texto de conexão
+ multi-linha + vazio; oráculo → `SC-002`/`SC-003`.

---

## Cenário 3 — Corrijo: seleciono, movo, duplico, excluo (US3, P3)

1. **Seleção retangular** sobre vários elementos no vazio.
   - **Esperado:** entram os abrangidos **por inteiro** (contenção — encostar não basta); as conexões com
     **as duas pontas** dentro vêm juntas; a seleção **não** aparece no código. *(US3-1; FR-008)*
2. **Arraste a seleção** de N elementos.
   - **Esperado:** todos se movem juntos, posições relativas mantidas, código **byte-idêntico**.
     *(US3-2; SC-004)*
3. Arraste um **agrupamento**.
   - **Esperado:** os membros acompanham; nada disso no código. *(US3-3; FR-009)*
4. **Duplique** dois nós ligados por uma conexão.
   - **Esperado:** nascem dois nós novos (ids próprios, rótulos copiados) ligados por uma conexão nova,
     colocados **perto sem mover ninguém**; linhas novas no código. *(US3-4; FR-010, Princípio VII)*
5. Duplique com **só uma** ponta de uma conexão incluída.
   - **Esperado:** os nós duplicam, a conexão pendente **não** (falta uma ponta). *(US3-5; FR-010)*
6. **Exclua** um nó com conexões presas.
   - **Esperado:** o nó **e** as conexões presas somem do diagrama e do código; nada mais é tocado.
     *(US3-6; SC-007)*
7. Exclua uma **conexão** selecionada.
   - **Esperado:** só a conexão some; os dois nós ficam. *(US3-7)*
8. Exclua um **agrupamento** selecionado.
   - **Esperado:** a moldura some e **os nós de dentro permanecem** (sem agrupamento). *(US3-8; SC-008)*
9. Aplique um ato em bloco (mover/duplicar/excluir) sobre a seleção.
   - **Esperado:** **1** entrada de histórico para o ato todo, qualquer que seja N (1..400). *(US3-9; SC-006)*
10. Arraste um membro para **fora** da moldura (e um solto para **dentro**).
    - **Esperado:** só muda de lugar — **mesmo pertencimento**, código **byte-idêntico**. *(US3-10; SC-004, FR-016)*
11. Duplique **só a moldura** de um agrupamento com três nós ligados.
    - **Esperado:** nasce um agrupamento novo (id próprio, **título copiado**) **e** cópias dos três nós e
      das conexões; nenhum original passa a pertencer a dois. *(US3-11; FR-010)*
12. **Retire** um membro (e **desagrupe** o agrupamento inteiro).
    - **Esperado:** o membro sai do bloco no código e fica solto; se era o **último**, o bloco some no
      mesmo ato. *(US3-12; FR-016, FR-011)*
13. **Adicione** um nó solto a um agrupamento existente.
    - **Esperado:** vira membro; o id passa a ser **mencionado** no bloco; a declaração fica onde estava,
      o agrupamento não perde identidade nem título, nenhuma outra linha muda. *(US3-13; FR-016, SC-009)*
14. Duplique uma conexão **sozinha** (sem as pontas).
    - **Esperado:** nasce uma **aresta paralela** entre os mesmos dois nós (id próprio, texto copiado);
      linha nova no código; nenhum nó criado. *(US3-14; FR-010, FR-001)*

**Portão:** `tests/e2e/us3-grafo.spec.ts`; integração de cascata (`SC-008`), duplicação transitiva,
seleção normalizada (`SC-006`).

---

## Cenários hostis e de aninhamento (edge cases + medições do oráculo)

| Caso | Esperado | Requisito |
|---|---|---|
| **Agrupar sobre grupo existente** | aninha (bloco dentro de bloco) por **menção**, **0 realocações** | FR-002, SC-009 (M3) |
| **Agrupar cortando um grupo pela metade** | os selecionados **mudam de dono**; o antigo mantém os demais ou some; **1 dono por elemento** | FR-002 |
| **Cascata aninhada** | excluir o último nó do interno esvazia interno **e** externo, subindo até o 1º com membro; **1** entrada | SC-008, FR-011/012 |
| **Aresta escrita dentro do bloco** (à mão) | cria a conexão **e** agrupa as pontas; diagrama ≡ mermaid | FR-019, SC-001 (M2) |
| **Mesmo nó em dois blocos** (à mão) | pertence ao **primeiro**; **0 divergências** vs. mermaid; código intocado | FR-019, SC-001 (M4) |
| **Bloco vazio escrito à mão** | existe e é exibido; recebe membros como qualquer outro | FR-019 (M5) |
| **Laço e arestas paralelas** | cada gesto cria uma conexão nova; não funde nem recusa | FR-001 |
| **Elemento em edição removido pelo código** | editor fecha e descarta com o elemento; 1 ato | FR-004 |
| **Texto colado gigante** | entra **inteiro**; custo **medido**, não limitado; 0 recusas/truncamentos | FR-005, SC-005 |

---

## Portões de arquitetura (rodam em CI)

| Portão | Comando/Teste | Princípio |
|---|---|---|
| Reuso das 3 famílias na projeção | unidade: identidade referencial ao mudar 1 elemento | III |
| Latência no envelope 400/500 | e2e: edição ≤100ms mediana, tecla ≤50ms, gesto ≥50fps | III, SC-005/SC-010 |
| Ato em bloco / cascata = 1 entrada | unidade/integração: histórico cresce 1; cada elemento 1× | IV, SC-006/SC-008 |
| Código = projeção fiel do durável | e2e mover byte-idêntico; **0** efêmero na saída | V, SC-004 |
| Núcleo sem nome de família | `grep` de `subgraph`/`-->`/`flowchart` em `codec/nucleo/` | XII |
| mermaid fora do runtime | fronteira de importação (módulos novos) | X |
| Oráculo do grafo dirigido | e2e `oraculo.spec.ts` sobre o corpus dirigido + hostis à mão | V, SC-001 |
