# Quickstart — Validar "Área de trabalho"

Roteiro de validação de ponta a ponta. Prova que a pessoa **arrasta a divisão e trabalha na proporção
que escolheu**, **navega num diagrama maior que a tela** e **devolve o diagrama ao quadro ou o zoom ao
natural por um gesto** — sem perder o que construiu e sem que nada disso apareça no código copiado.

Números em [contracts/enquadramento.md §1](./contracts/enquadramento.md#1-os-números-declarados-faixats);
tipos em [data-model.md](./data-model.md); superfícies em [contracts/](./contracts/).

## Pré-requisitos

```bash
npm install
npm run dev          # app em http://localhost:5173 (herdado do R0/R1)
```

Testes:

```bash
npm run test         # Vitest — enquadramento, extensão, área visível, orientação, proporção, histórico
npm run test:e2e     # Playwright — 3 histórias + fps dos 4 gestos contínuos + resposta ≤100ms
npm run lint         # ESLint + dependency-cruiser (a fronteira nova: areatrabalho ✗→ modelo/transacao)
```

Para os cenários de envelope, cole em `[data-testid=editor-codigo]` o documento de 400/500 que
`tests/e2e/latencia-grafo.spec.ts` gera (390 nós, 500 conexões, 10 agrupamentos).

---

## Cenário 1 — Navego num diagrama maior que a tela (US1, P1)

1. Com um diagrama maior que a área do diagrama, **Ctrl/⌘ + roda** sobre um trecho.
   - **Esperado:** a escala muda, **o ponto do plano sob o ponteiro continua sob o ponteiro**, e
     **nenhum** elemento muda de posição no plano. *(US1-1; `FR-002`)*
2. Continue afastando até o limite; depois aproxime até o outro.
   - **Esperado:** o zoom **satura** — não salta, não trava a área, não falha em silêncio —, continua
     respondendo, e o indicador `NN %` permanece legível. *(US1-2; `FR-001`)*
3. Gire a **roda pura** (sem Ctrl).
   - **Esperado:** o plano **rola**, como no R0 — a rolagem herdada continua intacta. *(`FR-005`)*
4. Ative o **modo hand** (botão da barra) e arraste, sobre o vazio e sobre um elemento; depois repita
   segurando **`Espaço`**, e depois com o **botão do meio** sem entrar no modo.
   - **Esperado:** a área visível se desloca; **0** elementos movidos, criados, selecionados ou
     desselecionados; código byte-idêntico. *(US1-3; `FR-003`, `FR-004`)*
5. **Sem** o modo hand, arraste sobre o espaço vazio.
   - **Esperado:** nasce a **seleção retangular** do R1 — e qual dos dois ia acontecer estava legível
     no **cursor** antes do primeiro pixel (`crosshair` × `grab`). *(US1-4; `FR-004`, `SC-014`)*
6. Com um elemento selecionado e um rótulo **em edição**, aproxime o zoom e arraste a área visível.
   - **Esperado:** a seleção é a mesma, a edição continua aberta e acompanha o elemento. *(US1-5; `FR-015`)*
7. Faça uma rajada de zoom e arrasto; depois **desfaça**.
   - **Esperado:** o histórico está **como estava**; o desfazer reverte o último ato **do modelo**.
     *(US1-6; `FR-014`, `SC-009`)*
8. Comece a **arrastar um nó** e, **sem soltar**, dê zoom por roda e por `Ctrl/⌘ + =`.
   - **Esperado:** o arrasto continua — não cancelado, não concluído à força, não inerte —, o ponto do
     plano que ele pegou continua sob o ponteiro, e o elemento **não salta**. *(US1-7; `FR-015`, `SC-010`)*

**Portão:** `tests/unit/enquadramento.test.ts`, `tests/e2e/us1-area-trabalho.spec.ts`,
`tests/e2e/fps-area-trabalho.spec.ts` (`SC-003`).

---

## Cenário 2 — Trabalho na proporção que escolhi (US2, P2)

1. Arraste a **divisão** para os dois lados.
   - **Esperado:** as duas áreas ficam na proporção que você deixou, e ela **permanece**. *(US2-1; `FR-006`)*
2. Leve a divisão até cada extremo.
   - **Esperado:** o arrasto **para no mínimo declarado** (480 px o diagrama, 320 px o editor);
     nenhuma das duas vistas é reduzida a nada. *(US2-2; `FR-006`)*
3. Com um enquadramento e um zoom escolhidos, arraste a divisão; depois **redimensione a janela**.
   - **Esperado:** o **zoom não muda**, o ponto do plano que estava no centro da área visível
     **continua no centro**, **0** elementos se movem, e o produto **não** reenquadra sozinho.
     *(US2-3; `FR-007`, `SC-007`)*
4. Copie o código.
   - **Esperado:** **byte-idêntico** ao de antes de arrastar a divisão. *(US2-4; `FR-013`, `SC-001`)*
5. Alargue e estreite a **janela** com as duas vistas acima dos mínimos.
   - **Esperado:** a **razão** entre elas é a mesma antes e depois — as duas crescem e encolhem
     **juntas**. *(US2-5; `FR-006`, `SC-007`)*
6. Encolha a janela **abaixo de 800 px**.
   - **Esperado:** a área de trabalho **para de encolher** e a **página** passa a rolar
     horizontalmente; **0** vistas abaixo do próprio mínimo, **0** vistas ocultas. *(US2-6; `FR-006`)*
7. Ainda com a página rolada, pergunte se um elemento fora da parte visível "está na área visível".
   - **Esperado:** **não** — a área visível encolheu para o que a tela mostra. *(`FR-011`, `SC-008`)*

**Portão:** `tests/unit/proporcao.test.ts`, `tests/e2e/us2-area-trabalho.spec.ts`.

---

## Cenário 3 — Devolvo o diagrama ao quadro, ou o zoom ao natural (US3, P3)

1. A partir de **três** enquadramentos e zooms iniciais bem diferentes, acione **ajustar à tela**
   (`⛶` ou `Shift + 1`).
   - **Esperado:** **100 %** dos elementos dentro da área visível, **0** encostados na borda, com o
     diagrama **centralizado** — e o estado final é **o mesmo** nas três partidas. *(US3-1; `SC-004`)*
2. Num diagrama de **um nó só**, ajuste à tela.
   - **Esperado:** visível e **centralizado**, **sem ampliar além do tamanho natural**. *(US3-2; `SC-005`)*
3. Num diagrama **vazio**, ajuste à tela.
   - **Esperado:** vai ao padrão declarado (zoom 1, o ponto de nascimento do primeiro elemento no
     centro) e **nenhum erro** é acusado. *(US3-3; `FR-008`)*
4. De qualquer nível, acione **resetar o zoom** (clique no `NN %` ou `Shift + 0`).
   - **Esperado:** escala **exatamente 1**, e o ponto do plano no centro da área visível **continua no
     centro** — este gesto muda **só** a escala. *(US3-4; `SC-006`)*
5. Inspecione diagrama e código depois dos dois gestos.
   - **Esperado:** arranjo idêntico ao de antes; código byte-idêntico. Ajustar à tela **não é
     organizar**. *(US3-5; `FR-010`, `SC-002`)*
6. Sobre o envelope (400/500), ajuste à tela; depois **espalhe os nós à mão** até exigir escala abaixo
   do piso e ajuste de novo.
   - **Esperado:** no primeiro caso a escala fica **dentro** da faixa; no segundo o gesto **desce
     abaixo do piso** e o diagrama fica inteiro. Afastar mais por roda **satura no nível corrente**;
     aproximar traz de volta; **apagar conteúdo não reescala sozinho**. *(US3-6; `SC-005`)*
7. Acione ajustar à tela e, **antes de o trânsito terminar**, acione de novo / dê zoom / arraste.
   - **Esperado:** **interrompe e assume** — **0** enfileiramentos, **0** gestos ignorados —, e o
     destino final é idêntico ao que o salto alcançaria. *(`FR-008`, `SC-012`)*
8. Recarregue a aba com um documento do tamanho do envelope colado (arranjo à mão longe da origem).
   - **Esperado:** a área de trabalho **já abre ajustada à tela**, sem nenhum gesto seu; com o
     diagrama vazio, abre no padrão declarado. *(US3-7; `FR-017`, `SC-013`)*

**Portão:** `tests/unit/enquadramento.test.ts` (alvos e invariantes A1–A7),
`tests/integration/abertura-derivada.test.ts`, `tests/e2e/us3-area-trabalho.spec.ts`.

---

## Cenário 4 — A capacidade que as outras specs consomem (`R-05`)

Não é história de pessoa: é a superfície que `ciclo-por-teclado` vai chamar
([contracts/area-visivel.md](./contracts/area-visivel.md)).

1. Pergunte `estaNaAreaVisivel(id)` para um elemento inteiro, um encostado na borda, um pela metade,
   um cujo **arco de laço** / **rótulo de conexão** / **moldura** sai do quadro, um sob a **barra de
   controles** e um fora da parte que a **página rolada** mostra.
   - **Esperado:** `true` só no primeiro; **0 falsos positivos** nos demais. *(`FR-011`, `SC-008`)*
2. Chame `trazerParaAreaVisivel(id)` de um enquadramento arbitrário.
   - **Esperado:** **1** mudança de enquadramento, **0** mudanças de zoom, **0** elementos movidos,
     **0** diferenças no código — e deslocamento **nulo** quando o elemento já está visível.
     *(`FR-012`, `SC-008`)*
3. Chame para um elemento **maior** que a área visível, nas **4 orientações**.
   - **Esperado:** **0** operações terminam sem mostrá-lo e **0** terminam com o **começo** dele (o
     canto de partida da ordem de leitura na orientação corrente) fora do quadro. *(`FR-012`, `SC-008`)*

**Portão:** `tests/unit/area-visivel.test.ts`, `tests/unit/orientacao.test.ts`.

---

## Portões de performance e de fronteira

| Portão | Barra | Onde |
|---|---|---|
| Gesto contínuo no envelope — zoom, arrasto do enquadramento, arrasto da divisão **e trânsito** | **≥50 fps** | `tests/e2e/fps-area-trabalho.spec.ts` (`SC-003`) |
| Ajustar à tela e resetar **respondem** no envelope | **≤100 ms** de mediana | `tests/e2e/resposta-enquadramento.spec.ts` (`SC-012`) |
| Não-regressão do R1 no envelope | tecla ≤50 ms · edição ≤100 ms | `tests/e2e/latencia-grafo.spec.ts` (Princípio III) |
| Reuso da projeção | identidade referencial preservada | `tests/unit/projetar*.test.ts` — **sem mudança**: `projetar` não é tocado |
| Nenhum gesto abre transação | `src/areatrabalho/**` ✗→ `src/modelo/transacao` | `npm run lint:fronteira` (Princípio IV) |
| mermaid fora do caminho de edição | `src/areatrabalho` dentro da fronteira | `npm run lint:fronteira` (Princípio X) |
| A área de trabalho não nomeia família | `grep` de família em `src/areatrabalho` reprova | `tests/unit/nucleo-sem-familia.test.ts` (Princípio XII) |
| Nada é persistido | **0** escritas no armazém por gesto desta spec | `tests/integration/sessao-volatil.test.ts` (Princípio XI) |
