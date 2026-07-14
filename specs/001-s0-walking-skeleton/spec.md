# Feature Specification: Fatia S0 — Walking Skeleton (Flowchart Bidirecional)

**Feature Branch**: `001-s0-walking-skeleton`
**Created**: 2026-07-13
**Status**: Draft
**Input**: User description: "Fatia S0 — walking skeleton do Editor Visual de Diagramas Mermaid. Prova o pipeline inteiro ponta-a-ponta para um único tipo de diagrama (Flowchart): colar/digitar código e ver a prévia; editar o canvas e ver o código reescrito (bidirecional); copiar o código final. Sessão efêmera."

## User Scenarios & Testing *(mandatory)*

Esta é a **fatia zero**: uma travessia fina, mas completa, de todo o produto para um único
tipo de diagrama (Flowchart). O valor não está na largura de recursos, mas em provar que o
pipeline inteiro — do texto à prévia visual, do canvas de volta ao texto, e do texto para a
área de transferência — funciona ponta-a-ponta e permanece sincronizado.

### User Story 1 - Ver a prévia a partir do código (Priority: P1)

Trabalhando com um Flowchart, o usuário cola ou digita código Mermaid numa área de texto e
vê a prévia do diagrama aparecer, imediatamente, num canvas visual. Enquanto continua a
editar o texto, a prévia acompanha a digitação em tempo real.

**Why this priority**: É o primeiro elo do pipeline e o menor incremento que já entrega
valor observável: transformar texto em imagem viva. Sem ele, nenhum outro elo existe. Sozinho,
já é um "visualizador de Flowchart" utilizável.

**Independent Test**: Colar um trecho de Flowchart válido e confirmar que o canvas exibe os
nós e as conexões correspondentes; alterar o texto e confirmar que a prévia se atualiza sem
ação adicional do usuário.

**Acceptance Scenarios**:

1. **Given** o editor vazio, **When** o usuário cola um Flowchart Mermaid válido com nós e
   arestas, **Then** o canvas passa a exibir os nós e as conexões correspondentes.
2. **Given** um Flowchart já visível no canvas, **When** o usuário digita uma nova aresta no
   texto, **Then** a prévia incorpora a nova conexão sem que o usuário precise acionar
   qualquer botão.
3. **Given** um Flowchart no canvas, **When** o usuário renomeia o rótulo de um nó no texto,
   **Then** o rótulo exibido no canvas muda para o novo valor.
4. **Given** o usuário está digitando código incompleto ou inválido, **When** o texto ainda
   não representa um Flowchart válido, **Then** a última prévia válida permanece e uma
   indicação clara sinaliza que o texto atual não pôde ser interpretado — sem quebrar a tela.

---

### User Story 2 - Editar no canvas e sincronizar o código (Priority: P2)

O usuário manipula o diagrama diretamente no canvas — adiciona um nó, renomeia um nó, conecta
dois nós, remove um nó ou uma conexão — e vê o código Mermaid ser reescrito para refletir a
mudança. A recíproca também vale: editar o texto atualiza o canvas. Os dois lados permanecem
sempre sincronizados, qualquer que seja o lado em que a edição comece.

**Why this priority**: Fecha o laço bidirecional que é o coração do produto. Depende de US1
(a direção texto → canvas) e a completa com a direção canvas → texto. É o que distingue um
editor de um mero visualizador.

**Independent Test**: A partir de um Flowchart no canvas, adicionar um nó e ligá-lo a um nó
existente usando apenas o canvas; confirmar que o código de saída passa a conter o novo nó e
a nova aresta; em seguida, editar esse mesmo código no texto e confirmar que o canvas reflete
a alteração.

**Acceptance Scenarios**:

1. **Given** um Flowchart com dois nós no canvas, **When** o usuário adiciona um terceiro nó e
   o conecta a um dos existentes pelo canvas, **Then** o código Mermaid é reescrito contendo o
   novo nó e a nova aresta.
2. **Given** um Flowchart no canvas, **When** o usuário renomeia o rótulo de um nó pelo canvas,
   **Then** o código Mermaid reflete o novo rótulo.
3. **Given** um Flowchart no canvas, **When** o usuário remove um nó pelo canvas, **Then** o
   código Mermaid deixa de conter esse nó e todas as arestas que dependiam dele.
4. **Given** uma edição feita pelo canvas que reescreveu o código, **When** o usuário edita
   esse código no texto logo em seguida, **Then** o canvas reflete a edição do texto — sem que
   as duas fontes entrem em conflito ou se sobreponham de forma inesperada.
5. **Given** o mesmo diagrama montado no canvas, **When** o código é gerado repetidamente a
   partir do canvas sem nenhuma alteração, **Then** o texto produzido é idêntico a cada vez.

---

### User Story 3 - Copiar o código final para uso externo (Priority: P3)

Satisfeito com o diagrama, o usuário copia o código Mermaid final com uma única ação, para
colar em outro lugar — um README, a descrição de um PR, uma issue.

**Why this priority**: É a saída do produto e a razão de o texto Mermaid ser a única entrega.
Depende de haver um código válido (US1/US2), mas é o menor e último elo; sem ele, o trabalho
feito não sai da ferramenta.

**Independent Test**: Com um Flowchart no canvas, acionar a cópia e confirmar que a área de
transferência contém exatamente o código Mermaid mostrado no editor de texto, pronto para
colar.

**Acceptance Scenarios**:

1. **Given** um Flowchart válido no editor, **When** o usuário aciona a cópia, **Then** a área
   de transferência passa a conter o código Mermaid correspondente, íntegro.
2. **Given** o código foi copiado, **When** o usuário cola em um destino externo qualquer,
   **Then** o texto colado é um Flowchart Mermaid válido que reproduz o mesmo diagrama.
3. **Given** o usuário acionou a cópia, **When** a operação conclui, **Then** um retorno visual
   confirma que o código foi copiado.

---

### Edge Cases

- **Código inválido ou incompleto durante a digitação**: a tela não quebra; a última prévia
  válida é mantida e uma indicação clara sinaliza que o texto atual não pôde ser interpretado.
  Quando **não há prévia válida anterior** (a primeira entrada já é inválida), o canvas recai no
  estado inicial vazio somado à mesma indicação de "texto não interpretável" — nunca uma tela
  quebrada.
- **Conteúdo que não é Flowchart** (ex.: um diagrama de sequência ou de classes colado nesta
  fatia): fora do escopo de S0; o sistema sinaliza que apenas Flowchart é suportado nesta fatia,
  sem tentar renderizá-lo como Flowchart.
- **Entrada vazia**: o canvas exibe um estado inicial vazio, sem erro.
- **Comentários (`%%`) e ordem de declaração no código importado**: podem não sobreviver ao
  ciclo de ida e volta; essa perda é conhecida e declarada (ver FR-008), nunca silenciosa para
  o restante do conteúdo estrutural.
- **Diagrama grande**: acima de um limite de tamanho a ser declarado no plano da fatia, a
  responsividade da prévia pode degradar; o limite para o qual a experiência ao vivo é
  garantida deve ser explícito.
- **Recarregar ou fechar a aba**: por ser sessão efêmera, o trabalho não copiado é perdido; o
  usuário não é levado a crer que algo ficou salvo.

## Clarifications

### Session 2026-07-14

- Q: Ao criar um nó diretamente no canvas em S0, qual formato ele recebe? → A: Nós criados pelo canvas usam um único formato padrão (retângulo); os demais formatos Mermaid são preservados quando importados do texto, mas não são selecionáveis pelo canvas nesta fatia.
- Q: O usuário pode definir/editar o rótulo de uma aresta pelo canvas em S0? → A: Não; o canvas apenas cria/remove arestas. Rótulos de aresta são preservados no ciclo quando vêm do texto importado, mas não são editáveis pelo canvas nesta fatia.
- Q: Como a direção/orientação do Flowchart (ex.: TD vs LR) se comporta em S0? → A: A direção é lida do texto importado, orienta o layout e é reescrita sem alteração (sobrevive ao ciclo); diagramas iniciados pelo canvas assumem o padrão top-down; nenhum controle de orientação é exposto em S0.
- Q: Como o identificador de um nó criado pelo canvas é atribuído em S0? → A: O ID é derivado do rótulo (slug); ao renomear o nó pelo canvas, o ID é regerado a partir do novo rótulo e todas as arestas que o referenciam são reescritas para o novo ID, mantendo o diagrama íntegro.
- Q: Quais construtos de estilo do Flowchart MUST sobreviver ao ciclo em S0? → A: Todos (`style`, `classDef`/`class`/`:::`, `linkStyle`), preservados como blocos de passagem opacos, mesmo não editáveis pelo canvas.
- Q: Como tratar colisão de ID quando dois nós geram o mesmo slug de rótulo? → A: Garantir unicidade sufixando de forma determinística (`slug`, `slug-2`, …); rótulos exibidos podem coincidir, IDs permanecem distintos; nunca fundir nós.
- Q: Onde entram nós criados pelo canvas num diagrama com subgráficos? → A: Sempre no nível raiz (fora de qualquer subgráfico); subgráficos importados ficam intactos e não recebem novos nós pelo canvas em S0.
- Q: Enquanto o texto contém código inválido/não-interpretável (prévia válida anterior mantida), o que acontece quando o usuário faz uma edição pelo canvas? → A: O modelo estrutural interno é a fonte de verdade única; a edição pelo canvas muta o último modelo válido e regenera código Mermaid válido, substituindo o texto inválido (que é apenas um overlay transitório de digitação).
- Q: Como o sistema se comporta quando a cópia em uma única ação para a área de transferência falha (permissão negada, contexto inseguro, navegador sem suporte)? → A: Sinalizar a falha claramente e manter o código selecionável para cópia manual, garantindo que a única entrega do produto permaneça acessível.
- Q: O canvas de S0 expõe controles de viewport (zoom/pan) e a spec deve afirmar a invariância do texto Mermaid em relação ao estado do viewport (Princípio VIII da constitution)? → A: Sim; zoom/pan estão disponíveis (padrão do React Flow) e o texto gerado MUST ser idêntico caractere a caractere independentemente de zoom, pan ou estado de colapso do painel de código.
- Q: Quando um rename pelo canvas regenera o ID de um nó, o que acontece com os blocos `style`/`class`/`:::` preservados que referenciam o ID antigo? → A: As referências de ID dentro desses blocos preservados MUST ser reescritas (ID antigo → novo ID) no mesmo rename; o conteúdo dos blocos permanece opaco, mas seus alvos de ID acompanham o rename — sem referências pendentes.
- Q: A variante do conector de aresta (`-->`, `---`, `-.->`, `==>`, `--o`, `--x`) precisa sobreviver ao ciclo? → A: Sim; a variante de conector é conteúdo estrutural — arestas importadas MUST preservar sua variante exata no ciclo; arestas criadas pelo canvas usam um único padrão (seta sólida `-->`).
- Q: Como rótulos com caracteres especiais do Mermaid (aspas, `[]{}()`, `|`, `#`, `;`, quebras de linha) são tratados na geração de ID e de código? → A: Qualquer rótulo é aceito; o serializador SEMPRE emite Mermaid válido (aspas/escape do rótulo conforme necessário) e o slug do ID é derivado por transliteração/remoção para um conjunto de caracteres seguro (com a regra de sufixo de unicidade da FR-003).
- Q: Ao remover um nó/aresta pelo canvas, o que acontece com blocos `style`/`class`/`:::`/`linkStyle` preservados que referenciam o elemento removido? → A: A remoção também descarta as referências de estilo preservadas que apontam exclusivamente para o elemento removido; nenhuma referência pendente permanece no código gerado (espelha a regra de rename da Q1).
- Q: Quando a PRIMEIRA entrada colada/digitada já é inválida (não há prévia válida anterior para manter), o que o canvas exibe? → A: Recai no estado inicial de canvas vazio somado à indicação clara de "texto não interpretável" (reaproveita o comportamento de estado vazio; nunca quebra a tela).
- Q: Qual o piso de acessibilidade que S0 MUST cumprir para a edição no canvas? → A: Baseline — ações centrais do canvas (adicionar/renomear/conectar/remover) alcançáveis por teclado; elementos com nomes/papéis acessíveis; feedback de status (resultado da cópia, "texto não interpretável") anunciado à tecnologia assistiva. Sem alegar conformidade WCAG completa em S0.
- Q: Em que idioma a interface (rótulos, confirmação de cópia, mensagem de "não interpretável") é apresentada em S0? → A: Português (pt-BR) apenas, com as strings fixas no código; nenhum mecanismo de i18n/localização em S0.
- Q: Qual o dispositivo/fator de forma alvo de S0? → A: Web desktop apenas (mouse + teclado); suporte responsivo/touch/mobile está fora do escopo de S0 e fica para fatias posteriores.
- Q: Desfazer/refazer (undo/redo) faz parte de S0? → A: Não; undo/redo está fora do escopo de S0 (nenhuma pilha de histórico). O painel de texto é o caminho de recuperação manual (editar/colar para restaurar um estado anterior); fica para fatias posteriores.
- Q: Qual é o alvo de compatibilidade Mermaid do código gerado em S0? → A: Mermaid estável atual, com a restrição de que a saída MUST renderizar no GitHub (o destino de colagem declarado é a referência vinculante de compatibilidade); import tolerante, export garantido de renderizar no GitHub.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que o usuário cole ou digite código Mermaid de Flowchart
  em uma área de texto e MUST exibir a prévia correspondente em um canvas visual.
- **FR-002**: A prévia no canvas MUST acompanhar a edição do texto ao vivo, atualizando-se à
  medida que o usuário digita ou cola, sem exigir uma ação explícita de "renderizar".
- **FR-003**: O usuário MUST conseguir editar o diagrama diretamente no canvas — no mínimo:
  adicionar um nó, renomear o rótulo de um nó, conectar dois nós (criar aresta), remover um nó
  e remover uma aresta — e o sistema MUST reescrever o código Mermaid para refletir cada
  edição. Nós criados pelo canvas MUST usar um único formato padrão (retângulo); a seleção de
  outros formatos de nó pelo canvas está fora do escopo de S0 (os demais formatos são apenas
  preservados no ciclo quando vêm do texto importado — ver FR-007). O identificador de um nó
  criado ou renomeado pelo canvas MUST ser derivado do seu rótulo (slug); ao renomear um nó
  pelo canvas, o ID MUST ser regerado a partir do novo rótulo e todas as arestas que o
  referenciam MUST ser reescritas para o novo ID, preservando a integridade do diagrama.
  Além das arestas, qualquer referência a esse ID dentro de blocos de estilo preservados
  (`style`/`class`/`:::` — ver FR-007) MUST ser reescrita no mesmo rename (ID antigo → novo
  ID), de modo que nenhuma referência fique pendente no código gerado. Ao **remover** um nó (e
  suas arestas) pelo canvas, o sistema MUST igualmente descartar as referências de estilo
  preservadas (`style`/`class`/`:::`/`linkStyle`) que apontem exclusivamente para o elemento
  removido, de modo que o código gerado não contenha nenhuma referência pendente.
  Quando dois nós resultariam no mesmo ID (rótulos que geram o mesmo slug), o sistema MUST
  garantir unicidade sufixando de forma determinística (ex.: `slug`, `slug-2`, `slug-3`); os
  rótulos exibidos podem coincidir, mas os IDs MUST permanecer distintos (nunca fundir nós).
  Qualquer rótulo MUST ser aceito: o serializador MUST sempre emitir Mermaid válido — aplicando
  aspas/escape ao rótulo conforme necessário quando ele contém caracteres especiais do Mermaid
  (aspas, `[]{}()`, `|`, `#`, `;`, quebras de linha) — e o slug do ID MUST ser derivado por
  transliteração/remoção para um conjunto de caracteres seguro, aplicando em seguida a regra de
  unicidade acima. A criação de aresta pelo
  canvas MUST NOT exigir nem oferecer edição de rótulo de aresta em S0; rótulos de aresta são
  apenas preservados no ciclo quando vêm do texto importado (ver FR-007). Arestas criadas pelo
  canvas MUST usar um único conector padrão (seta sólida `-->`); a variante de conector de
  arestas importadas é preservada no ciclo (ver FR-007), mas não é selecionável pelo canvas em S0.
- **FR-004**: O código e o canvas MUST permanecer sincronizados de forma bidirecional: uma
  edição iniciada em qualquer um dos lados MUST refletir-se no outro, sem que as duas fontes
  entrem em conflito. Um modelo estrutural interno MUST ser a fonte de verdade única; o texto
  inválido/incompleto durante a digitação é apenas um overlay transitório (ver FR-012). Quando
  o texto está não-interpretável e o usuário faz uma edição pelo canvas, o sistema MUST mutar o
  último modelo válido e regenerar código Mermaid válido, substituindo o texto inválido — a
  edição do canvas nunca é bloqueada pela presença de texto inválido.
- **FR-005**: O usuário MUST conseguir copiar o código Mermaid final para a área de
  transferência com uma única ação, e o sistema MUST confirmar visualmente a cópia. Se a cópia
  falhar (permissão negada, contexto inseguro, navegador sem suporte), o sistema MUST sinalizar
  a falha claramente e MUST manter o código selecionável para cópia manual, de modo que a única
  entrega do produto permaneça acessível. O código Mermaid gerado MUST ter como alvo o Mermaid
  estável atual e MUST renderizar no GitHub (o destino de colagem declarado — README, descrição
  de PR, issue — é a referência vinculante de compatibilidade); a importação permanece tolerante
  ("best-effort", FR-012), mas a exportação MUST garantir renderização no GitHub.
- **FR-006**: Esta fatia MUST cobrir somente o tipo **Flowchart**; conteúdo de outros tipos de
  diagrama está fora do escopo de S0 e MUST ser sinalizado como não suportado nesta fatia, sem
  tentativa de renderização.
- **FR-007**: O ciclo canvas → código → canvas para Flowchart MUST preservar 100% do conteúdo
  estrutural (nós, arestas, rótulos, formatos de nó, **variantes de conector de aresta** —
  `-->`, `---`, `-.->`, `==>`, `--o`, `--x` —, subgráficos e estilos). A variante de conector de
  cada aresta importada MUST ser preservada exatamente no ciclo (não é perda admissível — ver
  FR-008). Todos os construtos
  de estilo do Flowchart — `style` (nó), `classDef`/`class`/`:::` e `linkStyle` (aresta) — MUST
  ser preservados no ciclo como blocos de passagem opacos, mesmo não sendo editáveis pelo canvas
  em S0. O conteúdo desses blocos é opaco, mas suas **referências a IDs de nós** MUST acompanhar
  um rename pelo canvas (ID antigo → novo ID — ver FR-003) e a remoção de um nó/aresta pelo
  canvas MUST descartar as referências preservadas que apontem exclusivamente para o elemento
  removido, de modo que nenhum bloco preservado fique com referência pendente. Subgráficos importados MUST ser preservados intactos; nós criados pelo canvas MUST ser
  adicionados no nível raiz (fora de qualquer subgráfico), pois o agrupamento em subgráficos
  pelo canvas está fora do escopo de S0.
- **FR-008**: As únicas perdas admissíveis no ciclo de ida e volta MUST ser a **ordem de
  declaração** e os **comentários `%%`**; toda perda de conteúdo estrutural fora dessas duas é
  proibida, e as perdas admissíveis MUST ser declaradas, nunca silenciosas.
- **FR-009**: A geração do código a partir do canvas MUST ser determinística: a mesma
  configuração de canvas MUST produzir exatamente o mesmo texto, caractere a caractere, a cada
  geração.
- **FR-010**: O arranjo/posição dos nós no canvas MUST ser calculado automaticamente pela
  aplicação (auto-organização); coordenadas de posição de nó MUST NOT ser escritas no código
  Mermaid nem lidas dele. A **direção do Flowchart** (ex.: TD, LR) É conteúdo estrutural: MUST
  ser lida do texto importado, orientar o layout e ser reescrita sem alteração no ciclo (não é
  perda admissível — ver FR-008). Diagramas iniciados pelo canvas MUST assumir o padrão
  top-down; nenhum controle de orientação é exposto em S0.
- **FR-011**: A sessão MUST ser efêmera: a única saída produzida/levável para fora é o texto
  Mermaid copiado; nenhum conteúdo (nem o diagrama, nem as posições dos nós) é persistido entre
  sessões, e o usuário MUST NOT ser induzido a crer que algo ficou salvo.
- **FR-012**: A importação de código digitado/colado MUST ser tolerante ("best-effort"): diante
  de texto inválido ou incompleto, o sistema MUST manter a última prévia válida e sinalizar
  claramente que o texto atual não pôde ser interpretado, sem quebrar a interface. Quando não
  existir prévia válida anterior (a primeira entrada já é inválida), o sistema MUST exibir o
  estado inicial de canvas vazio somado à mesma indicação de "texto não interpretável", nunca
  uma interface quebrada.
- **FR-013**: O canvas MUST expor controles de viewport (zoom e pan; padrão do React Flow). O
  estado do viewport — zoom, pan e o estado de colapso do painel de código — MUST ser efêmero
  e MUST NOT entrar no texto Mermaid gerado. O código gerado MUST ser invariante ao estado do
  viewport: idêntico caractere a caractere independentemente de zoom, pan ou colapso do painel
  (Princípio VIII da constitution).
- **FR-014**: S0 MUST cumprir um piso de acessibilidade para a edição no canvas: as ações
  centrais (adicionar nó, renomear nó, conectar/criar aresta, remover nó, remover aresta) MUST
  ser alcançáveis por teclado; os elementos interativos MUST expor nomes e papéis acessíveis; e
  o feedback de status — resultado da cópia (sucesso/falha) e a indicação de "texto não
  interpretável" — MUST ser anunciado à tecnologia assistiva. S0 MUST NOT alegar conformidade
  WCAG completa; contraste, gestão avançada de foco e uma auditoria formal ficam para fatias
  posteriores.

### Key Entities *(include if feature involves data)*

- **Diagrama (Flowchart)**: a representação estrutural em edição, composta por nós e conexões;
  é a fonte a partir da qual tanto o canvas quanto o texto são derivados durante a sessão.
- **Nó**: um elemento do diagrama com um identificador, um rótulo exibido e um formato; sua
  posição no canvas é atribuída pela aplicação, não faz parte do conteúdo estrutural copiável.
- **Aresta (Conexão)**: uma ligação direcionada entre dois nós, podendo ter um rótulo.
- **Código Mermaid**: a representação textual do diagrama; é a **única** entrega copiável e
  levável para fora da sessão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Partindo de um Flowchart colado, o usuário vê a prévia visual correspondente
  aparecer sem nenhuma ação adicional além de colar/digitar (nenhum passo de "renderizar"
  manual).
- **SC-002**: A prévia acompanha a digitação de forma percebida como instantânea, com a
  atualização ocorrendo em no máximo **150 ms** após a alteração do texto (p95), dentro do
  limite de tamanho de diagrama declarado para a fatia.
- **SC-003**: Uma edição feita inteiramente no canvas (adicionar nó + conectar) resulta em um
  código Mermaid que, ao ser recarregado, reproduz exatamente o diagrama editado — 100% do
  conteúdo estrutural preservado, sem perdas além de ordem de declaração e comentários `%%`.
- **SC-004**: Gerar o código a partir de um mesmo canvas, repetidamente, produz um texto
  idêntico caractere a caractere em 100% das repetições.
- **SC-005**: O usuário copia o código final em uma única ação e, ao colar em um destino
  externo, obtém um Flowchart Mermaid válido que reproduz o mesmo diagrama; em particular, o
  código colado no GitHub (README, PR, issue) renderiza corretamente, sem erro de sintaxe.
- **SC-006**: Em nenhuma saída de texto aparecem coordenadas de posição de nó — a posição é
  sempre resultado da auto-organização da aplicação.
- **SC-007**: Ao recarregar a aba, nada além do que o usuário copiou é preservado, e a
  interface não sugere em momento algum que houve salvamento.
- **SC-008**: Diante de código inválido durante a digitação, a interface permanece utilizável
  (a última prévia válida é mantida) em 100% dos casos de entrada malformada testados.
- **SC-009**: Para um mesmo diagrama, alterar zoom, pan ou o estado de colapso do painel de
  código NÃO altera o texto Mermaid gerado — a saída é idêntica caractere a caractere em 100%
  das variações de viewport testadas.
- **SC-010**: Cada ação central de edição no canvas (adicionar nó, renomear nó, conectar aresta,
  remover nó, remover aresta) é executável somente com teclado, e o feedback de cópia e de
  "texto não interpretável" é anunciado à tecnologia assistiva — verificado em 100% dessas
  ações no piso de acessibilidade declarado (FR-014).

## Assumptions

- **Escopo de edição no canvas em S0**: assume-se o conjunto mínimo que prova o laço
  bidirecional — adicionar nó, renomear nó, conectar/criar aresta, remover nó, remover aresta.
  Recursos mais ricos de edição visual (estilos avançados, agrupamento em subgráficos pelo
  canvas, reordenação manual) ficam para fatias posteriores; a importação de código que já
  contenha esses elementos ainda deve preservá-los no ciclo (FR-007). **Desfazer/refazer
  (undo/redo) está fora do escopo de S0**: não há pilha de histórico; o painel de texto é o
  caminho de recuperação manual (editar/colar para restaurar um estado anterior).
- **Tipo único**: apenas Flowchart nesta fatia; os demais quatro tipos (Class, State, Sequence,
  ER) entram em fatias seguintes e não fazem parte de S0.
- **Fidelidade declarada de Flowchart**: 100% estrutural, com perdas admissíveis restritas a
  ordem de declaração e comentários `%%` — coerente com a fidelidade declarada do produto para
  este tipo.
- **Auto-organização como origem do layout**: a disposição visual dos nós é sempre calculada
  pela aplicação; o usuário controla, no máximo, orientação/algoritmo de organização, nunca
  coordenadas fixas gravadas no texto.
- **Sessão sem contas nem armazenamento**: não há autenticação, projetos salvos, nem histórico;
  a ferramenta abre pronta para uso e a saída é sempre o texto copiado.
- **Fator de forma**: S0 tem como alvo a **web desktop apenas** (mouse + teclado). Suporte
  responsivo, touch e mobile está fora do escopo desta fatia e fica para fatias posteriores; o
  piso de acessibilidade (FR-014) é realizado via teclado, não via gestos de toque.
- **Idioma da interface**: toda a UI de S0 (rótulos, confirmação de cópia, indicação de "texto
  não interpretável") é apresentada em português (pt-BR), com strings fixas no código; nenhum
  mecanismo de i18n/localização é introduzido nesta fatia — demais idiomas ficam para fatias
  posteriores.
- **Limite de tamanho para a prévia ao vivo**: existe um teto de tamanho de diagrama para o
  qual a atualização em 150 ms (p95) é garantida; esse teto será declarado no plano da fatia.
- **Resolução de sincronização**: quando ambos os lados poderiam divergir, a edição mais recente
  do usuário prevalece; o plano detalhará a estratégia que evita laços de atualização e
  sobrescritas inesperadas.
