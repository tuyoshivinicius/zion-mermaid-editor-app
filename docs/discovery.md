# Descoberta — Editor Visual de Diagramas Mermaid

> Estágio 1 (Descoberta enxuta) do harness Zion Build PRD.
> Insumo direto para `/zion-prd-spike` (Estágio 2) e `/zion-prd-write` (Estágio 3).

## Visão (uma frase)

Um editor web de diagramas Mermaid que mantém **código e canvas visual sempre
sincronizados**, para que quem documenta arquitetura de software desenhe e ajuste
diagramas com a fluidez de uma ferramenta visual, sem abrir mão do texto Mermaid
como fonte da verdade.

## Persona principal

**Rafael, o Engenheiro-Documentador.** Engenheiro de software sênior responsável por
manter a documentação de arquitetura do time. Conhece Mermaid, mas se cansa de
escrever e reposicionar tudo no braço. Trabalha rápido, valoriza design limpo, e quer
colar um diagrama pronto num README ou PR em minutos.

*Persona secundária:* demais membros técnicos do time (devs, QA, PM técnico) que
documentam fluxos de forma pontual.

## Quadro Faz / Não faz

> Regra de fronteira dos recursos de edição: **cada recurso vale onde o tipo de
> diagrama o suporta** (ex.: subgraph e shapes livres de nó são de Flowchart;
> Sequence agrupa com `loop/alt/opt/par` e não tem shapes de nó). A frase-guia é
> "para os tipos compatíveis".

### ✅ Faz

**Base (edição e sincronização)**
- Editor de código Mermaid com **prévia ao vivo** — digitar ou colar código atualiza a prévia.
- **Edição visual bidirecional** no canvas: canvas ↔ código sempre sincronizados (editar em um lado reescreve o outro).
- Suporte aos **5 tipos** de diagrama: Flowchart, Class, State, Sequence, ER.
- **Copiar** o código Mermaid final para uso em outro lugar (README, GitHub, etc.).
- **Ponto de vista visual definido:** ferramenta de dev **dark-first**, desktop-only, **canvas
  protagonista** (ver seção "Descoberta de design"). *(substitui o antigo "design moderno e fácil
  de usar", que não dava direção decidível)*
- **Seletor de template por tipo** no primeiro contato: como toda sessão começa do zero, a tela
  inicial oferece um starter editável de cada um dos 5 tipos, em vez de tela em branco.
- **Undo/redo com histórico unificado** cobrindo edições de canvas e de código como uma linha do
  tempo só.
- **Rede de segurança (autosave local):** rascunho em `localStorage` que restaura ao reabrir após
  fechamento/refresh acidental. É **buffer de recuperação**, não formato de persistência — a única
  saída continua sendo o texto Mermaid (ver ajuste no "Não faz").
- **Preservar e avisar na normalização:** quando a edição visual reescreve um código que tinha
  comentários `%%`/ordem manual, o texto é reancorado quando possível e o usuário é avisado de que
  a edição normalizou o código.

**Edição de conteúdo — serializa NO código Mermaid (round-trip)**
- Adicionar/editar o **texto das conexões**.
- Customizar **tipo de seta**, **tipo de linha** e **cor** das conexões.
- Adicionar todos os **shapes** de nó compatíveis com o tipo de diagrama.
- **Estilizar** elementos: background color, border (estilo/cor), texto (formatação, cor do texto, fonte/tamanho).
- Adicionar **agrupamentos / subgraphs** nos tipos de diagrama compatíveis.
- Alterar a **configuração de layout do Mermaid**: layout hierárquico × adaptativo e **orientação** (TD/LR…).

**Navegação / UI — estado efêmero, NÃO serializa no código**
- **Zoom** e **movimentação/pan** (cursor mãozinha) na área do diagrama.
- **Colapsar/expandir o painel de código** sobre o canvas protagonista. *(reconcilia a antiga
  RF-12 "redimensionar dois painéis co-iguais", que pressupunha split co-igual — ver seção
  "Descoberta de design" e nota de fronteira.)*

### ❌ Não faz (explícito)
- **Não persiste um documento/formato próprio entre sessões** — a única saída persistida/copiável
  é o texto Mermaid. *(Existe apenas um **buffer local de recuperação** contra fechamento acidental
  — ver "Rede de segurança" acima; ele não é um formato de persistência nem sobrevive como artefato
  além do texto Mermaid, então a fronteira da ADR-003, portabilidade sem formato proprietário,
  permanece intacta.)*
- **Não exporta imagem** (PNG/SVG) — a única saída é o código Mermaid.
- **Não suporta** outros tipos de diagrama Mermaid além dos 5 acima (ex.: Gantt, pizza, mindmap, gitgraph).
- **Não tem** colaboração em tempo real / multiusuário.
- **Não tem** contas, login, histórico ou versionamento.
- **Não posiciona nós por coordenada manual** (arrastar-e-fixar livre): a posição é do
  auto-layout do Mermaid; o usuário controla orientação/algoritmo, não coordenada.
  *(reaberto no spike — ver Postura B abaixo)*
- **Não persiste viewport** (zoom/pan/tamanho dos painéis) entre sessões.

## Notas de fronteira (o-quê × como)

- "Canvas" e sincronização bidirecional são tratados aqui como **capacidade desejada**
  (edição visual direta com round-trip), não como escolha técnica. A abordagem de
  renderização/reserialização (canvas vs. SVG, como reserializar Mermaid a partir do
  canvas) é decisão de arquitetura — vai para o spike/ADR no Estágio 2.
- **Fronteira código × UI:** recursos de *estilo/estrutura* (setas, shapes, cores, borda,
  texto, subgraph, orientação de layout) são **serializados no código Mermaid** e viajam
  junto ao copiar. Recursos de *viewport* (zoom, pan, resize dos painéis) são **estado
  efêmero da UI** e nunca entram no código — para preservar a portabilidade do código
  copiado (README/PR).
- O Mermaid faz **auto-layout** (dagre/ELK) e o texto Mermaid **não expressa posição
  por coordenada** de nó. Por isso "arrastar-e-fixar nó livre" não tem onde morar no
  código sem um modelo persistido à parte (ver Postura B).
- **Conflito de fonte-da-verdade no round-trip (furo levantado na descoberta de design):**
  "sempre sincronizado" carrega uma assimetria — regenerar o código a partir do canvas é
  **lossy** (perde comentários `%%` e ordem de declaração, conforme ADR-002). A postura de
  produto para isso é **"preservar e avisar"** (reancorar o possível + sinalizar a
  normalização), não sobrescrever em silêncio. Insumo direto para o ADR-002 e para a futura
  fatia de sincronização; a resolução técnica do conflito é *como*, decidida no Estágio 2.

## Descoberta de design (camada de UX/UI — Estágio 1)

> Consolidada via `/frontend-design` + `/zion-prd-discovery`. Trata do **o-quê da experiência**
> (postura visual, modelo de layout, estados, modelo de interação). O **como** (tokens finais,
> componentes, telas) é do `plan.md`/`spec.md` de cada fatia.

- **Direção visual — ferramenta de dev, dark-first, desktop-only.** Registro VS Code/GitHub
  (denso, monoespaçada em destaque, profissional), casando com a persona Rafael. **Não** é
  responsivo até mobile: um editor canvas+código no toque é inviável; o alvo é desktop.
- **Modelo de layout — canvas protagonista.** O canvas ocupa a tela; o **código é um painel
  colapsável** sob demanda, não uma metade co-igual. Corrige o descompasso persona canvas-first
  × split co-igual que a PRD tinha codificado (ver "Ajuste na PRD" abaixo).
- **Controles de edição — painel de propriedades contextual.** Um painel que se reconfigura por
  **seleção** e por **tipo de diagrama**. É onde a regra "para os tipos compatíveis" vira UI
  honesta (mostra/oculta setas, shapes, cores, borda, texto, subgraph conforme o tipo).
- **Empty state — seletor de template por tipo.** Como a sessão sempre começa do zero, a porta de
  entrada oferece um starter editável de cada um dos 5 tipos, evitando a tela em branco.
- **Undo/redo — histórico unificado.** Uma única linha do tempo (Ctrl+Z/Y) cobrindo canvas e
  código, coerente com "os dois lados são o mesmo diagrama". Table-stakes para a "fluidez de
  ferramenta visual" da visão, e estava ausente de todos os docs.
- **Estabilidade de layout — preservar no incremento + transições.** O auto-layout **não** reflui
  o grafo inteiro a cada edição: preserva o máximo de posições e anima quando reflui de fato.
  Protege o O1 (montar ~10 nós em ≤5 min) contra o risco de "layout que salta".
- **Troca de tipo — autodetecta ao colar; trocar limpa.** Colar código detecta o tipo pelo
  cabeçalho Mermaid e ajusta a UI; trocar de tipo manualmente com conteúdo no canvas **recomeça**
  (os 5 tipos não são convertíveis entre si).
- **Rede de segurança — autosave local + restaurar** (ver "Faz"): buffer de recuperação, não
  formato de persistência. Distingue "sem formato proprietário" (mantido) de "sem rede de
  segurança" (rejeitado como falso corolário da ADR-003).

**Ajuste na PRD a reconciliar (não editado aqui):** a **RF-12** ("redimensiona os painéis código
↔ canvas") pressupõe **split co-igual** e conflita com "canvas protagonista". Ao revisar a PRD, a
RF-12 deve virar **"colapsar/expandir o painel de código"**, não "redimensionar dois painéis
co-iguais". Registrado como insumo do Estágio 4 (`/zion-prd-decompose`).

## Notas de spike (insumo para o Estágio 2)

- **Reserialização fiel do Mermaid** a partir de edições no canvas (bidirecionalidade
  total). Maior risco estrutural. Candidato natural a spike/ADR.
- **Postura A × Postura B (persistência do modelo):**
  - **Postura A (adotada no discovery):** dois artefatos — código Mermaid persistido +
    modelo interno **efêmero** só para habilitar o round-trip na sessão. Auto-layout
    posiciona os nós; única saída salva = código puro e portável.
  - **Postura B (adiada, a investigar):** três camadas — um **documento nativo
    persistido** (código + metadados: posições manuais, viewport, estilos ricos) que
    permitiria arrastar nós livremente e reabrir restaurando o layout exato. Muda o
    "não persiste / única saída é o código". Decisão deliberadamente adiada para ADR.

## Veredito de conclusão (critério `discovery`)

- ✓ Visão em 1 frase
- ✓ ≥1 persona nomeada (Rafael, o Engenheiro-Documentador)
- ✓ Pelo menos um "não faz" explícito (7 itens)
- ✓ Camada de descoberta de design consolidada (direção visual, layout, controles, estados,
  undo, estabilidade de layout, troca de tipo, rede de segurança) — via `/frontend-design`.

**Ajuste a propagar aos estágios seguintes:** RF-12 (split co-igual → painel colapsável) e a
postura "preservar e avisar" no conflito de fonte-da-verdade (insumo do ADR-002 / fatia de sync).
