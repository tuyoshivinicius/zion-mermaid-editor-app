# Feature Specification: Cano modelo ⇄ código

**Feature Branch**: `cano-modelo-codigo`

**Created**: 2026-07-21

**Status**: Draft

**RF cobertos:** RF-19, RF-23

**Input**: User description: "Especifique a spec vertical cano-modelo-codigo, o walking skeleton (R0) do produto: a pessoa cria um nó na área do diagrama e vê a linha correspondente nascer no código mermaid; edita esse mesmo código e vê o nó mudar na área do diagrama conforme digita, sem perder o que já estava construído; arrasta o nó para outro lugar e copia o código com um gesto — e a posição para onde arrastou não está no código copiado."

## Por que esta spec existe

Esta é a primeira fatia vertical do produto (release **R0** — *o cano*). Ela não entrega vocabulário:
entrega a **prova de que diagrama e código são duas vistas de um modelo só**, nos dois sentidos, com
o código saindo do outro lado como produto final. Toda spec seguinte do backlog acrescenta
vocabulário sobre este cano; se ele não fecha, nada do que vier depois fecha.

Por isso o recorte é mínimo por desenho: **um tipo de diagrama (Flowchart) e um só gesto de criação
e um de movimentação de nó** — o suficiente para provar a ida (diagrama → código), a volta (código →
diagrama) e a fronteira do que é durável (a posição não viaja).

## Clarifications

### Session 2026-07-21

- Q: O gesto de excluir nó na área do diagrama está no escopo do R0, dado que o backlog o atribui a `elementos-grafo-dirigido`? → A: Excluir só pelo código no R0 — apagar a linha no código remove o nó; o gesto de excluir na área do diagrama fica com `elementos-grafo-dirigido`.
- Q: Qual é o código de um diagrama com zero nós, do qual dependem o FR-011, o SC-001 e o gesto de copiar com o diagrama vazio? → A: A projeção sempre emite o cabeçalho do tipo, mesmo com zero nós — o código de um diagrama vazio é a declaração `flowchart` sozinha, válida e copiável.
- Q: Onde nasce, na área do diagrama, o nó materializado a partir do código, que não tem posição escolhida por ninguém? → A: Colocação local determinística — ancorado no elemento anterior na ordem do código, em espaço livre próximo, sem mover ninguém; o mesmo código produz sempre as mesmas posições.
- Q: O rótulo padrão do nó recém-criado é único, e dois nós podem colidir no código? → A: Rótulo padrão neutro numerado na sessão ("Nó 1", "Nó 2"…), e dois nós nunca compartilham identificador no código.
- Q: O que a área do diagrama mostra quando o código declara um tipo que não é Flowchart? → A: O cabeçalho de outro tipo é ignorado e não troca o tipo do diagrama; o que restar no texto dentro do vocabulário de nó vira diagrama, podendo ser vazio. *(Refinado adiante: a leitura reconhece a linha de declaração e a descarta, em vez de tratá-la como trecho ilegível.)*
- Q: O que acontece com o texto que a pessoa escreveu quando um gesto no diagrama precisa escrever no código? → A: Edição cirúrgica — o gesto altera só as linhas do elemento afetado; todo o resto do texto (ordem, espaçamento, trechos ilegíveis) permanece byte-idêntico ao que ela escreveu.
- Q: O que o gesto de copiar entrega quando a pessoa apagou o código inteiro, dado que o FR-014 exige documento válido e o FR-017 diz que o texto é dela? → A: A cópia completa o cabeçalho — o editor permanece como ela o deixou, e o gesto de copiar entrega um documento válido, acrescentando a declaração do tipo quando o texto dela não a tem.
- Q: O nó continua o mesmo quando a pessoa troca o identificador dele no código, letra por letra? → A: Continuidade pela linha editada — enquanto ela edita a linha de um nó, ele continua o mesmo nó; trocar o identificador é renomear, e a posição arrastada permanece.
- Q: Qual é o gesto direto de criação do nó na área do diagrama (FR-001)? → A: Duplo-clique no espaço vazio — o nó nasce no ponto onde ela clicou.
- Q: De onde vem o identificador que o nó criado por gesto recebe no código? → A: Opaco e estável — nasce sequencial (`n1`, `n2`…) e nunca muda por causa do rótulo.
- Q: O que o editor mostra numa sessão recém-aberta, e o que acontece quando um gesto escreve num texto sem cabeçalho? → A: Cabeçalho semeado uma vez — a sessão nasce com a declaração do tipo no editor; se a pessoa a apagar, o produto nunca a recoloca, nem ao criar nó por gesto, e só a cópia a acrescenta na saída.
- Q: O que a área do diagrama mostra quando a pessoa repete um identificador no código que ela escreveu? → A: O identificador é a chave — as linhas repetidas descrevem um nó só, e a última declaração de rótulo no texto prevalece.
- Q: De onde sai o próximo identificador da sequência `n1`, `n2`…, dado que a pessoa pode ter escrito `n2` à mão? → A: Contador monotônico da sessão, que nunca reusa identificador já emitido e avança até um valor livre quando o próximo já está ocupado no texto dela.
- Q: Onde entra, no texto, a linha do nó criado por gesto na área do diagrama? → A: No fim do documento — a linha nova é acrescentada ao final do texto, seja lá o que houver lá, e nada acima muda.
- Q: O que o gesto de copiar entrega quando o texto dela traz um cabeçalho de outro tipo, que sozinho tornaria a saída inválida? → A: Na saída da cópia, a declaração de outro tipo é substituída pela declaração do tipo corrente; o editor permanece intocado.
- Q: O que a área do diagrama mostra para uma linha de conexão (`a --> b`), que no mermaid de fora materializa dois nós? → A: Trecho ilegível, sem exceção — a linha inteira é ignorada e nenhum nó nasce dela; a fidelidade prometida vale sobre o vocabulário desta spec, não sobre qualquer texto colado no editor.
- Q: Quem vence entre a promessa de validade da cópia (FR-014) e "o texto é dela" (FR-017), quando ela deixou no editor um trecho que o mermaid recusa? → A: O texto dela vence — a cópia entrega o texto dela mais o cabeçalho, e a validade é prometida sobre o que o produto escreveu: o produto nunca é a causa da invalidez, e a cópia nunca remove texto dela.
- Q: De onde sai o número do rótulo padrão ("Nó 1", "Nó 2"…) — é o mesmo número do identificador? → A: O rótulo espelha o número do identificador — o nó `n3` nasce "Nó 3"; um contador só, e nenhuma promessa de rótulo único.
- Q: O que a caixa exibe enquanto a linha do nó está incompleta (`n1[Nó ` sem fechar)? → A: Rótulo tolerante — o produto recupera o texto do rótulo sem exigir o delimitador de fecho, e a caixa acompanha letra por letra.
- Q: Um identificador sozinho numa linha (`n1`, sem rótulo) é um nó? → A: Sim — declara um nó cujo rótulo é o próprio identificador, como no mermaid de fora.
- Q: A linha `flowchart` sozinha é um identificador sozinho — a sessão recém-aberta nasce com uma caixa rotulada "flowchart"? → A: Não — a leitura reconhece a linha de declaração de tipo onde quer que ela esteja no texto e nunca a materializa como nó; é exceção nomeada à FR-005. *(Refinado adiante: a linha semeada é `flowchart TD`, e o reconhecimento vale com ou sem orientação — a forma de token único é a que sobra quando a pessoa apaga a orientação.)*
- Q: O nó arrastado pula de lugar quando a pessoa move a linha dele no código (recortar e colar)? → A: O arranjo lembra a posição por identificador na sessão — a identidade não volta (é nó novo), mas o nó renasce onde ela o havia deixado.
- Q: O que acontece com a vista do editor quando a linha nova nasce no fim de um documento rolado para outro ponto? → A: O editor revela a linha nova (rola até ela e a destaca por um instante) sem mover o cursor de digitação; voltando a digitar, a vista volta ao cursor dela.
- Q: Qual é, ao pé da letra, o gesto único de copiar o código (FR-010, SC-006)? → A: Um clique num botão de copiar visível e permanente na área do código, que exibe nele mesmo a confirmação de sucesso ou de falha; atalho de teclado é de `ciclo-por-teclado`.
- Q: A memória de arranjo por identificador pode empilhar duas caixas depois de um renomear? → A: Não — renomear transfere a lembrança para o identificador novo, e a posição lembrada só é devolvida se o lugar estiver livre; ocupado, vale a colocação determinística.
- Q: O nó já desenhado some quando a pessoa continua digitando na linha dele até ela sair do vocabulário de nó (`n1[Nó A] --> n2`), dado que a FR-004 promete 0 perdas e a FR-005 declara a linha ilegível por inteiro? → A: A FR-005 vence — a linha inteira vira ilegível e o nó some enquanto ela estiver fora do vocabulário; escrever outra coisa na linha conta como remover, e o nó renasce na posição lembrada (FR-015) se ela voltar ao vocabulário de nó.
- Q: Onde nasce o primeiro nó do documento, que não tem elemento anterior para ancorar a colocação determinística (FR-015)? → A: Origem fixa da área do diagrama — um ponto constante, independente do tamanho da janela e do estado da sessão; o mesmo código produz as mesmas coordenadas em qualquer tela.
- Q: O que a área do diagrama faz quando a colocação determinística ou o arraste levam um nó além da borda visível? → A: Plano rolável — a área rola para acomodar o conteúdo e todo nó permanece alcançável; zoom, pan por arraste e ajustar à tela continuam com `area-de-trabalho`.
- Q: O que acontece quando o duplo-clique da FR-001 cai sobre uma caixa, e não no espaço vazio? → A: É ignorado — nenhum nó nasce e nada abre; o rótulo se edita pelo código, e editar rótulo por gesto é `RF-02`, de outra spec.
- Q: Qual é, ao pé da letra, a declaração do tipo que a sessão semeia (FR-019) e que a cópia entrega (FR-014), da qual depende a validade do documento de zero nós (SC-001)? → A: `flowchart TD` — orientação explícita e constante do produto, de modo que a saída valha por si mesma sem depender do default do renderizador de fora; escolher ou trocar a orientação segue em `layout-automatico`.
- Q: Qual é, ao pé da letra, o "vocabulário de nó desta spec" a que a FR-005 se refere nove vezes? → A: Só o delimitador retangular — `n1` e `n1[Nó A]`; escrito com outro delimitador (`n1(…)`, `n1{…}`, `n1((…))`), a linha é trecho ilegível por inteiro e nenhum nó nasce dela, porque o repertório de shapes é de `estilo-de-elementos`.
- Q: O que a caixa exibe para `n1["Nó A"]`, forma com que o mermaid escreve rótulo de caractere especial e que lá fora desenha `Nó A`? → A: As aspas delimitam o rótulo e não entram nele — a caixa exibe `Nó A`; é recurso de escrita do texto, não escolha de shape, e sem isso o rótulo divergiria do desenho de fora (FR-011, `RN-02`).
- Q: Qual é o conjunto de linhas que a FR-005 reconhece como declaração de tipo — o "ou a de qualquer outro"? → A: As declarações dos cinco tipos do escopo do produto (`RF-18`), com ou sem orientação; conjunto fechado — uma declaração fora do escopo (`pie`) não é reconhecida e cai na regra comum, virando nó pelo identificador sozinho.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O nó nasce e a linha aparece no código (Priority: P1)

Marina abre o produto, cria um nó na área do diagrama e vê, no mesmo instante, a linha
correspondente aparecer no código mermaid ao lado. Ela não pediu para gerar código, não apertou nada
para sincronizar: o código é a outra vista do que ela acabou de fazer.

**Why this priority**: é a metade "ida" do cano e o primeiro sinal de vida do produto. Sem ela não
existe nada para editar nem para copiar; as duas outras histórias pressupõem que haja um nó.

**Independent Test**: criar um nó e conferir que o código exibido passou a conter a linha
correspondente, sem nenhum gesto adicional. Entrega valor sozinha: já é um gerador de mermaid por
gesto direto.

**Acceptance Scenarios**:

1. **Given** uma sessão recém-aberta, com o diagrama vazio e o editor trazendo apenas a declaração
   do tipo, **When** Marina dá um duplo-clique no espaço vazio da área do diagrama, **Then** o nó
   aparece no ponto onde ela clicou e o código exibido passa a conter uma linha correspondente a
   esse nó, sem nenhum gesto adicional de sincronização.
2. **Given** um diagrama com um nó já criado, **When** Marina cria um segundo nó, **Then** o código
   passa a conter as duas linhas, e a linha do primeiro nó permanece como estava.
3. **Given** um código que Marina escreveu à mão, com espaçamento próprio e um trecho que o produto
   não lê, **When** ela cria um nó pelo gesto na área do diagrama, **Then** a linha do nó novo
   aparece e todo o resto do texto permanece exatamente como ela o escreveu.
4. **Given** um código de onde Marina apagou a declaração do tipo, **When** ela cria um nó pelo
   gesto na área do diagrama, **Then** a linha do nó novo aparece e o cabeçalho continua ausente —
   o produto não o recoloca.
5. **Given** um código em que Marina escreveu à mão um nó com o identificador que a sequência do
   produto usaria a seguir, **When** ela cria um nó pelo gesto na área do diagrama, **Then** o nó
   novo recebe um identificador livre, o rótulo dele traz o mesmo número desse identificador — a
   numeração dos rótulos salta junto — e a linha que ela escreveu permanece intocada.
6. **Given** um código longo, rolado num ponto qualquer, com o cursor de digitação numa linha do
   meio, **When** Marina cria um nó pelo gesto na área do diagrama, **Then** o editor leva a vista
   até a linha nova e a destaca, o cursor dela continua onde estava, e ao voltar a digitar a vista
   retorna ao cursor.
7. **Given** um diagrama com um nó, **When** Marina dá um duplo-clique **sobre a caixa** desse nó,
   **Then** nada acontece: nenhum nó novo aparece, o código permanece byte-idêntico e nenhuma edição
   de rótulo abre na área do diagrama.

---

### User Story 2 - Escrevo no código e o diagrama acompanha conforme digito (Priority: P2)

Marina vai ao código, escreve mermaid à mão e vê o diagrama mudar enquanto digita — sem apertar nada
para aplicar. Enquanto ela digita, o que já estava construído continua na tela: uma palavra a meio
caminho não apaga o trabalho dela.

**Why this priority**: é a metade "volta" do cano — a que prova que existe *um* modelo, e não um
gerador de texto de mão única. É também a que carrega o risco maior do R0: código incompleto é
estado normal de digitação, não erro.

**Independent Test**: com um diagrama já construído, digitar no código caractere a caractere e
conferir, a cada tecla, que o diagrama reflete o texto e que nenhum elemento real desapareceu no
caminho.

**Acceptance Scenarios**:

1. **Given** um diagrama com um nó, **When** Marina edita no código o texto que identifica esse nó,
   **Then** o nó na área do diagrama muda conforme ela digita, sem gesto de confirmação.
2. **Given** um diagrama com nós criados, **When** Marina apaga no código a linha de um deles,
   **Then** esse nó desaparece da área do diagrama e os demais permanecem — é assim que se remove um
   nó no R0.
3. **Given** um diagrama com nós, **When** Marina digita uma linha nova no código, letra por letra,
   **Then** em nenhum momento intermediário um nó que já existia some da área do diagrama.
4. **Given** um código em estado intermediário de digitação, sintaticamente incompleto, **When**
   Marina para de digitar, **Then** a área do diagrama continua exibindo um diagrama — nunca uma
   tela vazia, nunca uma prévia quebrada.
5. **Given** um diagrama cujos nós Marina já arrastou para posições escolhidas por ela, **When** ela
   edita o código, **Then** os nós preexistentes permanecem exatamente onde estavam.
6. **Given** o código totalmente apagado, **When** Marina para de digitar, **Then** a área do
   diagrama mostra um diagrama vazio, o editor permanece vazio — o produto não reescreve o cabeçalho
   por conta própria — e o produto continua utilizável.
7. **Given** um nó que Marina arrastou para uma posição escolhida por ela, **When** ela troca no
   código o identificador desse nó, letra por letra, **Then** o nó permanece o mesmo nó na área do
   diagrama e continua exatamente onde ela o deixou.
8. **Given** um diagrama com um nó, **When** Marina duplica a linha desse nó no código e reescreve o
   rótulo da cópia, **Then** a área do diagrama continua com **um** nó, exibindo o rótulo da última
   linha, e as duas linhas permanecem no texto.
9. **Given** um diagrama vazio, **When** Marina digita `n1[Nó A]` letra por letra, **Then** a caixa
   nasce assim que o identificador está legível, rotulada `n1`, e o rótulo acompanha a digitação
   letra a letra até `Nó A` — sem congelar à espera do colchete de fecho e sem exibir o colchete.
10. **Given** uma sessão recém-aberta, cujo editor traz apenas a declaração do tipo, **When** Marina
    não digita nada — e também quando ela escreve uma segunda declaração de tipo numa linha no meio
    do texto —, **Then** a área do diagrama continua vazia: nenhuma caixa nasce de uma linha de
    declaração de tipo, em nenhuma posição do documento.
11. **Given** um nó que Marina arrastou para uma posição escolhida por ela, **When** ela recorta a
    linha desse nó e a cola noutro ponto do código, **Then** o nó volta a aparecer exatamente onde
    ela o havia deixado, e nenhum outro nó se move.
12. **Given** um nó desenhado e arrastado, cuja linha é `n1[Nó A]`, **When** Marina continua
    digitando nessa linha até `n1[Nó A] --> n2`, **Then** a caixa some enquanto a linha estiver fora
    do vocabulário de nó — e nenhuma caixa nasce do prefixo nem do `n2` —; **When** ela apaga o que
    digitou depois do rótulo, **Then** a caixa reaparece na mesma posição em que ela a havia deixado.
13. **Given** um diagrama vazio, **When** Marina escreve `n1["Nó, A"]` — a forma com aspas, de que ela
    precisa para pôr uma vírgula no rótulo —, **Then** a caixa exibe `Nó, A` sem as aspas, e o mesmo
    rótulo aparece quando esse código é desenhado por um mermaid de fora.
14. **Given** um diagrama vazio, **When** Marina escreve `n1(Nó A)`, com o delimitador de outro shape,
    **Then** nenhuma caixa nasce — a linha está fora do vocabulário de nó — e o texto permanece no
    editor, viajando na cópia.

---

### User Story 3 - Arrasto o nó e levo embora o código, sem a minha bagunça dentro (Priority: P3)

Marina arrasta o nó para onde ela quer enxergá-lo e copia o código com um gesto só. O que ela cola no
documento de arquitetura é o diagrama que ela desenhou — mas sem nenhum vestígio de onde ela
arrastou as coisas: a posição foi conforto da sessão dela, não conteúdo.

**Why this priority**: fecha o cano entregando o produto final e prova a fronteira do que é durável.
Depende de haver nó, mas o nó pode vir tanto da História 1 quanto da História 2.

**Independent Test**: mover todos os nós de um diagrama, copiar o código, e conferir que o texto
copiado é idêntico ao de antes do movimento e que ele desenha o mesmo diagrama quando renderizado
por um mermaid de fora.

**Acceptance Scenarios**:

1. **Given** um diagrama com nós, **When** Marina arrasta um nó para outro lugar, **Then** o nó fica
   onde ela soltou e o código permanece byte-idêntico ao de antes do arraste.
2. **Given** um diagrama pronto, **When** Marina clica no botão de copiar da área do código, **Then**
   o código inteiro vai para a área de transferência com esse único gesto, sem ela precisar
   selecionar texto à mão.
3. **Given** um código copiado do produto, cujo texto está inteiro dentro do vocabulário desta spec,
   **When** ele é colado numa ferramenta mermaid qualquer, **Then** é aceito sem erro e desenha o
   mesmo diagrama que estava visível.
4. **Given** um código copiado do produto, **When** ele é inspecionado, **Then** não há nele nenhuma
   posição, coordenada, nível de zoom, seleção ou foco — nada da sessão de Marina.
5. **Given** o gesto de copiar acionado, **When** a cópia se completa, **Then** Marina recebe
   confirmação visível de que o código foi copiado; se a cópia não puder acontecer, ela é avisada
   disso em vez de acreditar que copiou.
6. **Given** o editor de código que Marina apagou por inteiro, **When** ela aciona o gesto de copiar,
   **Then** o texto copiado é a declaração do tipo sozinha — um documento válido — e o editor
   continua vazio.
7. **Given** um código em que Marina escreveu no topo a declaração de outro tipo de diagrama,
   **When** ela aciona o gesto de copiar, **Then** o texto copiado traz **uma só** declaração, a do
   tipo corrente, e o editor continua com a declaração que ela escreveu.
8. **Given** um código em que Marina deixou um trecho que o produto não lê e que um mermaid de fora
   recusa, **When** ela aciona o gesto de copiar, **Then** o trecho vai junto na cópia — o produto
   não o remove para salvar a validade da saída — e o texto copiado difere do editor apenas na
   declaração do tipo.

---

### Edge Cases

- **Digitar uma palavra-chave passa por prefixos que parecem outra coisa.** Enquanto Marina digita, o
  produto pode desenhar caixas espúrias que somem na tecla seguinte. É efeito visual conhecido e
  aceito no R0; o que não pode acontecer é um elemento **real** desaparecer.
- **Código que o produto não consegue ler inteiro.** A parte que ele entende vira diagrama; o resto é
  ignorado sem derrubar o que já estava — e **permanece no texto**, sobrevivendo aos gestos seguintes
  na área do diagrama (FR-017). Sinalizar *onde* está o erro é de outra spec — aqui a regra é apenas:
  sempre sobra um diagrama.
- **Código de um tipo que não é Flowchart.** A linha de declaração é reconhecida como cabeçalho e
  descartada (FR-005) — de qualquer um dos cinco tipos do escopo, em qualquer posição do texto —,
  sem virar nó e sem trocar o
  tipo do diagrama; o que restar no texto dentro do vocabulário de nó vira diagrama — podendo ser vazio, se a pessoa apagou as linhas dos nós. O
  produto não quebra e segue utilizável. No gesto de copiar, a saída troca essa declaração pela do
  tipo corrente (FR-014) — nunca sai um documento com duas declarações. Escolher e trocar o tipo é de
  outra spec.
- **Linha de vocabulário de outra spec.** Marina escreve uma conexão (`a --> b`) no código. A linha é
  trecho ilegível **por inteiro** (FR-005): nenhum nó nasce dela, nem os que um mermaid de fora
  extrairia — meia frase materializada confunde mais que nenhuma. A linha permanece no texto
  (FR-017) e viaja na cópia, de modo que o desenho de fora pode mostrar mais do que estava visível
  (FR-011). Ler e desenhar conexões é de `elementos-grafo-dirigido`.
- **Nó escrito com outro delimitador.** Marina escreve `n1(Nó A)` — que lá fora é o mesmo nó, de
  cantos arredondados. Vale a mesma regra: fora do delimitador retangular, a linha é ilegível por
  inteiro (FR-005) e nenhuma caixa nasce. Desenhar retângulo para um shape que ela pediu diferente
  seria a caixa mentindo sobre o código; ler o shape e desenhá-lo é `RF-03`, de
  `estilo-de-elementos`. O texto permanece (FR-017) e o desenho de fora traz o nó a mais (FR-011).
- **Nó que deixa de ser nó no meio da digitação.** Marina continua digitando na linha de um nó já
  desenhado até ela virar `n1[Nó A] --> n2`. A linha saiu do vocabulário de nó e é ilegível por
  inteiro (FR-005): a caixa some. Não é a perda que a FR-004 proíbe — ela escreveu outra coisa
  naquela linha, e resgatar o prefixo `n1[Nó A]` seria a materialização parcial que a FR-005 recusa.
  Apagando o que escreveu depois, o nó renasce como nó novo (FR-016) **onde ela o havia arrastado**
  (FR-015): na tela, ele volta no mesmo lugar.
- **Rajada de digitação.** Marina digita rápido; o produto trata a rajada como um ato só do modelo,
  não como um ato por tecla.
- **Rótulo a meio de ser escrito.** Renomear passa por `n1[Nó ` sem fecho — e, quando ela usa aspas,
  por `n1["Nó ` sem aspa nem colchete de fecho. A caixa exibe o texto até ali e segue a digitação
  letra por letra (FR-018) — não congela no último rótulo inteiro nem mostra a sintaxe crua. É o
  mesmo braço tolerante que garante o "sempre sobra um diagrama".
- **Linha sem identificador no meio da digitação.** Trocar o identificador de um nó passa por estados
  em que a linha não tem identificador nenhum. O nó não pisca nem renasce: é o mesmo nó sendo
  renomeado (FR-018).
- **O identificador da sequência já está ocupado.** Marina pode ter escrito `n2` à mão, ou apagado a
  linha do `n1`. O contador nunca reusa e nunca atropela: avança até um valor livre (FR-016). Um
  identificador apagado não volta — a linha reescrita é nó novo, não o antigo de volta. A
  **identidade** não volta; a **posição** volta, porque o arranjo a lembra por identificador
  (FR-015).
- **Identificador repetido no texto.** Duplicar uma linha é gesto comum de digitação. Duas linhas com
  o mesmo identificador não desenham duas caixas: descrevem um nó só, com o rótulo da última
  declaração (FR-016). As linhas repetidas permanecem no texto, que é dela (FR-017).
- **Reordenar linhas no código.** Recortar a linha de um nó e colá-la noutro lugar — ou usar o "mover
  linha" do editor — é gesto de digitação, não pedido de rearranjo. O nó some e renasce como nó novo
  (FR-016), mas renasce **onde ela o havia arrastado**: o arranjo lembra a posição por identificador
  (FR-015). Na tela, nada pula.
- **Identificador reescrito e depois digitado de novo.** Marina renomeia `n1` para `n9` e mais tarde
  escreve `n1` outra vez. A lembrança de posição foi com o renomear (FR-015): o `n1` novo não nasce
  empilhado no `n9`, nasce em espaço livre. Duas caixas no mesmo ponto nunca são obra do produto.
- **Duplo-clique na caixa, não no vazio.** Marina traz o hábito de toda ferramenta de diagrama e dá
  duplo-clique no nó esperando renomear. Nada acontece (FR-001) — nem um nó novo, que seria pior. O
  rótulo se edita pelo código no R0; o gesto é de `RF-02`, e sinalizar a ausência dele não é desta
  spec.
- **Nó além da borda visível.** A cadeia determinística passa da borda muito antes dos 400 nós, e
  Marina também pode arrastar um nó até a beirada. O plano rola para acomodá-lo (FR-007): nenhum nó
  fica inalcançável, e a rolagem não muda posição de nada (FR-009) nem aparece no código (FR-008).
  Enquadrar o diagrama com zoom ou "ajustar à tela" continua sendo de `area-de-trabalho`.
- **Arrastar e digitar quase ao mesmo tempo.** Uma edição no código durante ou logo após um arraste
  não reposiciona os nós preexistentes nem descarta o arraste.
- **Copiar com o diagrama vazio.** O gesto funciona e copia a declaração do tipo sozinha (FR-014),
  em vez de falhar em silêncio ou copiar texto vazio — inclusive quando é a própria pessoa que apagou
  o cabeçalho: a cópia o acrescenta na saída sem tocar no editor.
- **Copiar com um trecho que o mermaid recusa.** Marina deixou no editor algo que o produto não lê e
  que a ferramenta de fora rejeita. A cópia entrega o texto dela assim mesmo (FR-014): apagar o
  trabalho dela para que a saída passe no validador seria pior do que a saída não passar. O produto
  só responde por não **ele mesmo** produzir invalidez — daí o cabeçalho acrescentado ou substituído.
- **Documento grande.** Com um documento no tamanho do envelope declarado do produto (400 nós), a
  digitação no código continua respondendo dentro da barra; o cano não pode nascer já estourando o
  orçamento das specs seguintes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A pessoa DEVE conseguir criar um nó diretamente na área do diagrama, sem passar pelo
  código, por um **duplo-clique no espaço vazio** — e o nó DEVE nascer no ponto onde ela clicou. Um
  gesto, nenhuma escolha prévia de shape ou tipo: o repertório de shapes é de outra spec. O gesto é
  do **espaço vazio**: caindo **sobre uma caixa**, o duplo-clique é ignorado — nenhum nó nasce, nem
  sob o ponteiro nem ao lado, e nada abre. Editar o rótulo por gesto na área do diagrama é `RF-02`,
  de outra spec; no R0 o rótulo se edita pelo código (FR-003).
- **FR-002**: Criar ou mover um nó DEVE refletir-se no código exibido imediatamente, sem nenhum
  gesto de confirmação, geração ou sincronização — exceto pela posição, que nunca aparece (FR-008).
  Remover um nó no R0 é apagar a linha dele no código (FR-003); o gesto de excluir na área do
  diagrama é de outra spec. Refletir não basta: a linha escrita pelo gesto DEVE ficar **visível** —
  o editor leva a vista até ela e a destaca por um instante, mesmo num documento longo rolado em
  outro ponto. Revelar não é tomar: o **cursor de digitação** permanece onde a pessoa o deixou, e
  assim que ela volta a digitar a vista volta para ele. O gesto na área do diagrama nunca rouba o
  foco do editor.
- **FR-003**: A pessoa DEVE conseguir escrever e editar o código mermaid diretamente, e o diagrama
  DEVE acompanhar conforme ela digita, sem gesto de confirmação.
- **FR-004**: Enquanto a pessoa digita no código, nenhum elemento já materializado PODE desaparecer
  da área do diagrama por causa de um estado intermediário da digitação. Só desaparece o que a pessoa
  de fato removeu do texto. Levar a linha de um nó **para fora do vocabulário de nó** — continuar
  digitando nela até virar uma conexão, por exemplo — conta como remover: a linha inteira passa a ser
  ilegível (FR-005) e o nó some enquanto ela estiver assim. Isso não é perda por estado intermediário
  da digitação, é a pessoa escrevendo outra coisa naquela linha; a promessa de 0 perdas vale **dentro**
  do vocabulário desta spec, nos estados incompletos por que passa a digitação de um nó (FR-018).
- **FR-005**: A leitura do código DEVE sempre produzir um diagrama — inclusive para texto vazio,
  incompleto, parcialmente ilegível ou com cabeçalho de outro tipo. "Nada" e "prévia quebrada" não
  são resultados aceitáveis. Trecho que o produto não lê é ignorado e nunca derruba o documento
  inteiro. A **linha de declaração de tipo** — a do tipo corrente ou a de qualquer um dos **cinco
  tipos do escopo do produto** (`RF-18`) — é o único trecho fora do vocabulário de nó que a leitura
  **reconhece**: ela é descartada como cabeçalho, em
  qualquer posição do texto, e NUNCA PODE materializar um nó, ainda que a regra do identificador
  sozinho a alcançasse. O reconhecimento alcança a declaração **com ou sem orientação** (`flowchart
  TD`, `flowchart`): sem essa exceção, uma declaração de token único — a linha semeada de que a
  pessoa apagou a orientação (FR-019), ou o cabeçalho de outro tipo — nasceria como caixa rotulada
  com o nome do tipo, e o diagrama vazio não seria vazio. O conjunto é **fechado nesses cinco**: uma
  declaração de diagrama que o produto não tem no escopo não é reconhecida e cai na regra comum —
  sozinha numa linha, é identificador sozinho e materializa um nó rotulado com ela mesma. É texto
  fora do mundo do produto, tratado como qualquer outro texto dela (FR-017); amarrar a regra à lista
  de palavras-chave de uma ferramenta de fora deixaria o corpus do SC-001 sem fronteira. Reconhecer
  não é agir: a declaração não
  troca o tipo do diagrama, que é fixo nesta spec. Um mermaid de fora PODE extrair um nó de uma
  dessas linhas escrita no meio do documento — é a divergência já tolerada pela FR-011, em que o
  desenho de fora traz mais, nunca menos. Na saída do gesto de copiar essa mesma linha recebe o
  tratamento da FR-014, que precisa entregar um documento com uma só declaração. O **vocabulário de
  nó desta spec** é, ao pé da letra, uma linha de duas formas: o **identificador sozinho** (`n1`) e o
  identificador seguido do rótulo entre **colchetes** (`n1[Nó A]`) — um delimitador só, o retangular.
  Dentro dos colchetes, **aspas delimitam o rótulo e não entram nele**: `n1["Nó A"]` materializa um
  nó rotulado `Nó A`, como lá fora, e a caixa NUNCA PODE exibir as aspas — sob pena de divergir do
  desenho de fora no rótulo, que é a divergência que a FR-011 proíbe. Aspas são recurso de escrita do
  texto, não escolha de shape: o delimitador continua sendo o retangular.
  A leitura materializa **apenas** esse vocabulário: uma linha fora dele —
  uma conexão (`a --> b`), um agrupamento, um estilo, ou o mesmo nó escrito com **outro delimitador**
  (`n1(Nó A)`, `n1{Nó A}`, `n1((Nó A))`) — é trecho ilegível **por inteiro**, mesmo
  quando um mermaid de fora extrairia nós dela. Nenhum nó nasce de linha que o produto não lê, e não
  há materialização parcial de linha. Essa regra alcança a linha que **já materializava** um nó: se a
  pessoa continua digitando nela até que ela saia do vocabulário de nó, o nó some junto com a
  legibilidade da linha (FR-004) e renasce **na posição lembrada** (FR-015) se ela voltar ao
  vocabulário. Nenhum prefixo legível é resgatado de uma linha ilegível — seria a materialização
  parcial que esta regra recusa. Dentro do vocabulário de nó, o **identificador sozinho** é
  declaração válida: a linha `n1` materializa um nó cujo rótulo é o próprio identificador, como no
  mermaid de fora — e passa a exibir o rótulo delimitado assim que a pessoa o escreve (FR-018).
- **FR-006**: Diagrama e código DEVEM ser duas vistas do mesmo modelo: não existe estado em que os
  dois discordem e precisem ser reconciliados por um gesto da pessoa.
- **FR-007**: A pessoa DEVE conseguir mover um nó na área do diagrama, e a posição escolhida DEVE
  permanecer até que ela mesma a mude. A área do diagrama é um **plano rolável**: ela rola para
  acomodar o conteúdo, de modo que todo nó — nascido do código pela cadeia determinística (FR-015)
  ou arrastado até a beirada — permaneça **alcançável**, sem depender de zoom, de pan por arraste ou
  de ajustar à tela, que são de `area-de-trabalho`. Sem isso, um documento no envelope declarado
  (400 nós) nasceria com nós fora de alcance. Rolar é estado de vista: NÃO PODE aparecer no código
  (FR-008) nem mover elemento nenhum (FR-009).
- **FR-008**: A posição de um nó — e qualquer outro estado de sessão, como zoom, seleção e foco — NÃO
  PODE aparecer no código. Mover elementos DEVE deixar o código byte-idêntico.
- **FR-009**: Nenhuma operação desta spec — criar, mover, digitar no código, inclusive apagar uma
  linha — PODE reposicionar os elementos preexistentes do diagrama.
- **FR-010**: A pessoa DEVE conseguir copiar o código inteiro com um único gesto, sem selecionar
  texto à mão, e DEVE receber retorno visível do resultado desse gesto — inclusive quando a cópia não
  puder ser concluída. O gesto é **um clique num botão de copiar visível e permanente na área do
  código**, e o retorno — copiou ou não copiou — aparece nele mesmo, onde ela acabou de clicar. Um
  atalho de teclado para copiar é de `ciclo-por-teclado`, de outra spec.
- **FR-011**: O código copiado DEVE ser aceito por um mermaid de fora do produto e DEVE desenhar o
  mesmo diagrama que estava visível na área do diagrama. A equivalência de desenho é prometida sobre
  o **vocabulário desta spec**: quando a pessoa deixa no texto uma linha que o produto não lê
  (FR-005) mas o mermaid de fora entende, o desenho de fora pode trazer mais do que estava visível —
  e o texto dela permanece, porque é dela (FR-017). O que NÃO PODE acontecer é a divergência no que o
  produto lê: todo nó materializado DEVE aparecer lá fora, **uma vez só** e com o **mesmo rótulo**.
- **FR-012**: Toda mutação do modelo DEVE ser um ato único e íntegro; uma rajada de digitação DEVE
  contar como um ato só, não como um ato por tecla. *(Restrição transversal `R-09`, herdada por toda
  spec que muta o modelo. O desfazer visível é de outra spec.)*
- **FR-013**: O nó criado nesta spec DEVE nascer neutro, sem herdar nada de um nó anterior. O
  rótulo padrão DEVE ser neutro e **numerado na sessão** ("Nó 1", "Nó 2"…), de modo que dois nós
  recém-criados sejam distinguíveis nas duas vistas sem que ninguém precise renomeá-los. O número do
  rótulo DEVE ser **o mesmo número do identificador** (FR-016): o nó que nasce `n3` nasce "Nó 3" —
  um contador só para as duas vistas, de modo que a pessoa ache a linha a partir da caixa sem
  procurar. Como o contador pula valores já ocupados no texto dela, a numeração dos rótulos PODE ter
  buracos, e isso é aceitável. O produto NÃO promete rótulo único: o rótulo é texto, e texto é dela
  (FR-017) — a unicidade é do identificador (FR-016).
- **FR-014**: O produto NUNCA PODE ser a causa da invalidez do código que o gesto de copiar entrega: a
  saída DEVE ser um documento sintaticamente válido sempre que o texto da pessoa também o for,
  inclusive com zero nós — nesse caso é a declaração do tipo sozinha. Quando ela deixa no editor um
  trecho que o produto não lê (FR-005) e que o mermaid de fora recusa, esse trecho **viaja na cópia
  assim mesmo**: a cópia NUNCA PODE remover texto dela para salvar a própria promessa (FR-017), e a
  invalidez daí decorrente é dela, não do produto. Quando o texto da pessoa não traz a declaração do
  tipo, a cópia a acrescenta na saída; quando traz a declaração de **outro tipo** — linha que a
  leitura reconhece e descarta (FR-005) —, a cópia a **substitui** pela declaração do tipo
  corrente na saída, para que o documento entregue não carregue duas declarações. Acrescentada ou
  substituída, a declaração que sai é a mesma da FR-019, `flowchart TD` — a saída nunca depende de
  orientação implícita. Em ambos os casos o
  texto no editor permanece como ela o deixou (FR-017, FR-019) — o produto NÃO PODE reescrever o
  cabeçalho no editor por conta própria. "Código vazio" não é saída aceitável do gesto de copiar, do
  mesmo modo que "nada" não é saída aceitável da leitura (FR-005).
- **FR-015**: O nó materializado a partir do código, sem posição escolhida pela pessoa, DEVE nascer
  por **colocação local determinística** — ancorado no elemento anterior na ordem do código, em
  espaço livre próximo — sem mover nenhum elemento preexistente (FR-009). Quando **não há elemento
  anterior** — o primeiro nó do documento, numa sessão recém-aberta ou num texto reescrito do zero —
  a âncora é a **origem fixa da área do diagrama**: um ponto constante, que NÃO PODE depender do
  tamanho da janela nem de nada da sessão. O mesmo código DEVE produzir sempre as mesmas posições,
  **em qualquer tela**: se o tamanho da área entrasse na conta, redimensionar a janela moveria nós
  preexistentes (FR-009) e o mesmo documento desenharia diferente em duas máquinas.
  Rearranjar o diagrama inteiro nunca é efeito de uma edição.
  O arranjo da sessão DEVE **lembrar por identificador** a posição que a pessoa escolheu: quando um
  identificador que já foi arrastado nesta sessão reaparece no texto — porque ela moveu a linha de
  lugar, recortou e colou, ou a reescreveu —, o nó renasce **onde ela o havia deixado**, e não na
  colocação determinística. A identidade não volta — é nó novo (FR-016) —, o conforto volta
  (FR-007): reordenar linhas é gesto de editor, não pedido de rearranjo. Renomear **transfere** a
  lembrança: quando a pessoa troca o identificador de um nó (FR-018), a posição passa a ser lembrada
  pelo identificador novo, e o antigo a perde. E a posição lembrada só é devolvida quando o lugar
  está **livre**: se outro nó já o ocupa, vale a colocação determinística — o produto NUNCA PODE
  empilhar duas caixas no mesmo ponto por conta própria. Essa memória vive na sessão e NUNCA é
  projetada no código (FR-008).
- **FR-016**: O identificador é a **chave** do nó no código: duas linhas com o mesmo identificador
  descrevem **um nó só**, e a última declaração de rótulo no texto é a que prevalece — o produto
  NUNCA PODE desenhar duas caixas para um mesmo identificador, sob pena de divergir do mermaid de
  fora (FR-011). Nada que o produto escreva PODE introduzir identificador repetido. A identidade do nó é
  independente do texto do rótulo: reescrever o rótulo de um nó não o transforma em outro nó — e
  também é independente do identificador escrito no código (FR-018). O identificador que o nó criado
  por gesto recebe no código DEVE ser **opaco e sequencial** (`n1`, `n2`…) e NÃO PODE ser derivado do
  rótulo nem mudar quando o rótulo é reescrito — editar um rótulo nunca reescreve o identificador da
  linha. A sequência vem de um **contador monotônico da sessão**, que NUNCA reusa um identificador já
  emitido — nem depois que a linha correspondente é apagada — e que **avança até um valor livre**
  quando o próximo já está ocupado no texto da pessoa.
- **FR-017**: O texto do código é da pessoa. Quando um gesto na área do diagrama escreve no código, a
  escrita DEVE ser **cirúrgica**: só as linhas do elemento afetado mudam, e todo o resto do texto —
  ordem, espaçamento, quebras e os trechos que o produto não lê (FR-005) — permanece byte-idêntico ao
  que ela escreveu. Reescrever o documento inteiro numa forma canônica não é comportamento aceitável:
  criar um nó nunca PODE apagar o que a pessoa digitou, do mesmo modo que digitar nunca apaga um
  elemento já materializado (FR-004). A linha de um nó criado por gesto DEVE ser acrescentada **no
  fim do documento** — seja lá o que houver lá, inclusive trecho que o produto não lê —, de modo que
  nenhuma linha acima dela mude de conteúdo ou de posição e a ordem do código acompanhe a ordem de
  criação.
- **FR-018**: A identidade do nó DEVE sobreviver à edição do identificador dele no código. Enquanto a
  pessoa edita a linha de um nó — inclusive nos estados intermediários em que o identificador está
  incompleto ou ausente — ele permanece **o mesmo nó**: não pisca, não é recriado, e a posição que ela
  escolheu para ele permanece (FR-009). Trocar o identificador é **renomear**, nunca substituir. Só
  desaparece da área do diagrama o nó cuja linha a pessoa de fato removeu (FR-004). O rótulo exibido
  na caixa DEVE acompanhar a linha **letra por letra** nesses estados: a leitura recupera o texto do
  rótulo **sem exigir o delimitador de fecho** — nem o colchete, nem a aspa —, de modo que a caixa
  nunca congela esperando a linha ficar completa nem exibe a sintaxe crua do código.
- **FR-019**: A sessão DEVE nascer com a declaração do tipo já no editor — **semeada uma única vez**,
  na abertura, de modo que o código exibido seja um documento válido desde antes do primeiro nó. A
  declaração é, ao pé da letra, `flowchart TD`: o tipo corrente mais uma **orientação explícita**, de
  modo que o documento de zero nós — que é essa linha sozinha — valha por si mesmo lá fora (SC-001),
  sem depender do default do renderizador. A orientação é **constante do produto** nesta spec: a
  pessoa não a escolhe nem a troca, o que é de `layout-automatico`. A
  partir daí o texto é dela (FR-017): se a pessoa apagar a declaração, o produto NÃO PODE recolocá-la
  no editor — nem por conta própria, nem quando um gesto na área do diagrama escreve no código. A
  única saída que a acrescenta é a do gesto de copiar (FR-014).

### Key Entities

- **Modelo** — a única verdade do diagrama: quais nós existem e como se identificam. O diagrama
  visível e o código são vistas dele, nunca duas verdades a acertar entre si.
- **Nó** — o elemento que esta spec materializa. Tem identidade — única, estável e independente tanto
  do texto do rótulo quanto do identificador escrito no código (FR-016, FR-018) — e um rótulo, que
  nasce carregando o número do próprio identificador (FR-013) e daí em diante é texto dela; tudo o mais (shape, estilo, conexões, agrupamento) é de outras
  specs.
- **Código mermaid** — a projeção do modelo em texto. É o produto final que se leva embora, e só
  carrega o que é durável. O texto é da pessoa: o produto escreve nele cirurgicamente (FR-017), nunca
  o reescreve inteiro. O que a cópia entrega é esse mesmo texto, diferindo dele **apenas na
  declaração do tipo** — acrescentada ou substituída para que o documento seja válido lá fora
  (FR-014).
- **Arranjo (posição)** — onde cada nó está na área do diagrama. É conforto de sessão: vive na
  sessão e nunca é projetado no código. Vem do gesto da pessoa quando ela cria ou arrasta o nó, e da
  colocação local determinística (FR-015) quando o nó nasce do código. Guarda **por identificador** a
  última posição que ela escolheu e a devolve quando esse identificador reaparece no texto (FR-015),
  de modo que reordenar linhas não faça nada pular.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** dos códigos copiados são aceitos por um mermaid de fora do produto e desenham
  o mesmo diagrama que estava visível — sobre um corpus de referência de Flowchart **restrito ao
  vocabulário de nó desta spec** (FR-011), que inclui o documento de **zero nós**, o documento cujo
  cabeçalho a pessoa apagou e o documento cujo cabeçalho é de outro tipo, sem tolerância parcial.
  *(NFR-05)*
- **SC-002**: **0 perdas** de elemento real enquanto se digita: percorrendo **todos** os prefixos dos
  documentos de referência — restritos ao vocabulário de nó desta spec —, nenhum elemento já
  materializado desaparece e a leitura do código nunca devolve vazio. Linha que a pessoa leva **para
  fora** desse vocabulário não conta como perda (FR-004): o nó some por ela ter escrito outra coisa,
  e a medida é a volta — reapagado o excedente, o nó reaparece na posição em que ela o deixou
  (**0 saltos**, FR-015). *(NFR-08)*
- **SC-003**: Com um documento no tamanho do envelope declarado (**400 nós**), a resposta a uma tecla
  no editor de código fica em **≤50ms na mediana**. *(NFR-03)*
- **SC-004**: Mover **todos** os nós de um documento deixa o código **byte-idêntico** ao de antes do
  movimento — **0 diferenças** —, e **0 ocorrências** de posição, zoom, seleção ou foco aparecem em
  qualquer código gerado. *(RN-01, R-03)*
- **SC-005**: Em **100%** das criações, das edições e das remoções pelo código, a mudança
  correspondente aparece na outra vista sem gesto adicional, em **≤100ms na mediana** dentro do
  envelope. *(NFR-03)*
- **SC-006**: Copiar o código inteiro custa **1 gesto** e **0 seleções manuais de texto**, e o
  resultado do gesto — sucesso ou falha — é visível em **100%** das tentativas.
- **SC-007**: Uma rajada de digitação de **N teclas** num mesmo rótulo produz **1** ato no modelo,
  não N — para qualquer N. *(R-09)*
- **SC-008**: **0 reposicionamentos** de elemento preexistente após qualquer operação desta spec —
  inclusive quando o identificador de um nó é reescrito no código, tecla a tecla —, e ler o mesmo
  código duas vezes produz posições **idênticas** para os nós nascidos dele — **0 divergências**,
  inclusive em áreas de diagrama de tamanhos diferentes.
  Mover no código a linha de um nó já arrastado devolve o nó à posição exata em que ela o deixou —
  **0 saltos** — e **0 caixas empilhadas** pelo produto ao devolver uma posição lembrada. *(RN-03)*
- **SC-009**: **0 caracteres** do texto fora das linhas do elemento afetado mudam quando um gesto na
  área do diagrama escreve no código — inclusive espaçamento, ordem das linhas e trechos que o
  produto não lê. *(FR-017)*
- **SC-010**: Em **100%** das criações por gesto na área do diagrama, a linha nova fica visível no
  editor, e o cursor de digitação da pessoa não se move: **0 deslocamentos de cursor** e **0 perdas
  de foco** do editor. *(FR-002)*

## Fora de escopo

Recortes conscientes, cada um dono de outra spec do backlog:

- Vocabulário completo de elementos: conexões, agrupamentos, seleção múltipla, duplicar, reconectar,
  copiar e colar elementos (`elementos-grafo-dirigido`, `reconectar-conexao`, `copiar-e-colar`).
- **Excluir nó pelo gesto na área do diagrama** (`elementos-grafo-dirigido`) — no R0 remove-se um nó
  apagando a linha dele no código.
- Shapes, estilo de nó e de conexão (`estilo-de-elementos`, `trocar-em-bloco`) — inclusive **ler** um
  nó escrito com delimitador de shape no código, que aqui é trecho ilegível (FR-005).
- Layout automático, orientação e preservação de posição no rearranjo (`layout-automatico`).
- Desfazer e refazer visíveis (`desfazer-e-refazer`) — a transação existe aqui (FR-012), o gesto não.
- Recuperação do rascunho ao reabrir a aba (`rascunho-da-sessao`).
- Sinalização de erro de sintaxe e marca de expressividade (`codigo-de-entrada`).
- Colar um código pronto de fora como fluxo próprio (`codigo-de-entrada`).
- Os demais quatro tipos de diagrama e a troca de tipo (`tipo-state`, `tipo-class`, `tipo-er`,
  `tipo-sequence`).
- Fluxo por teclado do ciclo principal (`ciclo-por-teclado`) — inclusive um atalho de teclado para o
  gesto de copiar, que no R0 é só o botão (FR-010).
- Redimensionar as áreas, zoom, cursor hand e ajustar à tela (`area-de-trabalho`) — a **rolagem** do
  plano do diagrama fica aqui (FR-007), porque sem ela os nós do envelope nasceriam fora de alcance.
- Aviso de envelope estourado (`aviso-de-envelope`).

## Assumptions

- **Um tipo só, fixo**: o diagrama desta spec é Flowchart, e não há como trocá-lo — escolher o tipo é
  `RF-18`, de outra spec. A declaração que o produto emite carrega uma **orientação constante**
  (`flowchart TD`, FR-019) apenas para que a saída seja válida por si mesma; escolher ou trocar a
  orientação é `RF-16`, de `layout-automatico`.
- **Rótulo do nó**: o nó nasce com um rótulo padrão neutro e numerado na sessão (FR-013) e é
  identificável no código por identificador opaco e sequencial, não pelo texto (FR-016). A edição rica
  de rótulo, inclusive com texto colado de fora, é `RF-02` e fica de fora; esta spec só precisa de
  rótulo o bastante para que a ida e a volta sejam observáveis.
- **Gestos de ponteiro**: criar (duplo-clique no vazio, FR-001), arrastar o nó e copiar (clique no
  botão, FR-010) são gestos de ponteiro. O ciclo por teclado é `RF-10`/`RF-11`, de outra spec.
- **Sessão única e volátil**: fechar a aba perde o trabalho. Persistir o rascunho é `RF-27`/`RF-28`.
- **Área de transferência**: quando o navegador negar ou não oferecer o recurso de cópia, a pessoa é
  avisada de que o código não foi copiado — falhar em silêncio não é opção.
- **Corpus de referência**: os documentos de Flowchart usados para medir SC-001 e SC-002 são os
  mesmos já empregados na evidência que sustenta o NFR-05 e o NFR-08, restritos ao vocabulário desta
  spec.
- **Envelope compartilhado**: o custo por elemento que esta spec introduz consome do envelope de
  densidade do produto (`R-04`); ela mede o próprio consumo, porque é a primeira a gastar dele.
