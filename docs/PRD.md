# PRD — Editor Visual de Diagramas Mermaid

> Estágio 3 (PRD enxuta) do harness Zion Build PRD. Escrita sobre `docs/discovery.md` + `docs/adr/`.
> Carrega **o-quê / por-quê** (visão e escopo). O **como / com quê** (stack, telas, contratos,
> critérios de aceite) vive no `spec.md`/`plan.md` de cada feature. Insumo do `/zion-prd-decompose`
> (Estágio 4) e da `constitution`.

## 1. Visão

Para **Rafael, o Engenheiro-Documentador** — que se cansa de escrever e reposicionar diagramas
Mermaid à mão —, o **Editor Visual de Diagramas Mermaid** é um **editor web** que mantém **código e
canvas visual sempre sincronizados**, para desenhar e ajustar diagramas com a fluidez de uma
ferramenta visual sem abrir mão do **texto Mermaid como fonte da verdade** (portável para README/PR).

## 2. Objetivos & métricas

- **O1 — Desenhar sem escrever Mermaid à mão.** Produzir e copiar um diagrama Mermaid válido usando
  só a UI visual. *Métrica:* os 5 tipos suportados são editáveis ponta-a-ponta pela UI (5/5); um
  diagrama de ~10 nós é montado e copiado em **≤ 5 min** sem digitar Mermaid manualmente.
- **O2 — Editar visualmente um diagrama que já existe.** Colar um diagrama Mermaid pronto e ajustá-lo
  no canvas sem reescrever o texto à mão. *Métrica:* o round-trip preserva **100% do conteúdo
  estrutural** para os tipos de alvo pleno (ver NFR-02).
- **O3 — Manter a saída portável e limpa.** *Métrica:* **100%** da saída é texto Mermaid válido; **0**
  arquivos/formatos proprietários além do texto (a sessão não persiste nada mais).

## 3. Personas

1. **Rafael, o Engenheiro-Documentador** (primária) — engenheiro de software sênior responsável pela
   documentação de arquitetura do time; conhece Mermaid, valoriza design limpo e quer colar um
   diagrama pronto num README/PR em minutos.
2. **Demais membros técnicos do time** (secundária) — devs, QA, PM técnico que documentam fluxos de
   forma pontual.

## 4. Escopo (in / out)

### Faz (in)

- Editor de código Mermaid com **prévia ao vivo** ao digitar ou colar.
- **Edição visual bidirecional** no canvas: canvas ↔ código sempre sincronizados.
- Suporte aos **5 tipos** de diagrama: Flowchart, Class, State, Sequence, ER.
- **Copiar** o código Mermaid final para uso externo (README, GitHub, PR).
- **Edição de conteúdo/estrutura que serializa no código** (para os tipos compatíveis): texto das
  conexões; aparência das conexões (tipo de seta, tipo de linha, cor); shapes de nó; estilização de
  elementos (fundo, borda, texto) quando serializável em Mermaid; agrupamentos/subgraphs; configuração
  de layout do Mermaid (hierárquico × adaptativo e orientação TD/LR…).
- **Fluidez de edição:** undo/redo com **histórico unificado** (canvas e código como uma linha do
  tempo só); **seletor de template por tipo** no primeiro contato (starter editável de cada um dos 5
  tipos, em vez de tela em branco); **troca de tipo** que autodetecta ao colar e recomeça ao trocar
  manualmente com conteúdo no canvas.
- **Round-trip honesto — preservar e avisar:** ao reescrever um código que tinha comentários `%%`/
  ordem manual, o texto é reancorado quando possível e o usuário é avisado de que a edição normalizou
  o código, em vez de sobrescrever em silêncio.
- **Rede de segurança (buffer de recuperação local):** rascunho local que restaura ao reabrir após
  fechamento/refresh acidental — **buffer de recuperação efêmero, não formato de persistência**: a
  única saída copiável continua sendo o texto Mermaid (fronteira do ADR-003 intacta).
- **Postura visual definida:** ferramenta de dev **dark-first**, **desktop-only**, **canvas
  protagonista** (o código é um painel colapsável, não uma metade co-igual).
- **Navegação de canvas efêmera** (não serializa): zoom, pan e **colapsar/expandir o painel de código**.

### Não faz (out)

- **Não persiste** um documento/formato próprio nem o viewport entre sessões — a sessão é efêmera.
  (Existe só um **buffer local de recuperação** contra fechamento acidental — ver "Faz" —, que não é
  formato de persistência nem sobrevive como artefato além do texto Mermaid.)
- **Não é responsivo até mobile** — editar canvas + código no toque é inviável; o alvo é **desktop**.
- **Não exporta imagem** (PNG/SVG) — a única saída é o código Mermaid.
- **Não suporta** tipos de diagrama Mermaid além dos 5 acima (Gantt, pizza, mindmap, gitgraph…).
- **Não tem** colaboração em tempo real / multiusuário.
- **Não tem** contas, login, histórico ou versionamento.
- **Não posiciona nós por coordenada manual fixada** — a posição é do auto-layout; o usuário controla
  orientação/algoritmo, não coordenada (decidido no ADR-003).

## 5. Regras de negócio (RN-xx)

- **RN-01** — O texto Mermaid é a única fonte da verdade persistida/copiável; nenhum estado necessário
  para reproduzir o diagrama vive fora dele.
- **RN-02** — Estilo e estrutura (setas, shapes, cores, borda, texto, subgraph, orientação) serializam
  no código e viajam ao copiar; viewport (zoom, pan, tamanho dos painéis) é efêmero e nunca entra no
  código.
- **RN-03** — Cada recurso de edição vale apenas onde o tipo de diagrama o suporta ("para os tipos
  compatíveis").
- **RN-04** — A posição dos nós é do auto-layout; o usuário controla orientação/algoritmo de layout,
  não coordenada manual fixada.
- **RN-05** — A sessão é efêmera: sem contas, sem histórico, sem persistência entre sessões.
- **RN-06** — O buffer de recuperação local é **efêmero e não é formato de persistência**: nenhum
  estado necessário para reproduzir o diagrama vive fora do texto Mermaid; ele só protege contra perda
  acidental dentro da sessão e não vira saída copiável.
- **RN-07** — Os 5 tipos **não são convertíveis entre si**: trocar de tipo manualmente com conteúdo no
  canvas recomeça o diagrama.

## 6. Requisitos funcionais por épico (RF-xx)

- **Épico E1 — Sincronização código ↔ canvas (o coração):**
  - `RF-01` — O usuário vê a prévia do diagrama atualizar ao digitar ou colar código Mermaid.
  - `RF-02` — O usuário edita no canvas e o código Mermaid é reescrito, e vice-versa, mantendo os dois
    lados sincronizados.
  - `RF-03` — O usuário copia o código Mermaid final para uso em outro lugar.
- **Épico E2 — Cobertura de tipos de diagrama:**
  - `RF-04` — O usuário edita e sincroniza os 5 tipos suportados (Flowchart, Class, State, Sequence, ER).
- **Épico E3 — Edição de conteúdo e estrutura (serializa no Mermaid, para os tipos compatíveis):**
  - `RF-05` — O usuário adiciona e edita o texto das conexões.
  - `RF-06` — O usuário customiza a aparência das conexões (tipo de seta, tipo de linha, cor).
  - `RF-07` — O usuário adiciona os shapes de nó compatíveis com o tipo de diagrama.
  - `RF-08` — O usuário estiliza elementos (fundo, borda, texto) quando o estilo é serializável em Mermaid.
  - `RF-09` — O usuário agrupa elementos em subgraphs nos tipos que suportam agrupamento.
  - `RF-10` — O usuário ajusta a configuração de layout (hierárquico × adaptativo e orientação TD/LR…).
- **Épico E4 — Navegação de canvas (UI efêmera, não serializa):**
  - `RF-11` — O usuário dá zoom e move (pan) a área do diagrama.
  - `RF-12` — O usuário colapsa e expande o painel de código sobre o canvas protagonista.
- **Épico E5 — Fluidez, recuperação e segurança de edição (comportamento de produto):**
  - `RF-13` — O usuário desfaz e refaz edições numa **linha do tempo única** que cobre canvas e código.
  - `RF-14` — O usuário começa de um **template por tipo** (starter editável de cada um dos 5 tipos) em
    vez de tela em branco.
  - `RF-15` — O usuário **recupera o rascunho** ao reabrir após fechamento/refresh acidental (buffer
    local efêmero).
  - `RF-16` — O usuário é **avisado quando a edição visual normaliza** o código (perda de comentários
    `%%`/ordem), com reancoragem quando possível.
  - `RF-17` — O sistema **autodetecta o tipo ao colar**; trocar de tipo manualmente com conteúdo
    **recomeça** o diagrama.

## 7. NFRs (com números)

- **NFR-01 — Prévia ao vivo:** a prévia atualiza em **≤ 150 ms** após a digitação/edição.
- **NFR-02 — Fidelidade de round-trip:** o ciclo canvas → Mermaid → canvas preserva **100% do conteúdo
  estrutural** (nós, arestas, rótulos, shapes, subgraphs e estilos serializáveis) para **Flowchart,
  Class, State e ER**. Perdas conhecidas e aceitas: ordem de declaração e comentários `%%` (ADR-002).
- **NFR-03 — Cobertura de tipos:** **5** tipos suportados (Flowchart, Class, State, Sequence, ER).
  **Sequence** tem fidelidade declarada à parte e pode ter escopo reduzido (ADR-001/ADR-002).
- **NFR-04 — Determinismo da saída:** a geração de Mermaid a partir do canvas é **determinística** —
  a mesma entrada produz **100%** a mesma saída.

## 8. Restrições (das ADRs)

- **R1 (`docs/adr/ADR-001`):** o canvas de edição visual é um **grafo editável dedicado** (não o SVG
  de saída do Mermaid); o layout dos nós é **calculado pela aplicação**, não por coordenadas escritas
  no texto Mermaid.
- **R2 (`docs/adr/ADR-002`):** a **geração** de Mermaid a partir do canvas é determinística e é a
  fonte da saída; a **importação** de Mermaid é best-effort com **fidelidade declarada por tipo**; o
  layout é recalculado pela aplicação; a dependência da API interna do Mermaid fica confinada a uma
  **camada de adaptação isolada** e substituível.
- **R3 (`docs/adr/ADR-003`):** a sessão é **efêmera**; a única saída persistida/copiada é o **texto
  Mermaid**; a posição dos nós é do **auto-layout** (usuário controla orientação/algoritmo, não
  coordenada); **sem** documento nativo, persistência entre sessões ou export de imagem.

## 9. Glossário

- **Round-trip** — ciclo completo texto Mermaid → canvas → texto Mermaid (e vice-versa) mantendo os
  dois lados sincronizados.
- **Fonte da verdade** — o texto Mermaid; o único artefato persistido/copiável do qual o diagrama é
  integralmente reproduzível.
- **Auto-layout** — posicionamento automático dos nós calculado pela aplicação; o usuário influencia
  orientação/algoritmo, não coordenada por nó.
- **Fidelidade estrutural** — grau em que nós, arestas, rótulos, shapes, subgraphs e estilos
  serializáveis sobrevivem ao round-trip (medida por conteúdo, insensível à ordem).
- **Estado efêmero / viewport** — zoom, pan e estado de colapso do painel de código; existe só na
  sessão e nunca entra no código.
- **Buffer de recuperação** — rascunho local efêmero que restaura a sessão após fechamento acidental;
  não é formato de persistência nem saída copiável.
- **Histórico unificado (undo/redo)** — linha do tempo única de desfazer/refazer que trata canvas e
  código como o mesmo diagrama.
- **Template por tipo** — starter editável de um dos 5 tipos oferecido no início da sessão, no lugar
  da tela em branco.
- **Preservar e avisar** — postura de round-trip: ao normalizar o código (perdendo `%%`/ordem),
  reancora o possível e sinaliza ao usuário em vez de sobrescrever em silêncio.
- **"Para os tipos compatíveis"** — regra de fronteira: um recurso de edição só se aplica onde o tipo
  de diagrama o suporta.
- **Fragmento (Sequence)** — bloco de agrupamento de Sequence (`loop`/`alt`/`opt`/`par`).

## 10. Riscos

- **Fidelidade do Sequence** — pior encaixe no modelo nós+arestas; maior risco de fidelidade. Pode
  virar limitação de escopo declarada (fatiar por último). *Mitigação:* spike já reduziu o risco a
  baixo (ADR-002); verificação de pixel fica para a fatia de canvas.
- **Dependência de API interna e depreciada do Mermaid** na importação pode quebrar em upgrades (a API
  específica está registrada no ADR-002). *Mitigação:* camada de adaptação isolada + teste de
  round-trip por tipo.
- **Class/State/ER não exercidos no spike** (mesmo mecanismo do Flowchart, mas fidelidade presumida,
  não provada). *Mitigação:* teste de round-trip por tipo antes de fechar cada fatia.
- **Layout pode "saltar"** entre edições por ser recalculado. *Mitigação:* layout estável e transições
  (limite aceito no ADR-003).

## 11. Questões abertas

- `[NEEDS CLARIFICATION]` Qual o alvo de fidelidade específico do **Sequence** — pleno ou reduzido — e
  ele entra na primeira release ou é fatiado por último?
- `[NEEDS CLARIFICATION]` Há **limite de tamanho** de diagrama (nº de nós) para sustentar a latência
  ≤ 150 ms (NFR-01)?
- `[NEEDS CLARIFICATION]` Quais **estilos ricos** (`classDef`/`style`) entram no escopo serializável vs.
  ficam efêmeros?

## 12. Rastreabilidade

> Tabela RF → épico → fatia → release — injetada e mantida por `/zion-prd-decompose` (Estágio 4).
> Uma linha por `RF-xx` in-scope. **Feature/Spec** e **Status** ficam pendentes até o handoff a
> `/speckit.specify` e a implementação de cada fatia.

| RF | Descrição (1 frase) | Épico | Fatia | Feature / Spec | Release | Status |
|----|---------------------|-------|-------|----------------|---------|--------|
| RF-01 | Prévia do diagrama atualiza ao digitar/colar código Mermaid. | E1 | S0 | _(pendente)_ | R0 | ☐ pendente |
| RF-02 | Canvas e código Mermaid sempre sincronizados (bidirecional). | E1 | S0 | _(pendente)_ | R0 | ☐ pendente |
| RF-03 | Copiar o código Mermaid final para uso externo. | E1 | S0 | _(pendente)_ | R0 | ☐ pendente |
| RF-04 | Edita e sincroniza os 5 tipos suportados. | E2 | S0 · S10 · S11 · S12 · S16 | _(pendente)_ | R0→R4 | ☐ pendente |
| RF-05 | Adiciona e edita o texto das conexões. | E3 | S2 | _(pendente)_ | R1 | ☐ pendente |
| RF-06 | Customiza a aparência das conexões (seta, linha, cor). | E3 | S5 | _(pendente)_ | R2 | ☐ pendente |
| RF-07 | Adiciona os shapes de nó compatíveis com o tipo. | E3 | S2 | _(pendente)_ | R1 | ☐ pendente |
| RF-08 | Estiliza elementos (fundo, borda, texto) serializáveis. | E3 | S6 | _(pendente)_ | R2 | ☐ pendente |
| RF-09 | Agrupa elementos em subgraphs nos tipos que suportam. | E3 | S7 | _(pendente)_ | R2 | ☐ pendente |
| RF-10 | Ajusta a configuração de layout (hierárquico × adaptativo, orientação). | E3 | S8 | _(pendente)_ | R2 | ☐ pendente |
| RF-11 | Zoom e pan na área do diagrama. | E4 | S9 | _(pendente)_ | R2 | ☐ pendente |
| RF-12 | Colapsa/expande o painel de código sobre o canvas. | E4 | S9 | _(pendente)_ | R2 | ☐ pendente |
| RF-13 | Desfaz/refaz numa linha do tempo única (canvas + código). | E5 | S3 | _(pendente)_ | R1 | ☐ pendente |
| RF-14 | Começa de um template por tipo em vez de tela em branco. | E5 | S1 · S15 · S16 | _(pendente)_ | R1→R4 | ☐ pendente |
| RF-15 | Recupera o rascunho ao reabrir após fechamento/refresh acidental. | E5 | S4 | _(pendente)_ | R1 | ☐ pendente |
| RF-16 | Avisado quando a edição visual normaliza o código (`%%`/ordem). | E5 | S13 | _(pendente)_ | R3 | ☐ pendente |
| RF-17 | Autodetecta o tipo ao colar; troca manual recomeça o diagrama. | E5 | S14 | _(pendente)_ | R3 | ☐ pendente |

**Legenda de status:** ☐ pendente · ◐ em spec · ● implementada.

**Walking skeleton:** a fatia **S0 (R0)** é a fatia zero — prova o pipeline inteiro (import best-effort →
modelo canônico → canvas React Flow → gerador determinístico → saída copiável) em um único tipo (Flowchart).
