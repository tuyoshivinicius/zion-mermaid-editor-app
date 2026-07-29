# PRD — Editor visual de diagramas mermaid

> Derivada de `docs/discovery.md` e dos ADR-001 a ADR-010. O escopo declarado aqui é o do
> **produto**; o fatiamento em releases é trabalho do `/zion-prd-decompose`.

## 1. Visão

Para quem diagrama pesado — sessões longas, dezenas de elementos, o mesmo ciclo repetido até a mão
cansar —, este é um editor visual de diagramas mermaid em que o custo unitário de materializar um
elemento cai perto de zero e o produto final que se leva embora é o código mermaid, não o desenho.

## 2. Objetivos & métricas

**Objetivo único: o custo unitário de materializar um elemento cai perto de zero.** As três dores da
persona pesam igualmente e são sintoma dele, então cada uma carrega o seu contador. Todos são
contáveis por instrumentação, sem depender de terceiros — o produto é de uso próprio (§3), então não
há métrica de adoção nem de retenção.

| | Métrica | Base medida |
|---|---|---|
| **M1** — cliques por elemento | No ciclo principal, materializar um elemento completo (criado, rotulado, conectado, com a conexão rotulada) custa **≤4 teclas de controle**. Fora do ciclo, aplicar uma alteração a N elementos custa um número de gestos que **não cresce com N** — um ato, um desfazer, para N de 1 a 400. | ADR-005 (4 teclas de controle, 9 elementos) · ADR-009 (N=400) |
| **M2** — alternância teclado ↔ mouse | O ciclo principal completa com **0 alternâncias** para o mouse. | ADR-005 (0 eventos de ponteiro em 9 elementos criados, rotulados e conectados) |
| **M3** — trazer texto de fora | Colar texto de fora dentro de um rótulo custa **0 correções manuais**: o texto volta byte a byte no diagrama e no código, ou volta marcado. | ADR-006 · ADR-008 (26/26 textos hostis por família, idênticos ou marcados) |

## 3. Personas

**Marina** — persona única, definida pela **intensidade de uso, não pelo domínio**.

O produto é de **uso próprio**: a Marina é o retrato de como o autor diagrama pesado, não a persona
de um público a conquistar. É por isso que a §2 mede eficiência de tarefa e não adoção.

O caso mais frequente é documentar arquitetura de software, mas a mesma Marina é a PM desenhando uma
jornada de usuário e a modeladora montando um entidade-relacionamento. O que a define é o volume:
sessões longas, dezenas de elementos, e o ciclo *criar caixa → definir o tipo → escrever o rótulo →
conectar → rotular a conexão → definir o tipo da conexão* repetido até a mão cansar. As três dores
que ela relata — quantidade de cliques por elemento, alternância entre teclado e mouse, e trazer
texto de fora para dentro dos rótulos — pesam igualmente, e são sintoma de uma só: **cada elemento
custa caro para nascer**.

## 4. Escopo (in / out)

**Faz (in)** — o escopo do produto, congelado nos **cinco tipos**: Flowchart, Class, State, Sequence
e ER. A profundidade de vocabulário de cada tipo avança por família de modelo mental (restrição
`R-08`, §8); os gestos de edição valem igualmente nos cinco desde o começo.

Os blocos abaixo são os mesmos seis épicos da §6:

- **Criar e editar elementos** — criar, selecionar (individual e múltipla), mover, duplicar, excluir
  e reconectar nós, conexões e agrupamentos, nos tipos que os comportam; editar o rótulo dos nós e o
  texto das conexões, inclusive com texto trazido de fora; oferecer os shapes compatíveis com cada
  tipo; trocar tipo, shape ou estilo de um elemento já criado ou de uma seleção inteira de uma vez;
  repetir a última alteração em outro elemento; copiar e colar preservando estilos; desfazer e
  refazer, com o ato aplicado a uma seleção inteira desfazendo como um só.
- **Fluxo por teclado** — executar o ciclo principal (criar caixa → rotular → conectar → rotular a
  conexão) de ponta a ponta sem alternar para o mouse.
- **Estilo do diagrama** — tipo de seta, tipo de linha e cor das conexões; cor de fundo, estilo e cor
  de borda e estilo de texto dos nós, dentro do que cada tipo expressa em código.
- **Layout e arranjo** — organizar o diagrama como gesto explícito; reorganizar à mão a posição de
  qualquer elemento e vê-la preservada quando o layout roda; configuração de layout
  (hierárquico/adaptativo) e orientações; ver declarada a divergência de arranjo dentro de
  agrupamentos.
- **Diagrama e código** — escolher e trocar o tipo de diagrama entre os cinco; escrever mermaid e ver
  a prévia acompanhar conforme digita; colar código pronto; sinalizar erro de sintaxe sem que a
  prévia quebre ou se perca; marcar o rótulo que o tipo corrente não expressa fielmente; copiar o
  código gerado, que é o produto final.
- **Área de trabalho e sessão** — redimensionar o editor de código e a área do diagrama; zoom e
  movimentação por cursor hand; ajustar o diagrama à tela e resetar o zoom; recuperar o rascunho em
  curso ao reabrir a aba, e ser avisada quando ele não pôde ser recuperado; ser avisada ao
  ultrapassar o envelope de densidade suportado.

**Não faz (out)** — recusas conscientes, não omissões:

- **Não é um repositório de diagramas** — sem contas, sem biblioteca, sem pastas. O rascunho em curso
  sobrevive a fechar e reabrir a aba como rede de segurança, não como arquivo.
- **Não leva posição de nó no código entregue** — o arranjo que o destinatário do código vê é o que o
  mermaid calcula ao renderizá-lo, não o que foi arrastado na sessão.
- **Não oferece estilo que não vira código** — se um tipo não expressa aquele estilo em mermaid, o
  controle não existe ali.
- **Não exporta imagem** — nem PNG, nem SVG, nem qualquer formato de imagem. O produto final é o
  código.
- **Não transforma texto em estrutura** — fora o próprio mermaid, que é a outra vista do mesmo
  diagrama, nenhum texto vira estrutura por conta própria. Texto de fora entra pelo rótulo e para
  aí.
- **Não presume a próxima escolha** — o elemento novo nasce neutro, sem herdar tipo ou estilo do
  anterior.
- **Não cobre outros tipos de diagrama mermaid** — gantt, mindmap, journey, gitgraph, C4, timeline,
  pie e afins ficam fora.
- **Não tem colaboração nem compartilhamento** — sem edição simultânea, link compartilhável ou
  comentários de revisão. O artefato compartilhável é o próprio código.
- **Não cobre acessibilidade** — leitor de tela, ordem de tabulação revisada e composição de IME
  ficam fora. O fluxo por teclado permanece no faz, mas como eficiência de operação, não como
  acessibilidade; endereçá-la seria outra decisão, com outra evidência (ADR-005).

## 5. Regras de negócio (RN-xx)

Invariáveis: nenhuma spec pode contrariá-las, seja qual for a feature.

- **RN-01** — A posição de um elemento é conforto de sessão: ela vive na sessão e nunca viaja no
  código entregue.
- **RN-02** — O texto de um rótulo volta byte a byte como foi escrito, ou volta marcado; nunca é
  alterado em silêncio para caber.
- **RN-03** — Nenhuma edição dispara o rearranjo do diagrama inteiro: organizar é sempre gesto
  explícito da pessoa.
- **RN-04** — Um ato aplicado a uma seleção é uma entrada de histórico e reverte com um só desfazer,
  seja qual for o tamanho da seleção.
- **RN-05** — O rascunho é uma sessão, uma chave, sobrescrita — sem nome, sem lista, sem versões
  anteriores — e falha para o lado de não existir: rascunho ilegível produz sessão nova com aviso,
  nunca uma aba que não monta.
- **RN-06** — O elemento novo nasce neutro, sem herdar tipo ou estilo do anterior.
- **RN-07** — O histórico de edição é da sessão: reabrir a aba devolve o diagrama, não o passado
  dele.
- **RN-08** — Não existe controle de estilo onde o tipo de diagrama corrente não expressa aquele
  estilo em código.

## 6. Requisitos funcionais por épico (RF-xx)

- **Épico E1 — Criar e editar elementos:**
  - **RF-01:** criar nós, conexões e agrupamentos diretamente na área do diagrama
  - **RF-02:** editar o rótulo de um nó e o texto contido numa conexão, inclusive colando texto vindo de fora, que entra como texto puro sem a formatação da origem
  - **RF-03:** escolher, entre os shapes que o tipo de diagrama corrente expressa, o shape de um nó
  - **RF-04:** trocar o tipo, o shape ou o estilo de um elemento já criado, ou de uma seleção inteira de uma vez, sem recriá-lo
  - **RF-05:** repetir a última alteração em outro elemento, sem refazer o caminho até o controle
  - **RF-06:** selecionar — individual e múltipla —, mover, duplicar e excluir nós, conexões e agrupamentos
  - **RF-07:** reconectar uma conexão para outro nó de origem ou de destino
  - **RF-08:** copiar e colar elementos preservando os seus estilos
  - **RF-09:** desfazer e refazer as ações da sessão
- **Épico E2 — Fluxo por teclado:**
  - **RF-10:** executar o ciclo principal — criar caixa, rotular, conectar, rotular a conexão — de ponta a ponta sem alternar para o mouse
  - **RF-11:** ver o elemento recém-criado pelo teclado trazido para dentro da área visível, para que o rótulo nunca seja digitado às cegas
- **Épico E3 — Estilo do diagrama:**
  - **RF-12:** customizar o tipo de seta, o tipo de linha e a cor de uma conexão
  - **RF-13:** alterar a cor de fundo, o estilo e a cor de borda e o estilo de texto de um nó, dentro do que o tipo de diagrama corrente expressa em código
- **Épico E4 — Layout e arranjo:**
  - **RF-14:** organizar o diagrama inteiro por um gesto explícito
  - **RF-15:** reorganizar à mão a posição de qualquer elemento e ver essa posição preservada quando o layout é acionado
  - **RF-16:** alterar a configuração de layout — hierárquico ou adaptativo — e a orientação do diagrama
  - **RF-17:** ver declarada a divergência de arranjo dentro de agrupamentos, onde o arranjo visível e o do código não coincidem
- **Épico E5 — Diagrama e código:**
  - **RF-18:** escolher e trocar o tipo de diagrama entre os cinco
  - **RF-19:** escrever mermaid no editor de código e ver a prévia acompanhar conforme digita, sem perder o que já foi construído
  - **RF-20:** colar um código mermaid já pronto e obter o diagrama correspondente
  - **RF-21:** ver o erro de sintaxe sinalizado enquanto edita o código, distinguindo o que derruba um trecho do que apenas avisa
  - **RF-22:** ver marcado o rótulo cujo texto o tipo de diagrama corrente não expressa fielmente em código
  - **RF-23:** copiar o código mermaid gerado com um gesto — é o produto final
- **Épico E6 — Área de trabalho e sessão:**
  - **RF-24:** redimensionar o editor de código e a área do diagrama
  - **RF-25:** navegar na área do diagrama com zoom e movimentação por cursor hand
  - **RF-26:** ajustar o diagrama à tela e resetar o zoom
  - **RF-27:** recuperar o rascunho em curso — estrutura, estilo e o arranjo feito à mão — ao reabrir a aba
  - **RF-28:** ser avisada quando o rascunho não pôde ser recuperado, começando uma sessão nova
  - **RF-29:** ser avisada ao ultrapassar o envelope de densidade suportado, em vez de o produto seguir como se nada fosse

## 7. NFRs (com números)
Superfície de uso: sim

Cada NFR declara se a sua base é **medida** (há spike que a sustenta) ou **alvo** (ainda sem
medição).

- **NFR-01** *(experiência)* — o ciclo principal — criar caixa, rotular, conectar, rotular a conexão
  — completa em **≤4 teclas de controle** por elemento e **0 alternâncias** para o mouse. *Medido:
  ADR-005 — 4 teclas de controle e 0 eventos de ponteiro em 9 elementos.*
- **NFR-02** *(experiência)* — trocar o tipo, o shape ou o estilo de um elemento já criado, ou de uma
  seleção inteira, completa em **≤3 passos** a partir do elemento já selecionado. *Alvo declarado —
  nenhum ADR mediu.*
- **NFR-03** — envelope de densidade suportado: **400 nós e 500 conexões**. Dentro dele, a edição
  pontual fica **≤100ms** na mediana, a tecla no editor de código **≤50ms** na mediana e o gesto
  contínuo **≥50fps**. *Medido: ADR-004 e ADR-008.*
- **NFR-04** — pior caso declarado: desfazer um ato aplicado à seleção inteira do envelope, de 400
  elementos, fica **≤110ms no p95**. *Medido: ADR-009 — 96,2ms de mediana e 107,7ms de p95.*
- **NFR-05** — fidelidade de estrutura: **100%** dos códigos copiados são aceitos pelo validador do
  mermaid e desenham o mesmo diagrama que está visível. *Medido: ADR-006 e ADR-008 — 30 de 30
  documentos.*
- **NFR-06** — fidelidade de arranjo **fora de agrupamento**: **0 pares** fora de ordem de leitura
  entre o diagrama visível e o do código, nas 4 orientações. Dentro de agrupamento a divergência é
  declarada e não corrigida — **35%** dos pares fora de ordem no documento de referência. *Medido:
  ADR-007 — 9 de 10 documentos.*
- **NFR-07** — preservação de texto: **100%** dos textos de rótulo voltam byte a byte ou voltam
  marcados; **0** alterações em silêncio. *Medido: ADR-006 e ADR-008 — 26 de 26 por família.*
- **NFR-08** — tolerância na digitação: **0 perdas** de elemento real enquanto se digita no editor de
  código. *Medido: ADR-006 — 0 perdas em 757 prefixos, contra 70 perdas no braço estrito.*
- **NFR-09** — durabilidade da sessão: depois de **600 atos** seguidos a latência do gesto não cresce
  mais que **1,2×**, e o rascunho recuperado devolve o diagrama nas 3 famílias. *Medido: ADR-010 —
  1,1× e 103 de 103 checagens.*

## 8. Restrições (das ADRs)

Uma por ADR, carregando a **restrição de produto** que ela impõe — não a tecnologia que o ADR nomeia,
que vive no `plan.md` da feature. A regra invariável correspondente, quando existe, está na §5 e não
é repetida aqui.

- **R-01** (`docs/adr/ADR-001`) — aplicação que roda inteiramente no navegador, sem servidor e sem
  contas.
- **R-02** (`docs/adr/ADR-002`) — a área do diagrama é um canvas de nós e conexões editável, e cada
  tipo do escopo tem de caber nesse vocabulário.
- **R-03** (`docs/adr/ADR-003`) — diagrama e código são duas vistas do mesmo modelo, e o código é
  projeção dele: o que é efêmero não é projetado.
- **R-04** (`docs/adr/ADR-004`) — o envelope de densidade é compromisso do produto, e toda capacidade
  que acrescente peso por elemento consome dele; a projeção para a vista carrega uma invariante de
  reuso da qual dependem, juntos, a fluidez, o fluxo por teclado e a entrada por texto.
- **R-05** (`docs/adr/ADR-005`) — o ciclo por teclado é máquina de estados do produto: quem cria
  elemento por teclado assume o dever de colocar o foco onde a próxima tecla é esperada, e de trazer
  o elemento para a área visível.
- **R-06** (`docs/adr/ADR-006`) — o mermaid fica fora do caminho de edição, entrando só como
  validador do que é entregue; a análise do código devolve **sempre** um diagrama, nunca "nada", e
  separa o que derruba um trecho do que apenas avisa.
- **R-07** (`docs/adr/ADR-007`) — o layout é gesto explícito, o elemento novo nasce por colocação
  local sem mover os demais, e a posição feita à mão sobrevive quando o layout é acionado.
- **R-08** (`docs/adr/ADR-008`) — os cinco tipos avançam por família de modelo mental, sobre um
  núcleo comum com vocabulário por família; a ordenação dos elementos é semântica em Sequence e
  arranjo nas demais, e Sequence exige desenho próprio na área do diagrama.
- **R-09** (`docs/adr/ADR-009`) — toda mutação do modelo é uma transação, e a transação é a unidade
  do desfazer; uma rajada de digitação é um ato só, e o arranjo entra no histórico junto com a
  estrutura.
- **R-10** (`docs/adr/ADR-010`) — o rascunho guarda o diagrama e o arranjo, não o código, é
  versionado no cabeçalho, e o histórico não o acompanha.

## 9. Glossário

- **Ciclo principal** — a sequência criar caixa → rotular → conectar → rotular a conexão, repetida
  elemento a elemento. É a tarefa-núcleo do produto.
- **Elemento** — qualquer nó, conexão ou agrupamento do diagrama.
- **Modelo** — a estrutura interna que é a única verdade do diagrama; o diagrama visível e o código
  são vistas dela, nunca duas verdades a reconciliar.
- **Arranjo** (ou posição) — onde cada elemento está na área do diagrama. É conforto de sessão: vive
  na sessão e não viaja no código entregue.
- **Organizar** — o gesto explícito que recalcula o arranjo do diagrama inteiro.
- **Envelope de densidade** — a faixa de tamanho de diagrama em que as barras de fluidez são
  compromisso do produto: 400 nós e 500 conexões.
- **Edição pontual** — uma alteração que toca um elemento só: criar, rotular, conectar, mover ou
  trocar o tipo de um. Distingue-se do ato em bloco, que toca uma seleção inteira.
- **Família de modelo mental** — o agrupamento dos cinco tipos por como se pensa neles: grafo
  dirigido (Flowchart e State), nós estruturados (Class e ER) e sequência temporal (Sequence).
- **Marca de expressividade** — a sinalização, no rótulo, de que o tipo de diagrama corrente não
  expressa fielmente em código o texto que ali está. O texto em si nunca é alterado.
- **Ato em bloco** — uma alteração aplicada de uma vez a uma seleção inteira, que conta como uma
  entrada de histórico e reverte com um só desfazer.
- **Rascunho** — a sessão em curso guardada no navegador como rede de segurança. Uma só, sem nome e
  sem lista.
- **Tipo de diagrama** — um dos cinco do escopo: Flowchart, Class, State, Sequence e ER.
- **Shape** — a forma de um nó, dentro do conjunto que o tipo de diagrama corrente expressa em
  código.

## 10. Riscos

- **State e ER nunca foram escritos.** São a interpolação das duas formas já provadas, e "deve caber"
  não é "foi medido". *Mitigação:* são os primeiros incrementos, e o custo por família vem caindo
  (726 → 631 → 482 linhas); se o primeiro estourar, o ponto de retorno é o `R-08`.
- **Sequence exige desenho próprio na área do diagrama, e ele não existe.** O canvas genérico de nós
  e conexões perde justamente o que define a família — a ordem das mensagens fica invisível.
  *Mitigação:* o desenho já foi projetado e medido; entra como spec própria, não como variação de
  outra.
- **A primeira letra de um rótulo pode se perder.** Há uma janela de 2 frames entre o produto entrar
  em modo de edição e o campo existir, nada bufferiza a tecla digitada nesse intervalo, e a persona
  digita rápido. Medido e não resolvido. *Mitigação:* é a primeira coisa a endereçar na spec do fluxo
  por teclado.
- **O envelope tem um gesto no limite.** O desfazer sobre a seleção inteira de 400 elementos mede na
  fronteira da barra (`NFR-04`), e toda capacidade nova que encareça a projeção come dessa margem
  antes de qualquer outra. *Mitigação:* o limite é declarado, e o pior caso tem NFR próprio.
- **O fluxo por teclado só foi dirigido num tipo.** O ciclo principal de Sequence nem é "criar caixa
  → conectar", e pode exigir vocabulário próprio. *Mitigação:* o `NFR-01` vale nos cinco tipos, e a
  spec que trouxer cada família tem de o sustentar.
- **Caixas espúrias piscam durante a digitação.** Digitar uma palavra-chave passa por prefixos que a
  análise lê como elemento — 191 a 208 prefixos no documento de referência. *Mitigação:* nenhum
  trabalho real se perde (`NFR-08`); o efeito é visual e está medido, não contornado.
- **Layout de cluster é dívida datada.** Enquanto não houver, o arranjo dentro de agrupamentos
  diverge do que o código produz. *Mitigação:* a divergência é declarada à pessoa em vez de
  escondida, e endereçá-la é trabalho da feature que trouxer agrupamentos.
- **A colisão de caixas ao organizar é problema declarado e sem solução.** Preservar a posição feita à
  mão produz caixa em cima de caixa — 9 pares em 100 nós. *Mitigação:* registrado como necessário; o
  algoritmo de desempate cabe na feature de layout.
- **Ser mais permissivo que o mermaid é divergência conhecida.** A análise aceita documentos que o
  mermaid recusa. *Mitigação:* divergência não anotada vira surpresa na hora de copiar, então cada
  construção nova precisa declarar de que lado cai.
- **A cobertura de cada tipo é incompleta.** O que a análise não lê acusa erro em vez de sumir calado
  — mas acusar erro no documento da pessoa é ruim igual. *Mitigação:* a lista do que ficou de fora
  está nos ADRs, e fecha por incremento.
- **A sessão longa medida em tempo de relógio segue sem evidência.** 600 atos em segundos não são
  oito horas; o que degrada por tempo não foi visto. *Mitigação:* o risco está estreitado — o que
  sobrou tem nome próprio — e o `NFR-09` cobre a degradação por volume de atos.

## 11. Questões abertas

- `[NEEDS CLARIFICATION]` **Cota do armazém do navegador estourada.** O pior caso medido está longe
  do teto prático, mas ninguém provocou a falha por cota nem decidiu o que o produto faz quando ela
  acontece: avisa e para de gravar, descarta o mais antigo, ou degrada para um rascunho menor. Não
  bloqueante (ADR-010).
- `[NEEDS CLARIFICATION]` **Duas abas do produto na mesma chave de rascunho.** Não há colaboração no
  escopo, mas há a pessoa abrindo duas abas, e a última a gravar vence. O que ela vê, e se o produto
  deve avisar, não está decidido. Não bloqueante (ADR-010).

## 12. Rastreabilidade

> Tabela derivada — regenerada por `/zion-prd-trace`. Não edite Status/Feature/Spec à mão.

| RF | Descrição | Épico | Feature / Spec | Release | Status |
|----|-----------|-------|----------------|---------|--------|
| RF-01 | criar nós, conexões e agrupamentos diretamente na área do diagrama | E1 | `specs/002-elementos-grafo-dirigido` | R1–R3 | ● implementada |
| RF-02 | editar o rótulo de um nó e o texto contido numa conexão, inclusive colando texto vindo de fora, que entra como texto puro sem a formatação da origem | E1 | `specs/002-elementos-grafo-dirigido` | R1–R3 | ● implementada |
| RF-03 | escolher, entre os shapes que o tipo de diagrama corrente expressa, o shape de um nó | E1 |  | R4 | ☐ pendente |
| RF-04 | trocar o tipo, o shape ou o estilo de um elemento já criado, ou de uma seleção inteira de uma vez, sem recriá-lo | E1 |  | R4 | ☐ pendente |
| RF-05 | repetir a última alteração em outro elemento, sem refazer o caminho até o controle | E1 |  | R4 | ☐ pendente |
| RF-06 | selecionar — individual e múltipla —, mover, duplicar e excluir nós, conexões e agrupamentos | E1 | `specs/002-elementos-grafo-dirigido` | R1–R3 | ● implementada |
| RF-07 | reconectar uma conexão para outro nó de origem ou de destino | E1 |  | R4 | ☐ pendente |
| RF-08 | copiar e colar elementos preservando os seus estilos | E1 |  | R4 | ☐ pendente |
| RF-09 | desfazer e refazer as ações da sessão | E1 |  | R1 | ☐ pendente |
| RF-10 | executar o ciclo principal — criar caixa, rotular, conectar, rotular a conexão — de ponta a ponta sem alternar para o mouse | E2 |  | R1, R3 | ☐ pendente |
| RF-11 | ver o elemento recém-criado pelo teclado trazido para dentro da área visível, para que o rótulo nunca seja digitado às cegas | E2 |  | R1, R3 | ☐ pendente |
| RF-12 | customizar o tipo de seta, o tipo de linha e a cor de uma conexão | E3 |  | R4 | ☐ pendente |
| RF-13 | alterar a cor de fundo, o estilo e a cor de borda e o estilo de texto de um nó, dentro do que o tipo de diagrama corrente expressa em código | E3 |  | R4 | ☐ pendente |
| RF-14 | organizar o diagrama inteiro por um gesto explícito | E4 |  | R4 | ☐ pendente |
| RF-15 | reorganizar à mão a posição de qualquer elemento e ver essa posição preservada quando o layout é acionado | E4 |  | R4 | ☐ pendente |
| RF-16 | alterar a configuração de layout — hierárquico ou adaptativo — e a orientação do diagrama | E4 |  | R4 | ☐ pendente |
| RF-17 | ver declarada a divergência de arranjo dentro de agrupamentos, onde o arranjo visível e o do código não coincidem | E4 |  | R4 | ☐ pendente |
| RF-18 | escolher e trocar o tipo de diagrama entre os cinco | E5 |  | R1–R3 | ☐ pendente |
| RF-19 | escrever mermaid no editor de código e ver a prévia acompanhar conforme digita, sem perder o que já foi construído | E5 | `specs/001-cano-modelo-codigo` | R0 | ● implementada |
| RF-20 | colar um código mermaid já pronto e obter o diagrama correspondente | E5 |  | R1 | ☐ pendente |
| RF-21 | ver o erro de sintaxe sinalizado enquanto edita o código, distinguindo o que derruba um trecho do que apenas avisa | E5 |  | R1 | ☐ pendente |
| RF-22 | ver marcado o rótulo cujo texto o tipo de diagrama corrente não expressa fielmente em código | E5 |  | R1 | ☐ pendente |
| RF-23 | copiar o código mermaid gerado com um gesto — é o produto final | E5 | `specs/001-cano-modelo-codigo` | R0 | ● implementada |
| RF-24 | redimensionar o editor de código e a área do diagrama | E6 | `specs/003-area-de-trabalho` | R1 | ● implementada |
| RF-25 | navegar na área do diagrama com zoom e movimentação por cursor hand | E6 | `specs/003-area-de-trabalho` | R1 | ● implementada |
| RF-26 | ajustar o diagrama à tela e resetar o zoom | E6 | `specs/003-area-de-trabalho` | R1 | ● implementada |
| RF-27 | recuperar o rascunho em curso — estrutura, estilo e o arranjo feito à mão — ao reabrir a aba | E6 |  | R1 | ☐ pendente |
| RF-28 | ser avisada quando o rascunho não pôde ser recuperado, começando uma sessão nova | E6 |  | R1 | ☐ pendente |
| RF-29 | ser avisada ao ultrapassar o envelope de densidade suportado, em vez de o produto seguir como se nada fosse | E6 |  | R1 | ☐ pendente |

Legenda de status: ☐ pendente · ◐ em spec · ● implementada.

## 13. Histórico de mudanças
> Vazia no dia 1. Preenchida por `/zion-prd-evolve` a partir da primeira mudança pós-release — uma linha
> por mudança. Regras do formato em `quality-rules.md` `#dia-2`; edição manual continua possível.

| Data | Cenário | Mudança | Motivo | Artefatos afetados |
|------|---------|---------|--------|--------------------|
