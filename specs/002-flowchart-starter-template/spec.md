# Feature Specification: Fatia S1 — Template Starter de Flowchart

**Feature Branch**: `002-flowchart-starter-template`
**Created**: 2026-07-14
**Status**: Draft
**Input**: User description: "Fatia S1 — template starter de Flowchart. Hoje a ferramenta abre em tela em branco e obriga o usuário a inventar o começo do zero; esta fatia troca isso por um ponto de partida. Ao abrir, o usuário encontra um diagrama Flowchart starter já presente e vivo — visível no canvas e no código, sincronizado dos dois lados desde o primeiro instante — e consegue, sem nenhum passo preparatório, editá-lo e copiar o código resultante. O starter é um andaime descartável, não um documento."

## Clarifications

### Session 2026-07-14

- Q: Como a validade do starter é verificada — em tempo de teste, em tempo de execução, ou ambos? → A: Apenas em tempo de teste: um teste automatizado afirma que o starter é válido e sobrevive ao ciclo sem perda; nenhuma verificação em tempo de execução é embarcada e nenhum caminho de fallback existe.
- Q: Qual o teto de tempo entre carregar a interface e o starter estar visível no primeiro contato? → A: No máximo 1 s (p95), do carregamento da interface até o starter desenhado no canvas e escrito no código, medido no hardware de referência e no teto de tamanho de diagrama declarados no plano de S0.
- Q: Qual a superfície da confirmação explícita exigida pela ação de limpar (FR-007)? → A: Um diálogo modal da própria aplicação: o foco vai para o diálogo ao abrir, Escape cancela, e o foco retorna ao controle de origem ao fechar — honrando o piso de acessibilidade de S0 (FR-014 de S0).
- Q: Em que viewport a visibilidade integral do starter na abertura (FR-013/SC-009) é afirmada? → A: O starter é enquadrado para caber na área do canvas no primeiro contato (fit-to-view na semeadura), de modo que nenhum zoom ou pan do usuário seja necessário em qualquer viewport desktop suportado; SC-009 é aferido num viewport mínimo declarado de 1280×800. O enquadramento é estado de viewport efêmero e não muta o modelo nem o texto (S0, FR-013).
- Q: O starter é semeado como modelo de diagrama ou como texto Mermaid a ser importado? → A: Como modelo: o starter é definido como um modelo de diagrama e o texto do painel é produzido pelo gerador de S0 (FR-009 de S0), tornando a forma canônica (FR-003) verdadeira por construção em vez de por coincidência.
- Q: Como resolver o conflito entre o teto de 10 linhas (FR-013) e a forma de emissão do gerador de S0, que não está fixada? → A: **[Superada pela pergunta seguinte — a premissa estava errada.]** A resposta original fixava a emissão como *inline* (6 linhas) alegando não redefinir S0; a verificação contra o código mostrou que o gerador de S0 **já implementa** a forma linha-própria, de modo que o inline seria uma reescrita de comportamento entregue.
- Q: A forma de emissão do gerador não está fixada no contrato de S0, mas o gerador **já implementado** emite cada nó em linha própria (`src/core/generator/index.ts`) — o starter sai com 11 linhas, acima do teto de 10 de FR-013. Fixar inline (reescrevendo S0) ou acomodar o teto? → A: Acomodar o teto. Fixar a emissão como **linha própria** — o valor que o gerador já implementa —, fechando a lacuna do contrato de S0 sem alterar uma linha de código ou de teste já entregue, e elevar o teto de FR-013 de 10 para **11 linhas**. O teto é invenção de S1 a serviço de um objetivo brando ("ler de relance"), que 11 linhas cumprem tão bem quanto 10; reescrever o gerador entregue — mudando a saída de **todo** diagrama do usuário, não só a do starter — para ganhar cinco linhas contra um alvo cosmético contraria a promessa de FR-014 de não mexer em S0. *(O teto de 11 foi depois elevado a 14 — ver a última pergunta desta sessão; o valor vigente de FR-013 é **14 linhas**.)*
- Q: Como SC-008 é aferida nesta fatia, se o buffer de recuperação (RN-06) não existe aqui? → A: A semeadura é modelada como uma **função pura de decisão** que recebe o conteúdo restaurável como entrada — sempre ausente nesta fatia — e decide semear ou não. SC-008 é aferida por teste unitário passando um rascunho simulado, exercitando a regra de precedência sem construir nada do buffer.
- Q: Como aferir SC-012, se o teto de 60/90 do plano de S0 nunca se aplica a um starter de tamanho fixo (5 nós)? → A: Remover a referência ao teto — ele governa conteúdo arbitrário do usuário, não conteúdo fixo nosso — e aferir o p95 ≤ 1 s **no tamanho real do starter**, com o hardware de referência fixado como o **runner de CI**, tornando o portão automatizado e reprodutível no mesmo espírito de `tests/perf/` de S0.
- Q: A semeadura do starter (sem ação do usuário) e a conclusão da limpeza devem ser anunciadas à tecnologia assistiva? → A: Ambos. S1 introduz dois eventos de mudança de conteúdo que o piso de S0 (FR-014 de S0) não previa — o starter aparecendo sozinho e uma ação destrutiva e irreversível terminando. Ambos MUST ser anunciados, sem que isso implique alegação de conformidade WCAG completa.
- Q: Entre o carregamento da interface e o starter estar semeado (até 1 s por FR-001), o que a interface exibe? → A: O starter faz parte do **primeiro paint** — o estado vazio de S0 nunca é exibido numa sessão que semeia. Nada da semeadura é assíncrono (conteúdo fixo, gerador puro e síncrono), então não há janela a preencher; o 1 s de SC-012 é teto de regressão, não licença para exibir o vazio antes.

- Q: FR-007 exige confirmação quando "o conteúdo atual" difere do starter, mas S0 mantém dois estados que podem ser chamados assim (o `model` canônico e o overlay `editorText`, que divergem legitimamente quando o texto é não interpretável — S0, FR-012). Qual deles o predicado lê? → A: O **`editorText`**: confirma quando o painel de texto está não vazio e difere, caractere a caractere, da forma canônica do starter (FR-003). É a única leitura sem caso de perda silenciosa — comparar o `model` deixaria passar sem confirmação tanto o texto digitado que não parseia (o modelo continua sendo o starter) quanto conteúdo válido porém não canônico, como comentários `%%` e ordem de declaração, que S0 (FR-008) não carrega no modelo mas que é trabalho real visível no painel.

- Q: SC-003 afirma que a primeira edição pelo canvas "altera somente as linhas daquela edição", mas S0 (FR-003) faz um rename regerar o ID do nó e reescrever **toda** aresta que o referencia — renomear `Revisar` toca 4 das 11 linhas do starter. Como ler SC-003? → A: SC-003 significa **ausência de reescrita gratuita**: as linhas alheias à edição MUST manter texto e ordem exatos. As linhas que a edição legitimamente alcança — inclusive as arestas reescritas pela cascata de ID de um rename (S0, FR-003) — estão em escopo e não violam o critério. A cascata é obrigação de S0 e não pode ser violação de um critério de S1; o alvo real de SC-003 é a reescrita/reordenação em massa, que a forma canônica (FR-003) exclui. Explicitar a cascata evita que o teste afirme um diff de 1 linha e falhe sobre comportamento correto.

- Q: Com o teto elevado para 11 linhas, FR-013 passou a caber exatamente no starter (5 nós / 11 linhas): o teto de linhas ficou sem folga e os dois tetos viraram mutuamente insatisfazíveis — um starter de 6 nós precisaria de ~6 arestas e sairia com ~13 linhas. Como resolver? → A: Dar folga ao teto de linhas compatível com o teto de nós: **6 nós e 14 linhas**. Um starter de 6 nós e 6 arestas ocupa 13 linhas e cabe; o starter atual (5 nós / 11 linhas) fica confortavelmente dentro dos dois. "Ler de relance" não é um juízo com precisão de duas linhas, então a folga não custa nada real, e os tetos voltam a **limitar crescimento** em vez de fixar por acidente o tamanho exato do starter de hoje.

- Q: FR-002 declara `Aprovado?` como nó de **decisão** e o modelo de S0 carrega `shape`, mas o renderizador de canvas entregue em S0 (`src/components/FlowNode.tsx`) desenha **todo** nó como retângulo — `shape` nunca é passado de `CanvasPanel` a `FlowNode`. O starter sairia com um losango no código (`aprovado{Aprovado?}`) e um retângulo no canvas. Renderizar a forma, aceitar a divergência ou remover a decisão do starter? → A: **Aceitar a divergência e torná-la explícita**: nesta release o **formato de nó é um construto do painel de código**, não do canvas. O canvas desenha todos os nós como retângulos — comportamento de S0, inalterado (FR-014) —, e a paridade canvas ↔ código afirmada por esta fatia cobre **nós, arestas e rótulos**, não formato. É a leitura que a fatia já sustentava: as premissas de S0 desta spec já admitem que decisão e rótulos de aresta são "preservados no ciclo mas não editáveis pelo canvas", e FR-002 justifica a decisão como construto que ensina o usuário a **escrever o formato** — o que acontece no painel de código, onde o losango é integralmente visível. Renderizar a forma seria acrescentar aos componentes de S0 uma capacidade que nenhum requisito de S0 pediu, numa fatia cujo valor é remover o passo zero; remover a decisão do starter sacrificaria a "ramificação por decisão" que FR-002 existe para ensinar e deixaria `Sim`/`Não` arbitrários. A renderização de formato no canvas pertence a uma fatia posterior.

- Q: FR-001a exige o starter no **primeiro paint** e FR-017(a) exige que a semeadura seja **anunciada**, mas o canal de anúncio entregue em S0 (`StatusRegion`, `role="status" aria-live="polite"`, alimentado por `announcement` no store) **não anuncia o conteúdo com que nasce** — leitores de tela falam apenas *mudanças* observadas após a região ser registrada. Escrever o anúncio no estado inicial do store deixaria SC-013 verde sobre um recurso mudo. Como resolver? → A: **Anúncio pós-mount**. O starter continua sendo primeiro paint (FR-001a inalterada — ela governa o estado **visual**, e um anúncio um tick depois não exibe o estado vazio a ninguém), mas o anúncio da semeadura MUST ser emitido após a montagem, de modo que a live region **transicione** de vazia para a mensagem. SC-013 MUST aferir essa transição, não a presença da string: um teste que só afirma o texto final passa igualmente sobre a implementação muda, que é precisamente a falha que esta decisão existe para excluir. Ver FR-017a.

- Q: SC-012 afirma o p95 ≤ 1 s do **carregamento da interface** até o starter **desenhado**, por "teste de performance automatizado" — mas o harness de performance entregue em S0 (`tests/perf/preview-latency.test.ts`, vitest) **exclui o render de propósito** (*"React Flow's own DOM render … not re-timed here"*) e mede `importFlowchart` + `layout`, um caminho que a semeadura **nem percorre** (o starter é semeado como modelo, sem parse — FR-003). Qual instrumento afere SC-012? → A: **Playwright, no runner de CI**, do `page.goto('/')` até os nós do starter visíveis no canvas **e** o texto presente no painel de código — o único instrumento cujo relógio começa e termina onde SC-012 diz. O teto de 1 s só é portão de regressão se incluir bundle, boot e render; medido sem eles, sobram `generate` + `layout` de 5 nós em microssegundos, verde garantido e afirmação não sustentada. A aferição vive em `tests/e2e/`, que é onde S0 já delegou explicitamente a medição de render — não em `tests/perf/`, cuja fronteira declarada é o sub-caminho puro.

- Q: FR-006 leva a sessão ao "estado vazio já definido em S0" — isso inclui o estado **só-de-UI** (`connectMode`, `connectSourceId`, rename em curso)? Não é acadêmico: `mutations.connect()` não valida os ids que recebe, então um `connectSourceId` pendurado sobrevive à limpeza e, na conexão seguinte, o gerador emite `revisar --> minha-ideia` sem definição de `revisar` — e o Mermaid **cria um nó implícito** com esse nome, ressuscitando no canvas um nó do starter que o usuário apagou (violando FR-008 e SC-006). → A: **Limpar restaura o estado vazio de S0 integralmente**, estado só-de-UI incluído: `connectMode` → `false`, `connectSourceId` → `null`, rename em curso abortado. É a leitura literal de FR-006 — "o estado vazio **já definido em S0**" é o estado que a aplicação tem ao abrir, no qual esses campos são `false`/`null` — e fecha o caminho na origem, em vez de remendá-lo com validação no `connect` (o que seria alterar S0, contra FR-014). A regra geral: nenhum ponteiro para conteúdo pode sobreviver à destruição do conteúdo que ele referencia. Ver FR-006a.

- Q: Além do ponteiro pendurado (FR-006a), há **trabalho em voo** que sobrevive à limpeza: o debounce de 80 ms de `setEditorText` captura o texto por closure e `applyParsedText` escreve `model`/`lastValidModel` **sem escrever `editorText`**. Limpar com um parse armado (texto = forma canônica → sem confirmação) devolve o starter ao canvas em t=80 ms com o código vazio ao lado — starter ressuscitado (FR-008, SC-006) e os dois lados dessincronizados. Cancelar o parse pendente, aceitar a corrida, ou blindar o `applyParsedText`? → A: **Limpar cancela o parse pendente.** É o princípio de FR-006a — nenhum ponteiro para conteúdo sobrevive à destruição do conteúdo — estendido de estado parado para trabalho agendado, e a correção permanece dentro de S1. Aceitar a corrida deixaria o invariante de FR-008 apoiado na lentidão do usuário e o e2e sujeito a flakiness (um `fill()` + `click()` do Playwright vence os 80 ms sem esforço). Blindar `applyParsedText` com um guard de staleness corrigiria a classe toda, mas altera o store de S0 (atrito com FR-014) e contraria o precedente de FR-006a, que mandou corrigir na limpeza e não nas mutações. Ver FR-006b.

- Q: FR-006a manda a limpeza **abortar o rename em curso**, mas o rename não vive no store: `CanvasPanel` o mantém em `useState` local (`editingNodeId`, `editDraft`), fora do alcance de um `clear()` do store. E o dano que FR-006a invoca não se materializa aqui — o handler só chama `renameNode` se o nó ainda existir no modelo, de modo que um rename pós-limpeza não ressuscita nada. O resíduo real é outro: um `editingNodeId` obsoleto mantém o handler de teclado em modo de edição e engole as teclas destinadas a nós **novos**. Elevar o rename ao store, derivar o aborto do modelo, ou relaxar FR-006a? → A: **Derivar o aborto do modelo**: `CanvasPanel` MUST sair do modo de edição quando `editingNodeId` deixar de existir em `model.nodes`. Torna o invariante de FR-006a — nenhum ponteiro sobrevive ao conteúdo que referencia — literalmente verdadeiro **onde o ponteiro de fato vive**, sem mover estado de S0 para o store nem reescrever `CanvasPanel` (FR-014), e fecha de brinde o mesmo caminho latente no `removeNode` já entregue. Elevar ao store pagaria uma reescrita de S0 para alcançar um estado que a derivação já invalida; relaxar FR-006a deixaria o teclado do canvas quebrado até o usuário adivinhar `Escape`. Ver FR-006c.

- Q: SC-012 foi movida para o Playwright justamente para que o relógio incluísse "bundle, boot e render" — mas o harness e2e entregue serve o app pelo **dev server do Vite** (`playwright.config.ts`, `webServer.command: 'npm run dev'`), que entrega ESM não empacotado e transforma sob demanda. Medido ali, o teto de 1 s governa o dev server, não o app entregue. Além disso SC-012 não fixa número de amostras, enquanto o precedente de S0 (`tests/perf/preview-latency.test.ts`) usa 30 execuções após 5 aquecimentos. → A: **Medir contra o build de produção**. SC-012 MUST ser aferida num alvo servido pelo build de produção (`vite preview`), em **um único** projeto de browser (chromium), com **30 amostras** de `page.goto('/')` após ao menos um carregamento de aquecimento, tomando o p95 — o mesmo tamanho de amostra de S0, e o menor N em que o helper de percentil de S0 devolve um p95 real em vez do máximo literal. Isso exige uma configuração e2e separada para o portão; os demais e2e permanecem no dev server, inalterados (FR-014). Medir no dev server tornaria o teto uma afirmação sobre um artefato que nenhum usuário recebe e uma fonte previsível de flakiness; uma amostra única não sobrevive à variância de um runner compartilhado. Ver SC-012 e FR-018.

- Q: FR-018 promete que "os testes de S0 que dela dependem MUST permanecer inalterados", mas todo
  e2e de S0 parte de `page.goto('/')` sobre o **estado vazio de abertura** — exatamente o estado que
  esta fatia existe para abolir. `tests/e2e/ephemeral.spec.ts` afirma `toHaveValue('')` **após um
  reload**, enquanto os Edge Cases desta spec afirmam que o starter reaparece no reload: as duas
  coisas não podem ser verdadeiras. Como resolver? → A: **A promessa de FR-014/FR-018 governa o
  comportamento de S0, não os fixtures de teste de S0.** Esta fatia MUST NOT alterar nenhum arquivo
  de **código-fonte** de S0, e MAY emendar as asserções e2e de S0 cuja premissa é o estado vazio de
  abertura — hoje exatamente duas (ver FR-014a). Um teste que afirma o estado vazio na abertura está
  afirmando precisamente o que esta fatia foi escrita para remover; emendá-lo **registra** a mudança
  pretendida, em vez de redefinir S0. As alternativas dobram o comportamento do produto para
  preservar um fixture ao pé da letra: fazer cada e2e de S0 limpar o starter como preâmbulo (ou
  desligar a semeadura por flag de teste) deixaria o caminho de abertura — o único que esta fatia
  entrega — sem cobertura e2e justamente onde ela importa; e suprimir a semeadura no reload por
  marcador de sessão violaria FR-010 e o próprio `ephemeral.spec.ts`, que afirma
  `sessionStorageLength === 0`. Ver FR-014a.

## User Scenarios & Testing *(mandatory)*

Esta fatia troca a **tela em branco** por um **ponto de partida**. Ela não acrescenta nenhuma
capacidade nova de edição: tudo o que o usuário pode fazer com o starter, ele já podia fazer com
código colado em S0. O valor está em **remover o passo zero** — inventar o começo — e em ensinar
o formato pelo exemplo. O starter é um **andaime descartável**: existe para ser editado ou
apagado, nunca para ser preservado.

### User Story 1 - Encontrar um ponto de partida vivo ao abrir (Priority: P1)

Ao abrir a ferramenta, o usuário já encontra um Flowchart starter presente — desenhado no canvas
e escrito no painel de código, os dois lados sincronizados desde o primeiro instante. Sem clicar
em nada, sem escolher nada e sem esperar, ele pode renomear um nó, adicionar outro, conectar dois
nós, remover o que não quiser, e copiar o código resultante.

**Why this priority**: É a razão de existir da fatia e a única parte que entrega valor sozinha.
Sem ela, não há starter. Com ela isolada, a ferramenta já deixa de abrir em branco e já ensina o
formato pelo exemplo — mesmo que o usuário nunca use o "limpar" nem cole código próprio.

**Independent Test**: Abrir a ferramenta com a sessão limpa e confirmar, sem executar nenhuma
ação, que o canvas mostra o diagrama starter e o painel de código mostra o Mermaid correspondente;
em seguida, executar cada uma das ações centrais de edição de S0 diretamente sobre o starter e
confirmar que os dois lados acompanham; por fim, copiar o código.

**Acceptance Scenarios**:

1. **Given** a ferramenta aberta numa sessão sem nenhum conteúdo a restaurar, **When** a interface
   termina de carregar, **Then** o canvas exibe o diagrama starter e o painel de código exibe o
   código Mermaid correspondente — sem que o usuário execute qualquer ação e sem que o estado vazio
   de S0 tenha sido exibido em nenhum instante anterior.
2. **Given** o starter recém-apresentado, **When** o usuário compara o canvas e o código, **Then**
   os dois representam o mesmo diagrama (mesmos nós, arestas e rótulos), como em qualquer outro
   estado sincronizado da ferramenta. A paridade cobre **nós, arestas e rótulos**, e **não** o
   formato de nó: nesta release o canvas desenha todo nó como retângulo (comportamento de S0), de
   modo que a decisão `Aprovado?` aparece como losango apenas no painel de código (FR-002a).
3. **Given** o starter no canvas, **When** o usuário renomeia um nó, adiciona um nó, conecta dois
   nós ou remove um nó/aresta pelo canvas, **Then** o código Mermaid é reescrito refletindo a
   edição — sem nenhum passo preparatório e sem que o starter receba tratamento diferente de
   conteúdo colado pelo usuário.
4. **Given** o starter no canvas, **When** o usuário edita o texto do starter no painel de código,
   **Then** o canvas acompanha a edição, exatamente como acompanharia qualquer código colado.
5. **Given** o starter sem nenhuma edição, **When** o usuário aciona a cópia e cola o resultado num
   destino externo, **Then** o texto colado é um Flowchart Mermaid válido que reproduz o starter.
6. **Given** um usuário de leitor de tela abrindo a ferramenta numa sessão sem conteúdo a restaurar,
   **When** o starter é semeado, **Then** a apresentação do diagrama inicial é anunciada à
   tecnologia assistiva, de modo que ele saiba que há conteúdo sem precisar varrer o canvas — o
   anúncio chega como **mudança** da região de status depois da montagem (FR-017a), e não como texto
   com que a região nasce, que o leitor de tela não falaria.

---

### User Story 2 - Recomeçar do zero apagando o andaime (Priority: P2)

O usuário decide que não quer o exemplo: ele limpa o starter e fica com a tela vazia, pronta para
construir do seu jeito. O que era um andaime some sem deixar rastro — nem no diagrama, nem no
texto.

**Why this priority**: É o que faz do starter um andaime e não um documento imposto. Sem essa
saída, o ponto de partida vira um obstáculo para quem já sabe o que quer fazer. Depende de haver
um starter (US1), mas é testável isoladamente a partir dele.

**Independent Test**: A partir do starter recém-aberto, acionar a ação de limpar e confirmar que
canvas e código ficam vazios, sem resíduo do starter e sem erro; confirmar que o estado resultante
é o mesmo estado vazio que a ferramenta já exibia em S0.

**Acceptance Scenarios**:

1. **Given** o starter intocado no canvas, **When** o usuário aciona a ação de limpar, **Then**
   canvas e código ficam vazios imediatamente — sem confirmação, sem erro, sem nenhum nó, aresta
   ou linha remanescente do starter.
2. **Given** o usuário já editou o conteúdo (o **texto do painel** é não vazio e difere da forma
   canônica do starter — FR-007), **When** ele aciona a ação de limpar, **Then** o sistema abre um
   diálogo modal de confirmação e o foco vai para ele, sem descartar nada ainda — porque a operação
   é irreversível nesta release.
3. **Given** o diálogo de confirmação aberto, **When** o usuário o recusa (pelo botão de cancelar
   ou por `Escape`), **Then** o diálogo fecha, o foco retorna ao controle de limpar e o conteúdo
   permanece exatamente como estava.
4. **Given** o usuário limpou o conteúdo, **When** ele continua na mesma sessão, **Then** o starter
   **não** reaparece — o ponto de partida é semeado uma única vez por sessão.
5. **Given** o conteúdo foi limpo, **When** o usuário começa a digitar ou colar do zero, **Then** a
   ferramenta se comporta como o editor vazio de S0, sem qualquer vestígio do starter.
6. **Given** um usuário de leitor de tela, **When** a limpeza é concluída, **Then** o resultado é
   anunciado à tecnologia assistiva — a ação é irreversível e não pode terminar em silêncio.
7. **Given** o usuário digitou sobre o starter um texto que não é interpretável (o canvas ainda
   mostra o starter como última prévia válida — S0, FR-012), **When** ele aciona a ação de limpar,
   **Then** o sistema **exige confirmação**: o texto digitado é trabalho a perder, ainda que o
   modelo canônico continue sendo o starter intocado.
8. **Given** o usuário entrou no modo conectar e escolheu um nó do starter como origem, **When** ele
   limpa e em seguida adiciona dois nós novos e os conecta, **Then** a nova aresta liga apenas os
   nós novos — nenhum nó do starter é reintroduzido no canvas, porque a limpeza descartou a origem
   pendente junto com o conteúdo (FR-006a).
9. **Given** o usuário acabou de digitar ou colar texto e o parse desse texto ainda não foi aplicado,
   **When** ele aciona a limpeza, **Then** canvas e código ficam vazios e **permanecem** vazios — o
   parse pendente é cancelado e nunca alcança o modelo (FR-006b).
10. **Given** o usuário iniciou o rename de um nó do starter pelo canvas e não o concluiu, **When**
    ele limpa e em seguida adiciona um nó novo e o edita pelo teclado, **Then** o nó novo responde
    normalmente — o canvas saiu do modo de edição quando o nó em rename deixou de existir (FR-006c),
    em vez de seguir capturando as teclas para um rótulo já destruído.

---

### User Story 3 - Substituir o starter colando código próprio (Priority: P3)

O usuário chega com um Flowchart que já existe — de um README, de uma issue — e cola por cima do
starter. O starter simplesmente dá lugar ao código dele, sem sobras.

**Why this priority**: Protege o caminho de quem já tem conteúdo: o starter não pode virar sujeira
misturada ao trabalho real. É o menor dos três elos e se apoia no comportamento de colar que S0 já
provou.

**Independent Test**: Com o starter presente, colar um Flowchart próprio substituindo todo o texto
e confirmar que nenhum nó, aresta ou linha do starter sobrevive no canvas nem no código.

**Acceptance Scenarios**:

1. **Given** o starter presente, **When** o usuário substitui todo o texto do painel de código por
   um Flowchart válido próprio, **Then** o canvas passa a exibir apenas o diagrama colado e o
   código contém apenas o conteúdo colado — zero resíduo do starter.
2. **Given** o código próprio já substituiu o starter, **When** o usuário edita pelo canvas,
   **Then** as edições se aplicam ao diagrama dele, e nenhum elemento do starter é reintroduzido.

---

### Edge Cases

- **Colar código inválido ou incompleto por cima do starter**: vale a regra de S0 (FR-012 de S0) —
  a última prévia válida é mantida e o texto é sinalizado como não interpretável. Enquanto nenhum
  código válido tiver substituído o starter, **o starter é essa última prévia válida**; se o
  usuário editar pelo canvas nesse estado, S0 (FR-004) manda mutar o último modelo válido — o
  starter — e regenerar código válido, substituindo o texto inválido. S1 **não redefine** esse
  comportamento; apenas declara que o starter ocupa o papel de último modelo válido até ser
  substituído.
- **Colar conteúdo que não é Flowchart**: vale a regra de S0 (FR-006 de S0) — o sistema sinaliza
  que apenas Flowchart é suportado; o starter permanece como última prévia válida.
- **Limpar com trabalho do usuário presente**: a operação é irreversível (não há desfazer nesta
  release) e por isso exige confirmação explícita; limpar o starter **intocado** não destrói
  trabalho e não pede confirmação. "Intocado" é decidido sobre o texto do painel, não sobre o
  modelo (FR-007) — de modo que texto não interpretável digitado por cima do starter, ou conteúdo
  que o modelo não carrega (comentários `%%`), também contam como trabalho a perder.
- **Recarregar ou fechar a aba**: a sessão é efêmera; nada é preservado e a próxima abertura é um
  primeiro contato novo — o starter reaparece. Como nada foi preservado, o starter não sobrescreve
  trabalho algum. A interface não sugere, em momento nenhum, que o starter tenha sido salvo. O
  starter reaparecendo **não** afrouxa a efemeridade provada em S0: o que o teste de reload de S0
  afirma é que o trabalho do usuário não sobrevive, e isso segue verdadeiro — o painel volta à forma
  canônica do starter, não ao texto que o usuário digitou (FR-014a).
- **Rascunho restaurável presente (fronteira do RN-06, não implementada nesta fatia)**: qualquer
  conteúdo restaurável **precede** o starter e o **suprime por completo**; o starter nunca é
  mesclado ao rascunho nem escrito por cima dele. O starter é exclusivamente o preenchimento de um
  primeiro contato genuinamente sem nada a restaurar.
- **Limpar com uma conexão pendente ou um rename em curso**: a limpeza aborta os dois e devolve o
  estado só-de-UI ao valor de abertura (FR-006a) — o rename pelo mecanismo derivado de FR-006c, já
  que ele é estado do componente de canvas e não do store. Um rename que sobrevivesse à limpeza não
  ressuscitaria conteúdo (o canvas de S0 só aplica o rename se o nó ainda existir), mas deixaria o
  canvas tratando as teclas como digitação de um rótulo morto, engolindo a interação com os nós que
  o usuário criasse em seguida. Uma origem de conexão que sobrevivesse à limpeza
  referenciaria um nó destruído e faria a conexão seguinte emitir uma aresta sem definição de origem
  — que o Mermaid materializa como nó implícito, reintroduzindo no canvas um nó do starter já
  apagado (FR-008, SC-006).
- **Limpar com um parse de texto ainda pendente**: a limpeza cancela o parse em voo (FR-006b).
  Sem isso, um parse armado antes da limpeza dispararia depois dela e devolveria o conteúdo antigo
  ao modelo — o canvas repovoado ao lado de um código vazio.
- **Starter inválido**: não é um estado admissível — o starter é conteúdo fixo e válido por
  construção. Sua validade é garantida **em tempo de teste**: um teste automatizado afirma que o
  modelo do starter gera um Flowchart válido e sobrevive ao ciclo sem perda (FR-015), de modo que um
  starter inválido quebra a build e nunca alcança um usuário. Nenhuma verificação em tempo de
  execução é embarcada e, portanto, **não existe caminho de fallback** para starter inválido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ao abrir a ferramenta numa sessão sem nenhum conteúdo a restaurar, o sistema MUST
  apresentar um diagrama Flowchart starter **simultaneamente** no canvas e no painel de código, já
  sincronizados, **sem exigir nenhuma ação preparatória** do usuário (nenhum clique, nenhuma
  escolha, nenhum passo de "criar" ou "renderizar"), em no máximo **1 s (p95)** contados do
  carregamento da interface, aferido no tamanho real do starter e no runner de CI (ver SC-012).
- **FR-001a**: Numa sessão que semeia, o starter MUST fazer parte do **primeiro paint** do canvas e
  do painel de código: o **estado vazio de S0 MUST NOT ser exibido em momento algum** antes da
  semeadura, nem acompanhado de qualquer afordância ou mensagem de "vazio". Não há etapa assíncrona
  na semeadura — o starter é conteúdo fixo (FR-002), o gerador de S0 é puro e síncrono (FR-003) e
  não há rede envolvida —, logo não existe janela legítima a preencher com estado intermediário.
  Exibir o vazio, ainda que por instantes, mostraria ao usuário exatamente a tela em branco que esta
  fatia existe para eliminar (SC-002). O teto de 1 s de FR-001/SC-012 é um limite contra regressão
  de inicialização, **não** uma licença para exibir o estado vazio dentro dele.
- **FR-002**: O conteúdo do starter MUST ser exatamente este Flowchart, em português (pt-BR),
  orientação top-down: cinco nós — `Início` (retângulo), `Revisar` (retângulo), `Aprovado?`
  (decisão), `Publicar` (retângulo) e `Fim` (retângulo) — e cinco conexões: `Início` → `Revisar`;
  `Revisar` → `Aprovado?`; `Aprovado?` → `Publicar` com o rótulo `Sim`; `Aprovado?` → `Revisar` com
  o rótulo `Não`; `Publicar` → `Fim`. Este conjunto exercita, em pouquíssimas linhas, os
  construtos que o usuário precisa reconhecer para escrever o formato sozinho: orientação, nó com
  rótulo, conexão, ramificação por decisão, conexão rotulada e retorno. Os identificadores dos nós
  MUST seguir a regra de derivação por slug do rótulo já estabelecida em S0 (FR-003 de S0).
- **FR-002a**: O **formato de nó** é, nesta release, um construto do **painel de código**: o modelo
  de S0 carrega `shape` e o gerador de S0 o emite (`aprovado{Aprovado?}`), mas o canvas entregue em
  S0 desenha todo nó como retângulo. Esta fatia MUST NOT alterar esse comportamento (FR-014): o
  starter MUST ser desenhado com o mesmo renderizador de nó que qualquer outro conteúdo, sem
  tratamento especial (FR-004). Consequência: a decisão `Aprovado?` de FR-002 é visível como losango
  apenas no código, e a paridade canvas ↔ código afirmada por esta fatia cobre **nós, arestas e
  rótulos** — não formato de nó. Os rótulos de aresta (`Sim`/`Não`) e o retorno `Aprovado?` →
  `Revisar`, esses sim, MUST ser visíveis nos dois lados. Nenhum critério desta fatia MUST ser lido
  como exigindo renderização de formato no canvas; essa capacidade pertence a uma fatia posterior.
- **FR-003**: O starter MUST ser definido como um **modelo de diagrama**, não como uma string
  Mermaid pré-escrita, e o texto exibido no painel de código no primeiro contato MUST ser produzido
  a partir desse modelo pelo gerador de S0 (FR-009 de S0). Assim, o texto do primeiro contato é a
  **forma canônica** do starter — idêntico, caractere a caractere, ao texto que o sistema geraria a
  partir do modelo — **por construção**. Consequência observável: a primeira edição feita pelo
  canvas MUST NOT provocar reescrita gratuita — as linhas **alheias** à edição MUST manter texto e
  ordem exatos. As linhas que a edição legitimamente alcança estão em escopo, o que inclui a
  **cascata de ID de um rename**: S0 (FR-003) obriga a regerar o ID a partir do novo rótulo e a
  reescrever todas as arestas que o referenciam, de modo que renomear um nó do starter reescreve a
  linha do nó **e** cada linha de aresta que o cita (renomear `Revisar` toca 4 das 11 linhas). Isso
  cumpre SC-003, não o viola.
- **FR-003a**: O gerador MUST emitir a definição de cada nó em **linha própria**, seguida das
  arestas (forma: `inicio[Início]` numa linha, `inicio --> revisar` noutra). O contrato do gerador
  de S0 (`contracts/generator.contract.md`, G1–G8) fixa determinismo, ordenação e escape mas deixou
  a **forma de emissão** em aberto; o gerador entregue em S0 já resolveu essa lacuna na prática
  emitindo linha própria. Esta fatia apenas **eleva ao contrato o valor já implementado**, de modo
  que a forma de emissão deixe de ser uma escolha de implementação não governada. Nenhuma linha de
  código ou de teste de S0 muda por conta desta fatia (FR-014); o determinismo (S0, FR-009), a
  fidelidade de round-trip (S0, FR-007) e as perdas admissíveis (S0, FR-008) permanecem exatamente
  como especificados. Consequência: o starter de FR-002 é emitido em **11 linhas** (`flowchart TD`
  + 5 linhas de nó + 5 linhas de aresta), dentro do teto de 14 linhas de FR-013.
- **FR-004**: O starter MUST ser imediatamente editável por todas as ações centrais de edição já
  estabelecidas em S0 — adicionar nó, renomear nó, conectar nós, remover nó e remover aresta pelo
  canvas, e edição livre pelo texto. O starter MUST NOT receber qualquer tratamento especial,
  proteção, bloqueio ou marcação que o distinga de conteúdo colado pelo usuário: uma vez
  apresentado, ele é conteúdo comum da sessão.
- **FR-005**: Com o starter não editado, o usuário MUST conseguir copiar o código Mermaid em uma
  única ação, e o texto copiado MUST ser um Flowchart válido que renderiza no GitHub — o mesmo
  alvo de compatibilidade declarado em S0 (FR-005 de S0).
- **FR-006**: O sistema MUST oferecer uma ação de **limpar** que descarta todo o conteúdo atual e
  leva a sessão ao **estado vazio já definido em S0** (canvas vazio e texto vazio, sem erro). A
  ação MUST ser alcançável por teclado e MUST NOT depender do painel de código estar expandido,
  honrando o piso de acessibilidade de S0 (FR-014 de S0).
- **FR-006a**: O "estado vazio de S0" a que FR-006 leva é o estado **integral** de abertura da
  aplicação, **incluindo o estado só-de-UI**: a limpeza MUST desligar o modo conectar
  (`connectMode` → `false`), descartar a origem de conexão pendente (`connectSourceId` → `null`) e
  abortar qualquer rename em curso (pelo mecanismo de FR-006c, já que o rename não vive no store).
  Nenhum ponteiro para conteúdo MUST sobreviver à destruição do
  conteúdo que ele referencia. Isto não é higiene: as mutações de S0 não validam ids (`connect`
  aceita uma origem inexistente e o gerador a emite), e um `connectSourceId` pendurado faria a
  conexão seguinte emitir uma aresta cuja origem não tem definição — que o Mermaid materializa como
  **nó implícito**, ressuscitando no canvas um nó do starter que o usuário acabou de apagar e
  violando FR-008 e SC-006. A correção pertence à limpeza (fatia S1) e MUST NOT ser feita
  acrescentando validação às mutações de S0, o que seria redefinir S0 (FR-014).
- **FR-006b**: A limpeza MUST cancelar todo **trabalho em voo** sobre o conteúdo — em particular, o
  parse pendente do debounce de texto de S0 (Decisão B): nenhuma escrita agendada antes da limpeza
  MUST alcançar o modelo depois dela. É FR-006a estendido de estado parado para trabalho agendado.
  O mecanismo de S0 torna a omissão observável: o timer de `setEditorText` captura o texto por
  closure e `applyParsedText` escreve `model`/`lastValidModel` **sem escrever `editorText`**, de modo
  que um parse armado que dispare após a limpeza devolve o conteúdo antigo ao canvas deixando o
  código vazio — starter ressuscitado (FR-008) e os dois lados dessincronizados, contra a premissa
  da ferramenta. Como no caso de FR-006a, a correção pertence à limpeza e MUST NOT ser feita
  alterando o store de S0 (FR-014).
- **FR-006c**: O aborto do rename exigido por FR-006a MUST ser **derivado do modelo**, e não comandado
  pela limpeza: o canvas MUST sair do modo de edição de rótulo quando o nó em edição deixar de
  existir no modelo. O rename em curso é estado **local do componente de canvas** (não do store), de
  modo que a limpeza não tem como alcançá-lo por comando; derivá-lo do modelo torna o invariante de
  FR-006a verdadeiro onde o ponteiro vive, sem mover estado de S0 para o store nem reescrever o
  componente de canvas (FR-014). O resíduo que isto elimina não é a ressurreição de conteúdo — o
  canvas de S0 só aplica o rename se o nó ainda existir, logo um rename pós-limpeza já não escreve
  nada —, e sim um **ponteiro de edição obsoleto**: enquanto ele persistir, o canvas trata as teclas
  como digitação de um rótulo que não existe mais, engolindo a interação com nós criados depois da
  limpeza. A derivação MUST valer para toda destruição do nó em edição, e não apenas para a limpeza
  (a remoção de nó já entregue em S0 alcança o mesmo estado).
- **FR-007**: A ação de limpar MUST exigir confirmação explícita **quando houver trabalho do
  usuário a perder**, porque não há desfazer nesta release (S0). O predicado MUST ser decidido
  sobre o **texto do painel** (`editorText`, S0 FR-012): exige confirmação quando o texto atual for
  não vazio **e** diferir, caractere a caractere, da forma canônica do starter (FR-003). Quando o
  texto atual for exatamente a forma canônica do starter, ou estiver vazio, a ação MUST ser
  executada imediatamente, sem confirmação. O predicado MUST NOT ser decidido sobre o `model`
  canônico: quando o texto é não interpretável (S0, FR-012) o modelo ainda é o starter, e quando o
  texto é válido mas não canônico (comentários `%%`, ordem de declaração — perdas admissíveis de
  S0, FR-008) o modelo também não registra a diferença; nos dois casos, ler o modelo descartaria
  trabalho visível do usuário sem perguntar.
- **FR-008**: O starter MUST ser semeado **uma única vez por sessão**, no primeiro contato. Depois
  de limpo ou substituído, ele MUST NOT reaparecer durante a mesma sessão, seja por edição, por
  esvaziamento do texto ou por qualquer outra transição de estado.
- **FR-009**: Substituir o texto por um Flowchart válido próprio MUST remover o starter
  integralmente: nenhum nó, aresta, rótulo ou linha originários do starter MUST permanecer no
  diagrama ou no código.
- **FR-010**: O starter MUST NOT introduzir persistência, documento nativo ou qualquer estado
  salvo. A sessão permanece efêmera (RN-05, ADR-003) e a única saída copiável continua sendo o
  texto Mermaid (RN-01). A interface MUST NOT sugerir que o starter foi salvo, restaurado ou que
  pertence ao usuário.
- **FR-011**: Quando houver um rascunho restaurável (fronteira do RN-06, **cuja implementação não
  faz parte desta fatia**), o conteúdo restaurado MUST preceder o starter e MUST suprimi-lo por
  completo. O starter MUST NOT ser mesclado a conteúdo restaurado nem escrito por cima dele em
  nenhuma hipótese: ele preenche exclusivamente o primeiro contato sem nada a restaurar. Esta
  fatia MUST NOT alterar o comportamento do buffer de recuperação.
- **FR-011a**: A decisão de semear MUST ser expressa como uma **função pura** que recebe o conteúdo
  restaurável como entrada explícita — nesta fatia, sempre ausente — e devolve se o starter é
  semeado ou não. A regra de precedência de FR-011 MUST viver nessa função, e não no caminho de
  inicialização da interface, de modo que ela seja exercitável por teste unitário passando um
  rascunho simulado (ver SC-008) sem que nada do buffer de recuperação seja construído aqui. Esta
  fatia MUST NOT introduzir qualquer produtor real de conteúdo restaurável: a entrada existe, o
  buffer que a preencheria não.
- **FR-012**: Esta fatia MUST NOT expor nenhuma superfície de escolha de template (lista, seletor,
  galeria ou equivalente). Flowchart é o único tipo desta release e o starter é único; a escolha
  entre templates pertence a fatias posteriores, quando houver mais de um tipo.
- **FR-013**: O starter MUST ser pequeno o bastante para ser lido de relance e descartado sem
  esforço: no máximo **6 nós** e **14 linhas** de código (o starter de FR-002 ocupa 5 nós e 11
  linhas sob a emissão linha-própria de FR-003a; a folga do teto de linhas é dimensionada para que
  o teto de nós seja de fato alcançável — 6 nós e 6 arestas ocupam 13 linhas), e removível em uma
  única ação. Na
  semeadura, o sistema MUST enquadrar o starter para caber integralmente na área visível do canvas,
  de modo que o usuário MUST NOT precisar de zoom ou pan para ver o diagrama inteiro em nenhum
  viewport desktop suportado. Esse enquadramento é estado de viewport **efêmero**: ele MUST NOT
  mutar o modelo nem alterar o texto gerado (S0, FR-013).
- **FR-014**: Esta fatia MUST NOT redefinir o laço bidirecional texto ↔ canvas provado em S0. Todo
  comportamento de sincronização, tolerância a texto inválido, fidelidade de round-trip,
  determinismo e cópia permanece exatamente como especificado em S0.
- **FR-014a**: A promessa de FR-014 (e a cláusula equivalente de FR-018) governa o **comportamento**
  de S0, não os **fixtures de teste** de S0. Esta fatia MUST NOT alterar nenhum arquivo de
  **código-fonte** de S0. Ela MAY, porém, emendar as asserções e2e de S0 cuja premissa é o **estado
  vazio de abertura** — a premissa que esta fatia existe para abolir (FR-001a) e que nenhum requisito
  de S0 jamais afirmou como comportamento desejado. São hoje exatamente duas, e a lista MUST ser
  tratada como exaustiva:
  - `tests/e2e/ephemeral.spec.ts` (reload): a asserção `toHaveValue('')` MUST passar a afirmar o que
    o teste de fato existe para provar — que **o trabalho do usuário não é preservado** —, isto é,
    que o texto digitado antes do reload não sobrevive a ele e que o painel volta à forma canônica do
    starter (FR-003), um primeiro contato novo. O starter não viola a efemeridade: ele não preserva
    nada nem sobrescreve nada (FR-010, Edge Cases).
  - `tests/e2e/us1-preview.spec.ts` (o caso "texto inválido como primeira entrada"): com o starter
    semeado, o `lastValidModel` é o starter, de modo que a última prévia válida deixa de ser o estado
    vazio (Edge Cases). O teste MUST ser reapontado para o starter como última prévia válida e
    renomeado de acordo. Sem isso ele permanece **verde afirmando algo falso** — hoje só passa porque
    afere apenas o indicador de status, não o estado a que o nome se refere.

  Os demais e2e de S0 MUST permanecer inalterados: eles substituem o texto integralmente
  (`fill()`) ou aferem por expressão regular, e por isso continuam válidos com o starter presente.
  Nenhuma emenda autorizada aqui afrouxa uma garantia de S0 — cada uma reafirma a mesma garantia
  sobre o estado de abertura que esta fatia introduz.
- **FR-015**: A validade do starter MUST ser garantida por um teste automatizado que afirma que o
  modelo de FR-002 gera um Flowchart válido e sobrevive ao ciclo modelo → código → modelo sem
  perda (S0, FR-007). Esta fatia MUST NOT embarcar verificação de validade do starter em tempo de
  execução nem caminho de fallback para starter inválido: um starter inválido MUST quebrar a build,
  não degradar a sessão do usuário.
- **FR-016**: A confirmação exigida pela FR-007 MUST ser um **diálogo modal da própria aplicação**
  — não um diálogo nativo do navegador —, cumprindo o piso de acessibilidade de S0 (FR-014 de S0):
  ao abrir, o foco MUST ir para o diálogo; `Escape` MUST cancelar; ao fechar (confirmando ou
  cancelando), o foco MUST retornar ao controle que o acionou. O diálogo MUST ter nome e papel
  acessíveis e MUST ser inteiramente operável por teclado.
- **FR-017**: Os dois eventos de mudança de conteúdo que esta fatia introduz MUST ser anunciados à
  tecnologia assistiva, estendendo o piso de acessibilidade de S0 (FR-014 de S0) — que lista apenas
  o resultado da cópia e a indicação de "texto não interpretável" — aos casos que S0 não previa:
  (a) a **semeadura do starter** no primeiro contato, porque ela apresenta conteúdo sem nenhuma ação
  do usuário e a premissa da fatia ("ao abrir, você já encontra um diagrama") só se cumpre para quem
  usa leitor de tela se houver aviso; e (b) a **conclusão da limpeza**, porque a operação é
  destrutiva e irreversível (FR-007) e terminar em silêncio deixaria o usuário sem confirmação. Como
  em S0, esta fatia MUST NOT alegar conformidade WCAG completa: contraste e auditoria formal seguem
  fora de escopo.
- **FR-017a**: O anúncio da semeadura (FR-017, item **a**) MUST ser emitido **após a
  montagem** da interface, e não no estado inicial do canal de anúncio, de modo que a live region
  **transicione** de vazia para a mensagem. O canal entregue em S0 (`StatusRegion`, `role="status"
  aria-live="polite"`) só é falado quando o leitor de tela observa uma **mudança** depois de a região
  ser registrada: uma região que nasce preenchida é lida como conteúdo estático e a semeadura seria
  anunciada a ninguém. Esta exigência **não** afrouxa FR-001a: aquele requisito governa o estado
  **visual** — o starter desenhado e escrito sem que o vazio de S0 apareça — e um anúncio emitido um
  tick depois do primeiro paint não exibe estado intermediário algum ao usuário vidente. A limpeza
  (FR-017 item **b**) não precisa deste cuidado: ela já é, por construção, uma mudança posterior à
  montagem. Consequência para o teste: SC-013 MUST aferir a **transição** (região sem a mensagem no
  primeiro paint, mensagem presente em seguida); um teste que afirme apenas o texto final passaria
  igualmente sobre uma implementação muda.

- **FR-018**: A aferição de SC-012 MUST correr contra o **build de produção** do app (servido por
  `vite preview`), e MUST NOT usar o dev server que serve os demais testes e2e: o dev server entrega
  ESM não empacotado e transforma sob demanda, de modo que o tempo medido ali descreve a ferramenta
  de desenvolvimento e não o artefato que o usuário carrega — e o teto de 1 s, que só existe para
  pegar regressão de inicialização real, viraria ruído. A aferição MUST tomar o p95 de **30
  amostras** de carregamento, após ao menos um carregamento de aquecimento, num **único** projeto de
  browser (chromium) — o tamanho de amostra já praticado pelo harness de performance de S0. Esta
  exigência implica uma configuração de execução e2e **adicional** para o portão de SC-012; a
  **configuração** e2e existente MUST permanecer inalterada, e os testes de S0 que dela dependem MUST
  permanecer inalterados **exceto** pelas duas asserções que FR-014a enumera — cuja premissa é o
  estado vazio de abertura, e que esta fatia abole por definição. Executar o portão nos três browsers
  não é exigido: SC-012 afere regressão de
  inicialização, não paridade entre browsers.

### Key Entities

- **Template Starter de Flowchart**: o conteúdo fixo definido em FR-002, expresso como um **modelo
  de diagrama** (nós com rótulo e formato, arestas com rótulo) do qual o texto do painel é gerado
  (FR-003). Não é um documento do usuário nem um estado salvo: é o valor inicial do diagrama da
  sessão, indistinguível de conteúdo colado assim que é apresentado.
- **Estado de primeiro contato**: a condição de abertura em que a sessão não tem nada a restaurar.
  É a única condição que dispara a semeadura do starter.
- **Rascunho restaurável**: conteúdo de sessão anterior que o buffer de recuperação poderia
  devolver (RN-06). Nesta fatia existe apenas como **entrada da decisão de semeadura** (FR-011a),
  sempre ausente na execução real e presente apenas nos testes que exercitam a precedência: quando
  presente, vence o starter. Nada do buffer que o produziria é construído aqui.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das aberturas sem conteúdo a restaurar, o usuário encontra um Flowchart
  desenhado no canvas e escrito no código, com **zero ações** executadas por ele, e em **zero**
  dessas aberturas o estado vazio de S0 é exibido em qualquer instante antes do starter (FR-001a).
- **SC-002**: O número de passos preparatórios entre abrir a ferramenta e realizar a primeira
  edição significativa (renomear um nó do starter) é **zero** — contra "inventar e digitar um
  diagrama do zero" na tela em branco de hoje.
- **SC-003**: O código exibido no primeiro contato é idêntico, caractere a caractere, ao código que
  o sistema gera a partir do starter, em 100% das aberturas; e, após a primeira edição feita pelo
  canvas, **100% das linhas alheias à edição** permanecem idênticas em texto e em ordem. As linhas
  alcançadas pela edição — incluindo as arestas reescritas pela cascata de ID de um rename (S0,
  FR-003) — não contam contra o critério; o que se afere é a ausência de reescrita ou reordenação
  em massa, não um diff de tamanho fixo.
- **SC-004**: Cada uma das cinco ações centrais de edição de S0 (adicionar nó, renomear nó,
  conectar, remover nó, remover aresta) funciona sobre o starter em 100% das tentativas, com o
  código reescrito a cada uma — sem nenhum passo preparatório.
- **SC-005**: O código do starter, copiado sem edição e colado no GitHub (README, PR ou issue),
  renderiza corretamente e sem erro de sintaxe, em 100% das tentativas.
- **SC-006**: Após a ação de limpar, restam **zero** nós, arestas e linhas de código — canvas e
  texto vazios — em 100% das execuções, e o starter não reaparece pelo resto da sessão. "Não
  reaparece" cobre também a reintrodução **indireta**: limpar com uma conexão pendente e depois
  conectar dois nós novos produz **zero** nós implícitos originários do starter (FR-006a), e limpar
  com um parse de texto ainda pendente deixa canvas e código vazios de forma **estável** — o parse
  em voo é cancelado e não repovoa o modelo depois da limpeza (FR-006b). Após a limpeza, **zero**
  ponteiros de edição obsoletos permanecem: um rename interrompido pela limpeza não captura nenhuma
  tecla destinada a nós criados depois dela (FR-006c).
- **SC-007**: Após colar um Flowchart próprio sobre o starter, **zero** elementos do starter
  permanecem no diagrama ou no código, em 100% das colagens de código válido testadas.
- **SC-008**: Quando a decisão de semeadura (FR-011a) recebe conteúdo restaurável, ela decide **não
  semear** em 100% dos casos — aferido por teste unitário que passa um rascunho simulado à função
  pura, inclusive um rascunho que represente um canvas vazio. Nenhum elemento do starter é mesclado
  ou escrito por cima do rascunho em **0%** dos casos. O buffer que produziria esse rascunho não é
  construído nesta fatia (FR-011); o que se afere aqui é a regra de precedência, não o buffer.
- **SC-009**: O starter cabe em no máximo 6 nós e 14 linhas, é descartável em uma única ação, e está
  integralmente visível na abertura sem que o usuário execute zoom ou pan — aferido num viewport
  mínimo de **1280×800**.
- **SC-010**: Ao recarregar a aba, nada do trabalho do usuário é preservado e a interface não sugere
  em momento algum que o starter ou a edição tenham sido salvos — coerente com a sessão efêmera de
  S0 (SC-007 de S0).
- **SC-011**: Nenhuma superfície de escolha de template é apresentada ao usuário em 100% dos
  fluxos desta fatia.
- **SC-012**: O tempo entre o carregamento da interface e o starter estar simultaneamente desenhado
  no canvas e escrito no painel de código é de no máximo **1 s (p95)**, aferido **no tamanho real do
  starter** (FR-002) e no **runner de CI** como hardware de referência. O instrumento é um teste
  **end-to-end (Playwright), em `tests/e2e/`**, medindo do `page.goto('/')` até os nós do starter
  visíveis no canvas **e** o texto presente no painel de código — de modo que o relógio comece e
  termine onde este critério afirma, incluindo bundle, boot e render. O alvo medido é o **build de
  produção** e a amostra é de **30 carregamentos** num único browser (chromium), conforme FR-018:
  medida contra o dev server, a afirmação valeria para um artefato que nenhum usuário recebe. O
  harness de `tests/perf/`
  **não** serve aqui: sua fronteira declarada é o sub-caminho puro (parse + layout), ele exclui o
  render de propósito (delegando-o à suíte e2e) e a semeadura sequer percorre o parse, já que o
  starter entra como modelo (FR-003) — medida ali, SC-012 cronometraria `generate` + `layout` de 5
  nós em microssegundos: verde garantido, afirmação não sustentada. O teto de 60 nós / 90 arestas do
  plano de S0 **não se aplica** aqui: ele governa conteúdo arbitrário do usuário, enquanto o starter
  é conteúdo fixo de 5 nós, de modo que aferir a semeadura naquele teto mediria um cenário que não
  pode ocorrer.
- **SC-013**: Em 100% das aberturas com semeadura, a apresentação do starter é anunciada à
  tecnologia assistiva; e em 100% das limpezas concluídas, o resultado é anunciado — de modo que um
  usuário de leitor de tela saiba, sem inspecionar o canvas, que há um diagrama inicial e que sua
  limpeza terminou. O anúncio da semeadura é aferido como **transição** da região de status (sem a
  mensagem no primeiro paint, mensagem presente em seguida — FR-017a), e não como presença do texto:
  afirmar só o texto final daria verde também sobre uma região que nasce preenchida, que nenhum
  leitor de tela chega a falar.

## Assumptions

- **Conteúdo do starter**: o exemplo de FR-002 (fluxo de revisão → aprovação → publicação) foi
  escolhido por ser um domínio universalmente reconhecível, que não exige conhecimento prévio do
  usuário, e por exercitar decisão + ramificação + retorno em cinco nós. A decisão (`Aprovado?`) e
  os rótulos de aresta (`Sim`/`Não`) são construtos que, em S0, são **preservados no ciclo mas não
  editáveis pelo canvas** — assume-se que isso é aceitável e até desejável: o starter ensina que o
  formato os suporta e que o painel de texto é onde se mexe neles nesta release. Como o starter é
  semeado **como modelo** (FR-003), o modelo de S0 precisa carregar formato de nó e rótulo de aresta
  e o gerador precisa saber emiti-los: isso foi **verificado contra o código entregue** — `Node.shape`
  e `Edge.label` existem em `src/core/model/types.ts` e `src/core/generator/index.ts` os emite via
  `SHAPE_DELIMITERS` (`diamond` → `{}`). Nenhuma extensão do modelo de S0 é prevista por esta fatia.
  O que **não** existe em S0 é a *renderização* de formato no canvas (`FlowNode` desenha todo nó como
  retângulo): daí FR-002a fixar o formato como construto do painel de código nesta release, em vez de
  acrescentar capacidade ao canvas. O retorno `Aprovado?` → `Revisar` cria um ciclo no grafo;
  verificou-se que o layout de S0 usa dagre, que quebra ciclos internamente, de modo que o ciclo do
  starter não é um caso novo a tratar.
- **Forma de emissão do gerador**: o contrato do gerador de S0
  (`specs/001-s0-walking-skeleton/contracts/generator.contract.md`) fixa determinismo, ordenação e
  escape (G1–G8), mas **não fixa** se a definição de um nó sai em linha própria ou embutida na
  aresta. O gerador **já entregue** em S0 (`src/core/generator/index.ts`) resolveu a lacuna na
  prática: emite `flowchart <DIR>`, depois cada nó de raiz em linha própria, depois cada aresta.
  FR-003a fecha a lacuna **ratificando esse valor**, e não escolhendo outro. A alternativa —
  emissão inline, que faria o starter caber em 6 linhas — foi rejeitada: ela reescreveria a saída de
  todo diagrama do usuário e os testes de unidade/round-trip/e2e que a afirmam, para ganhar cinco
  linhas contra um teto que é invenção desta fatia. Por isso o teto de FR-013 foi ajustado ao
  gerador (14 linhas, com folga para o teto de 6 nós ser alcançável — o starter ocupa 11), e não o
  gerador ao teto. O contrato de S0 deve ganhar essa garantia (uma
  G9 de forma de emissão) no passo de plano desta fatia — sem isso, o teto de linhas de FR-013
  volta a depender de uma escolha de implementação não governada. Como a G9 apenas documenta o
  comportamento existente, ela não implica mudança de código nem de teste em S0 (FR-014).
- **Idioma**: o starter é escrito em português (pt-BR), coerente com a decisão de idioma de S0
  (interface pt-BR, strings fixas, sem i18n nesta release).
- **Semeadura síncrona**: assume-se que a semeadura não tem nenhuma etapa assíncrona a justificar um
  estado intermediário — o starter é constante, o gerador de S0 é puro e o layout é calculado pela
  aplicação, sem rede. Se essa premissa cair (ex.: se o layout passar a ser assíncrono), FR-001a
  precisa ser revisitada: a decisão foi "sem estado intermediário", não "com indicador de
  carregamento", e um flash do estado vazio nunca é a saída aceitável.
- **Ação de limpar**: assume-se que esta fatia introduz uma ação explícita de limpar, em vez de
  depender de o usuário selecionar tudo e apagar no painel de código — que já era possível em S0
  mas depende do painel estar expandido e não é descoberta pelo usuário.
- **Confirmação de limpeza**: assume-se confirmação apenas quando há trabalho a perder, e não para
  o starter intocado, para não pôr atrito exatamente no fluxo que a fatia existe para servir
  (começar limpo). A regra é decidível comparando o **texto do painel** com a forma canônica do
  starter (FR-007) — uma comparação de strings, sem inspeção do modelo. Assume-se que o viés certo
  é o do falso positivo: perguntar de mais custa um clique, perguntar de menos destrói trabalho de
  forma irreversível. Por isso o predicado trata qualquer divergência visível do texto como
  trabalho, mesmo a que o modelo canônico não registra.
- **Semeadura única por sessão**: assume-se que limpar é uma decisão do usuário que deve ser
  respeitada até o fim da sessão; ressemear o starter ao esvaziar o texto seria devolver um andaime
  que o usuário acabou de recusar.
- **Precedência sobre rascunho restaurável**: assume-se que a mera existência de conteúdo
  restaurável — mesmo que represente um canvas vazio — caracteriza um usuário retornando, e portanto
  suprime o starter. A regra é **decidida e testada** aqui, na função pura de FR-011a, e apenas
  **alimentada** pela fatia do RN-06/RF-15 quando ela existir; nada do buffer é construído nesta
  fatia. Assume-se que essa separação é o que permite afirmar SC-008 hoje sem antecipar o RN-06.
- **Fator de forma e acessibilidade**: valem as premissas de S0 — web desktop (mouse + teclado),
  piso de acessibilidade baseline (ações alcançáveis por teclado, nomes/papéis acessíveis, status
  anunciado), sem alegação de conformidade WCAG completa. S0 enumera exatamente dois anúncios
  (cópia e "texto não interpretável"); assume-se que essa lista era exaustiva para os eventos de S0,
  não uma proibição de anunciar eventos novos — daí FR-017 acrescentar os dois que S1 cria, sem que
  isso conte como redefinir S0 (FR-014). S0 não declara um viewport mínimo; esta
  fatia adota **1280×800** como o viewport de aferição de SC-009, sem que isso restrinja os
  tamanhos de janela suportados — o enquadramento do starter (FR-013) o mantém integralmente
  visível em qualquer viewport desktop.
- **Aferição de desempenho**: o plano de S0 declara o teto de tamanho (60/90, Decisão C) mas descreve
  o hardware de referência apenas como "hardware desktop moderno", o que não é reprodutível. Esta
  fatia adota o **runner de CI** como hardware de referência de SC-012, assumindo que um portão
  conservador (o runner é tipicamente mais lento que a máquina do usuário) vale mais que um alvo
  exato não verificável. Assume-se também que 1 s é folga generosa para semear 5 nós, dado o
  p95 ≤ 150 ms de input→render que S0 já sustenta no teto de 60/90 — o alvo existe para pegar
  regressão de inicialização, não para ser disputado. Justamente por ser um portão de
  **inicialização**, ele é aferido por e2e (Playwright) e não pelo harness de `tests/perf/`: o alvo
  só tem sentido se o relógio incluir bundle, boot e render, que é o que `tests/perf/` exclui por
  decisão explícita de S0. Pelo mesmo motivo, o alvo medido é o **build de produção** e não o dev
  server que serve os demais e2e (FR-018) — medir o dev server incluiria "bundle" e "boot" de um
  artefato que ninguém entrega. Assume-se que a variância de um runner compartilhado é absorvida
  pela folga do teto — 1 s contra um trabalho de microssegundos mais o boot da aplicação — somada à
  amostragem de 30 carregamentos, de modo que o teste seja um portão de regressão estável e não uma
  fonte de flakiness. Se essa premissa cair (p95 encostando no teto num runner ocioso), o alvo a
  revisitar é o teto de 1 s, não o instrumento: medir o artefato errado para obter verde derrotaria
  o propósito do portão.
- **Fronteira do "não alterar S0"**: FR-014 é invocada em toda esta spec para recusar reescritas de
  S0, e assume-se que ela protege **comportamento entregue**, não a letra dos fixtures que o aferem.
  A distinção é o que torna a fatia coerente: S1 muda o estado de abertura **por definição** (é o seu
  único valor), de modo que ler FR-014 como "nenhum arquivo sob `tests/` muda" tornaria a fatia
  autocontraditória — `tests/e2e/ephemeral.spec.ts` afirma painel vazio após reload, e os Edge Cases
  desta spec afirmam o starter reaparecendo. Assume-se que os dois testes que FR-014a emenda não
  codificam requisito algum de S0 sobre o estado vazio: eles o usam como **cenário de partida**
  conveniente, porque em S0 era o único disponível. Verificou-se contra o código que a lista é
  exaustiva: os demais e2e substituem o texto por `fill()` ou aferem por regex, e sobrevivem ao
  starter sem emenda. Se um terceiro teste vier a quebrar na implementação, isso é sinal de que esta
  premissa falhou e o caso merece decisão explícita — não emenda silenciosa do teste até o verde.
- **Dependência de S0**: esta fatia assume o laço bidirecional, a tolerância a texto inválido, a
  fidelidade de round-trip, o determinismo da geração e a cópia como já entregues e inalterados por
  S1.
