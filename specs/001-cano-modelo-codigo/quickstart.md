# Quickstart — validar o cano modelo ⇄ código (R0)

Roteiro de validação de ponta a ponta. Prova que **diagrama e código são duas vistas de um modelo só**,
nos dois sentidos, com o código saindo válido do outro lado. Referencia os contratos em
[`contracts/`](./contracts) e as entidades em [`data-model.md`](./data-model.md); não repete
implementação (isso é `tasks.md`).

## Pré-requisitos

```bash
npm install          # React 18, Vite 5, Tailwind, @xyflow/react, zustand; mermaid + playwright (dev)
npm run dev          # sobe a tela única em http://localhost:5173
```

Validação automatizada:

```bash
npm run test         # Vitest: codec, rótulo, projeção (reuso), arranjo, contador, round-trip, prefixos
npm run test:e2e     # Playwright: 3 histórias + oráculo mermaid + latência + rede-off
npm run build        # artefato estático servível sem backend (Princípio XIII)
```

O **corpus de referência** (`corpus/*.mmd`) é restrito ao **vocabulário de nó desta spec** (research
§2a) e inclui, obrigatoriamente: documento de **zero nós**, documento com **cabeçalho apagado**,
documento com **cabeçalho de outro tipo**. É a base de SC-001 e SC-002 (mesmo corpus do NFR-05/NFR-08).

---

## História 1 — o nó nasce e a linha aparece (ida)

1. Abra o produto → o editor mostra `flowchart TD` e o diagrama está vazio (FR-019).
2. **Duplo-clique no espaço vazio** → um nó "Nó 1" nasce no ponto clicado e o editor passa a conter
   `n1[Nó 1]` no fim, sem gesto de sincronização (US1-1). *Contrato: [change-descriptor](./contracts/change-descriptor.md).*
3. Crie um segundo nó → editor tem as duas linhas; a linha do primeiro **permanece como estava** (US1-2).
4. Escreva um texto próprio com espaçamento e um trecho ilegível; crie um nó por gesto → a linha nova
   aparece e **todo o resto fica byte-idêntico** (US1-3 / SC-009).
5. Apague o cabeçalho; crie um nó por gesto → a linha nova aparece e o cabeçalho **continua ausente**
   (US1-4 / FR-019).
6. Num documento longo rolado, crie um nó → o editor **revela** a linha nova (rola + destaca), o cursor
   **não se move** e o foco não é tomado (US1-6 / SC-010).
7. Duplo-clique **sobre uma caixa** → nada acontece; código byte-idêntico (US1-7 / FR-001).

**Espera:** SC-005 (mudança na outra vista ≤100ms mediana), SC-010 (0 deslocamentos de cursor, 0 perdas
de foco).

---

## História 2 — escrevo no código e o diagrama acompanha (volta)

1. Com um diagrama pronto, edite no código o texto que identifica um nó → a caixa muda **conforme
   digita**, sem confirmação (US2-1).
2. Apague a linha de um nó → o nó some; os demais permanecem (US2-2). *(É assim que se remove no R0.)*
3. Digite uma linha nova letra por letra → em **nenhum** momento um nó que já existia some (US2-3 /
   SC-002).
4. Deixe o código sintaticamente incompleto → o diagrama **continua** exibindo um diagrama, nunca vazio
   nem quebrado (US2-4 / Princípio IX).
5. Arraste nós para posições suas; edite o código → os preexistentes ficam **exatamente onde estavam**
   (US2-5 / SC-008).
6. Apague o código inteiro → diagrama vazio, editor vazio (o produto **não** reescreve o cabeçalho), e
   o produto continua utilizável (US2-6).
7. Troque o identificador de um nó arrastado, letra por letra → continua o **mesmo** nó, na **mesma**
   posição (US2-7 / FR-018).
8. Duplique a linha de um nó e reescreva o rótulo da cópia → **um** nó só, com o rótulo da última linha;
   as duas linhas ficam no texto (US2-8 / FR-016).
9. Digite `n1[Nó A]` letra por letra → a caixa nasce assim que o id é legível, rotulada `n1`, e o rótulo
   acompanha até `Nó A`, sem esperar o colchete e sem exibi-lo (US2-9 / FR-018).
10. Escreva uma segunda declaração de tipo no meio do texto → **nenhuma** caixa nasce dela, em nenhuma
    posição (US2-10 / FR-005). *Contrato: [codec](./contracts/codec.md).*
11. Recorte a linha de um nó arrastado e cole noutro ponto → o nó volta **exatamente** onde estava, e
    nenhum outro se move (US2-11 / FR-015).
12. Continue digitando `n1[Nó A]` até `n1[Nó A] --> n2` → a caixa **some** (linha ilegível por inteiro);
    apague o excedente → a caixa **reaparece** na posição lembrada (US2-12 / FR-004/FR-005/FR-015).
13. Escreva `n1["Nó, A"]` → a caixa exibe `Nó, A` sem aspas; o mesmo rótulo desenha lá fora (US2-13 /
    FR-011 / Princípio VIII).
14. Escreva `n1(Nó A)` → **nenhuma** caixa nasce (fora do vocabulário); o texto permanece e viaja na
    cópia (US2-14 / FR-005).

**Espera:** SC-002 (0 perdas em todos os prefixos; análise nunca vazia), SC-003 (tecla ≤50ms mediana em
400 nós), SC-007 (rajada de N teclas = 1 ato).

---

## História 3 — arrasto o nó e levo o código, sem a bagunça

1. Arraste um nó → fica onde soltou; o código fica **byte-idêntico** ao de antes do arraste (US3-1 /
   SC-004).
2. Clique no **botão de copiar** → o código inteiro vai para a área de transferência com **um** gesto
   (US3-2 / SC-006). *Contrato: [copy](./contracts/copy.md).*
3. Cole num mermaid qualquer (o corpus dentro do vocabulário) → aceito sem erro, desenha o **mesmo**
   diagrama (US3-3 / SC-001).
4. Inspecione o código copiado → **nenhuma** posição, coordenada, zoom, seleção ou foco (US3-4 / SC-004).
5. Acione copiar → confirmação visível; se a cópia não puder acontecer, aviso em vez de falso sucesso
   (US3-5 / SC-006).
6. Apague o editor inteiro e copie → sai `flowchart TD` sozinha (válida); o editor continua vazio (US3-6
   / FR-014).
7. Escreva no topo a declaração de **outro** tipo e copie → a saída tem **uma só** declaração, a do tipo
   corrente; o editor mantém a que ela escreveu (US3-7 / FR-014).
8. Deixe um trecho que o mermaid recusa e copie → o trecho **vai junto**; a saída difere do editor
   **apenas** na declaração do tipo (US3-8 / FR-017).

**Espera:** SC-001 (100% aceito e mesmo desenho, sem tolerância parcial), SC-004 (mover todos → código
byte-idêntico; 0 efêmeros na saída).

---

## Portões de constituição (rodam em CI)

| Portão | Verificação | Princípio |
|---|---|---|
| Reuso da projeção | projeta 2× mudando 1 nó → identidade referencial dos demais | III |
| Latência no envelope | 3 números medidos em 400 nós (tecla ≤50ms, edição ≤100ms, gesto ≥50fps) | III |
| Transação | N teclas = 1 entrada; sem escrita direta no modelo (fronteira de módulo) | IV |
| Projeção fiel | round-trip byte-idêntico ao mover; corpus 30/30 pelo oráculo mermaid | V |
| Sempre sobra diagrama | todos os prefixos → 0 perdas, nunca vazio | IX |
| mermaid fora do runtime | fronteira de importação: nenhum módulo de edição importa mermaid | X |
| Núcleo sem nome de família | `grep` de nome de família no núcleo reprova | XII |
| Só navegador | build estático; e2e rede-off; sem caminho de exportar imagem | XIII |
| Nasce neutro | nó novo com padrão, sem herança | XIV |

## Definição de pronto (R0)

O cano fecha quando as três histórias passam em e2e, SC-001…SC-010 estão verdes e os portões de
constituição tocados (I-foco, III, IV, V, VII, VIII, IX, X, XII, XIII, XIV) rodam em CI. A partir daí,
`elementos-grafo-dirigido` e as demais specs acrescentam vocabulário sobre este cano.
