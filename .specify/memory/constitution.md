<!--
SYNC IMPACT REPORT
==================
Versão: TEMPLATE (não ratificado) → 1.0.0
Tipo do bump: MAJOR inicial — primeira ratificação; o arquivo anterior era o template
              intocado do Spec Kit (placeholders `[PRINCIPLE_N_NAME]`), sem princípio algum.

Princípios adicionados (14, todos derivados de docs/PRD.md §5, §7 e §8):
  I.    Ciclo principal por teclado, contado em teclas ......... NFR-01, R-05
  II.   Reconfiguração em ≤3 passos (alvo, não medido) ......... NFR-02
  III.  Envelope de densidade é orçamento ...................... NFR-03, R-04
  IV.   A transação é a unidade do desfazer .................... NFR-04, R-09, RN-04
  V.    O código é projeção fiel, e só do que é durável ........ NFR-05, R-03, RN-01
  VI.   Fidelidade de arranjo fora de agrupamento ............... NFR-06
  VII.  Layout é gesto explícito ................................ R-07, RN-03
  VIII. Rótulo volta byte a byte ou volta marcado .............. NFR-07, RN-02
  IX.   A análise do código sempre devolve um diagrama ......... NFR-08, R-06
  X.    Mermaid fora do caminho de edição (recusa) ............. R-06
  XI.   Sessão longa e rascunho que falha para não existir ..... NFR-09, R-10, RN-05, RN-07
  XII.  Cinco tipos sobre núcleo comum .......................... R-02, R-08
  XIII. Roda no navegador, e o produto final é o código (recusa)  R-01, PRD §4 "não faz"
  XIV.  Nada presumido, nada oferecido sem lastro (recusa) ..... RN-06, RN-08

Seções adicionadas:
  - "Envelope de produto e fronteira de escopo" (SECTION_2)
  - "Fluxo de desenvolvimento e portões" (SECTION_3)

Seções removidas: nenhuma (template preenchido, hierarquia preservada).

Templates e artefatos dependentes:
  ✅ .specify/templates/plan-template.md — "Constitution Check" trocado de placeholder
     genérico por portões concretos com os identificadores dos princípios.
  ✅ .specify/templates/spec-template.md — nenhuma mudança necessária: a spec é o-quê
     (PRD + backlog) e não cita constitution; a linha `**RF cobertos:**` já é exigida
     pelo dever de origem do CLAUDE.md.
  ✅ .specify/templates/tasks-template.md — nenhuma mudança necessária: a categorização
     de tarefas já comporta as tarefas de evidência exigidas pelo portão do plan.
  ✅ .specify/templates/checklist-template.md — nenhuma mudança necessária.
  ✅ .claude/skills/speckit-*/SKILL.md — verificados: nenhuma referência de agente
     desatualizada; a única ocorrência de "CLAUDE-only" é a instrução genérica do
     próprio speckit-constitution.
  ✅ CLAUDE.md — a fronteira de donos (constitution × ADR × architecture × plan) já está
     declarada no bloco versionado e é coerente com a Governança abaixo.
  ⚠  README.md / docs/quickstart.md — inexistentes no repo; nada a propagar.

TODOs adiados: nenhum. Nenhum token entre colchetes permanece no documento.
-->

# Constituição do Editor Visual de Diagramas Mermaid

Este documento vale para o repositório inteiro. Cada princípio abaixo nasce de um NFR da §7, de uma
restrição da §8 ou de uma regra invariável da §5 da `docs/PRD.md`, e carrega no próprio texto o
critério que decide, olhando um pull request, se ele foi cumprido ou violado. Princípio sem critério
decidível não é princípio: é reescrito até virar um.

## Core Principles

### I. Ciclo principal por teclado, contado em teclas (NFR-01, R-05)

O ciclo principal — criar caixa → rotular → conectar → rotular a conexão — DEVE completar em **≤4
teclas de controle por elemento e 0 alternâncias para o mouse**.

**Critério de aceite:** existe um teste de ponta a ponta que executa o ciclo sobre **≥9 elementos**
consecutivos instrumentando o input, e falha se a contagem de teclas de controle por elemento passar
de 4 ou se registrar **qualquer** evento de ponteiro. Toda feature que introduza um passo novo no
ciclo acrescenta o seu caso a esse teste no mesmo PR. Quem cria elemento por teclado assume dois
deveres verificados no mesmo teste: (a) o foco fica onde a próxima tecla é esperada — asserção sobre
o elemento focado logo após a criação; (b) o elemento recém-criado está dentro da área visível —
asserção de viewport. PR que crie elemento por teclado sem essas duas asserções viola este princípio,
mesmo que a contagem de teclas passe.

*Base: medida em ADR-005 — 4 teclas de controle e 0 eventos de ponteiro em 9 elementos.*

### II. Reconfiguração em ≤3 passos — alvo declarado, não medido (NFR-02)

Trocar o tipo, o shape ou o estilo de um elemento já criado, ou de uma seleção inteira, DEVE
completar em **≤3 passos a partir do elemento já selecionado**, e o número de passos NÃO PODE crescer
com o tamanho da seleção: 3 passos para 1 elemento e 3 passos para 400.

**Critério de aceite:** teste de interação que, partindo do elemento selecionado, conta os passos até
o efeito aplicado, executado para |seleção| ∈ {1, 400}; falha em 4 passos ou mais, ou se as duas
contagens divergirem.

**Honestidade da barra:** o NFR-02 é **alvo declarado — nenhum ADR o mediu**. Diferente dos demais
números desta constituição, ele é compromisso e não evidência. A primeira feature que tocar
reconfiguração de elemento DEVE produzir a medição e registrá-la no `plan.md` da feature; até que
isso aconteça, uma violação deste princípio é discutível contra o alvo, não contra um spike.

### III. O envelope de densidade é orçamento, e todo peso por elemento o consome (NFR-03, R-04)

O envelope de densidade suportado é **400 nós e 500 conexões**. Dentro dele: edição pontual **≤100ms
na mediana**, tecla no editor de código **≤50ms na mediana**, gesto contínuo **≥50fps**.

**Critério de aceite:** toda feature que acrescente peso por elemento — estado por nó, trabalho por
conexão na projeção, nó de render adicional — DEVE declarar no `plan.md` o custo unitário que
acrescenta e apresentar, no PR, os três números medidos no envelope cheio. PR sem os números medidos
não passa; PR com número fora de qualquer um dos três limiares não passa sem que o `plan.md` registre
a violação em Complexity Tracking e o Autor a aceite explicitamente.

**Invariante de reuso:** a projeção do modelo para a vista DEVE reusar os objetos de vista dos
elementos que não mudaram. Verificação automatizável: teste que projeta duas vezes alterando um único
elemento e assere **identidade referencial** dos objetos de vista dos demais. Dela dependem, juntos,
a fluidez, o fluxo por teclado (I) e a entrada por texto (IX) — quebrá-la derruba os três, então o
teste de reuso é portão, não conveniência.

*Base: medida em ADR-004 e ADR-008.*

### IV. Toda mutação é transação, e a transação é a unidade do desfazer (NFR-04, R-09, RN-04)

Nenhum caminho de código altera o modelo fora de uma transação. Um ato aplicado a uma seleção é **uma
entrada de histórico** e reverte com **um só desfazer**, seja qual for o tamanho da seleção. Uma
rajada de digitação é um ato só. O arranjo entra no histórico junto com a estrutura.

**Critério de aceite:** teste que aplica um ato à seleção inteira do envelope (400 elementos) e
assere (a) o histórico cresce em **exatamente 1** entrada; (b) **um** desfazer restaura estado
idêntico ao anterior, comparado por igualdade estrutural do modelo; (c) **p95 ≤110ms** em ≥100
repetições. Teste complementar: N teclas seguidas num rótulo produzem 1 entrada de histórico, não N;
mover um nó produz uma entrada desfazível. PR que introduza escrita direta no modelo sem transação —
detectável por checagem de fronteira de módulo — é rejeitado.

*Base: medida em ADR-009 — 96,2ms de mediana e 107,7ms de p95.*

### V. O código é projeção fiel do modelo, e só do que é durável (NFR-05, R-03, RN-01)

Diagrama e código são duas vistas do mesmo modelo, e o código é projeção dele: **100% dos códigos
copiados são aceitos pelo validador do mermaid e desenham o mesmo diagrama que está visível**. O que
é efêmero **não** é projetado — e a posição de um elemento é efêmera: ela vive na sessão e nunca
viaja no código entregue.

**Critério de aceite:** (a) suíte de round-trip sobre o corpus de referência de **≥30 documentos**
cobrindo os cinco tipos, em que cada documento é projetado, submetido ao validador do mermaid e
comparado ao diagrama visível — 30/30 ou reprova, sem tolerância parcial; (b) teste que move **todos**
os nós de um documento e assere que o código gerado é **byte-idêntico** ao de antes do movimento.
Qualquer campo de posição, zoom, seleção ou foco encontrado na saída do projetor viola este
princípio.

*Base: medida em ADR-006 e ADR-008 — 30 de 30 documentos.*

### VI. Fidelidade de arranjo fora de agrupamento; dentro dele, divergência declarada (NFR-06)

Fora de agrupamento: **0 pares fora de ordem de leitura** entre o diagrama visível e o desenhado a
partir do código, nas **4 orientações**. Dentro de agrupamento a divergência é **declarada à pessoa,
não corrigida** — a referência medida é de 35% dos pares fora de ordem.

**Critério de aceite:** teste comparativo que percorre o corpus de referência nas 4 orientações e
falha com 1 par fora de ordem fora de agrupamento. Dentro de agrupamento, o teste verifica a
**presença da declaração na interface** (RF-17), não a ordem. PR que "conserte" silenciosamente a
ordem dentro de agrupamento, ou que remova a declaração, viola este princípio tanto quanto um par
fora de ordem fora dele.

*Base: medida em ADR-007.*

### VII. Organizar é gesto explícito da pessoa (R-07, RN-03)

Nenhuma edição dispara o rearranjo do diagrama inteiro. O elemento novo nasce por **colocação local,
sem mover os demais**. A posição feita à mão **sobrevive** quando o layout é acionado.

**Critério de aceite:** para **cada** operação do repertório de edição — criar, rotular, conectar,
reconectar, duplicar, colar, excluir, trocar estilo, desfazer, refazer, digitar no editor de código —
existe teste que assere que a posição de **todos** os elementos preexistentes é idêntica antes e
depois. Uma operação nova entra no repertório com o seu caso no mesmo PR. Teste complementar: mover
elementos à mão, acionar o layout e asserir que a posição desses elementos permaneceu; layout que os
reposicione reprova.

### VIII. O rótulo volta byte a byte, ou volta marcado (NFR-07, RN-02)

**100%** dos textos de rótulo voltam byte a byte como foram escritos, ou voltam **marcados**; **0**
alterações em silêncio.

**Critério de aceite:** corpus de textos hostis — acentuação, aspas, quebras, caracteres de escape do
mermaid, emoji — com **≥26 textos por família**, submetido ao round-trip modelo → código → modelo.
Cada texto DEVE terminar em um de dois estados: byte-idêntico, ou divergente **e** portando a marca
visível de que o tipo corrente não o expressa fielmente (RF-22). Truncamento, normalização Unicode,
escape irreversível ou substituição sem marca reprovam o PR. Texto trazido de fora entra pelo rótulo
como texto puro e para aí: nenhum texto colado vira estrutura.

*Base: medida em ADR-006 e ADR-008 — 26 de 26 por família.*

### IX. A análise do código sempre devolve um diagrama, nunca "nada" (NFR-08, R-06)

**0 perdas de elemento real** enquanto se digita no editor de código. Código incompleto é estado
normal de digitação, não erro. A análise separa **o que derruba um trecho** do que **apenas avisa**.

**Critério de aceite:** teste de prefixos — para **todos** os prefixos dos documentos de referência
(≥757 prefixos medidos), nenhum elemento já materializado desaparece da prévia, e a análise nunca
retorna vazio. Um parser de braço estrito, que descarta o documento inteiro ao primeiro erro, reprova
por construção (o braço estrito perdeu 70 elementos onde o tolerante perdeu 0). A classificação
erro-que-derruba × aviso DEVE ser asserida por teste, não apenas exibida.

*Base: medida em ADR-006 — 0 perdas em 757 prefixos, contra 70 perdas no braço estrito.*

### X. RECUSA — o mermaid não entra no caminho de edição (R-06)

O mermaid entra **só como validador do que é entregue**. Ele não participa de criar, mover, rotular,
conectar, desfazer nem projetar.

**Critério de aceite:** checagem automatizada de fronteira de importação — nenhum módulo do caminho
de edição (modelo, transações, projeção, canvas, teclado, histórico, rascunho) importa direta ou
transitivamente a biblioteca do mermaid. A dependência é permitida exclusivamente na fronteira de
validação/prévia, declarada em lista explícita. PR que introduza a importação fora dessa lista é
rejeitado; ampliar a lista exige ADR novo, não revisão de código.

### XI. A sessão longa não degrada, e o rascunho falha para o lado de não existir (NFR-09, R-10, RN-05, RN-07)

Depois de **600 atos** seguidos, a latência do gesto não cresce mais que **1,2×**. O rascunho guarda
**o diagrama e o arranjo — nunca o código, nunca o histórico**; é **uma sessão, uma chave,
sobrescrita**, versionada no cabeçalho. Reabrir a aba devolve o diagrama, não o passado dele.

**Critério de aceite:** (a) teste de resistência de 600 atos que compara a latência mediana do gesto
nos primeiros e nos últimos 100 atos e falha em razão >1,2×; (b) teste de recuperação que restaura
documentos nas **3 famílias** e assere igualdade estrutural do diagrama e do arranjo; (c) teste de
degradação: rascunho ausente, truncado, ilegível ou de versão de cabeçalho desconhecida DEVE produzir
**sessão nova com aviso**, com 0 falhas de montagem da aplicação — uma aba que não monta é falha
crítica, não caso de borda; (d) teste que assere que o payload persistido **não contém** código
mermaid nem entradas de histórico, e que gravar duas vezes deixa **uma** chave.

*Base: medida em ADR-010 — 1,1× e 103 de 103 checagens.*

### XII. Cinco tipos, núcleo comum, vocabulário por família (R-02, R-08)

O escopo é congelado em **cinco tipos**: Flowchart, Class, State, Sequence e ER. A área do diagrama é
um canvas de nós e conexões editável, e cada tipo cabe nesse vocabulário. Os tipos avançam por
**família de modelo mental** sobre um núcleo comum. A ordenação dos elementos é **semântica em
Sequence** e **arranjo nas demais**. Sequence exige desenho próprio na área do diagrama.

**Critério de aceite:** (a) teste de enumeração que falha se o seletor de tipo expuser qualquer tipo
fora dos cinco — gantt, mindmap, journey, gitgraph, C4, timeline, pie e afins estão fora; (b) todo
gesto de edição do repertório tem caso de teste nos **cinco** tipos; (c) checagem de fronteira: o
núcleo comum não referencia nomes de família — vocabulário específico vive no módulo da família, e um
`grep` do nome da família no núcleo reprova; (d) em Sequence, teste que assere que reordenar a posição
na tela **não** reordena o código, e que reordenar semanticamente **reordena**.

### XIII. RECUSA — roda inteiramente no navegador, e o produto final é o código (R-01, PRD §4)

Sem servidor, sem contas, sem colaboração, sem compartilhamento — e **sem exportar imagem**: nem PNG,
nem SVG, nem qualquer formato de imagem. O artefato que se leva embora é o código mermaid.

**Critério de aceite:** (a) o build produz artefato estático servível sem backend; (b) teste que
executa o ciclo principal com a rede desabilitada e falha diante de **qualquer** requisição de rede
em runtime além do próprio bundle — `fetch`, XHR, WebSocket ou EventSource; (c) checagem que reprova
o PR se aparecer no código de produção qualquer caminho de download de imagem (`toDataURL`,
`toBlob`, serialização de SVG para download) ou qualquer módulo de autenticação, sessão remota ou
sincronização. Cada uma dessas capacidades é recusa consciente da §4 da PRD: reintroduzi-la exige ADR
novo e emenda desta constituição, nunca uma decisão de PR.

### XIV. RECUSA — nada presumido, nada oferecido sem lastro no código (RN-06, RN-08)

O elemento novo **nasce neutro**, sem herdar tipo ou estilo do anterior. **Não existe controle de
estilo onde o tipo de diagrama corrente não expressa aquele estilo em código.**

**Critério de aceite:** (a) teste que estiliza um elemento, cria o seguinte e assere que o novo carrega
os valores padrão — herança silenciosa reprova; (b) **matriz tipo × controle de estilo**: para cada
par (tipo, controle) exposto na interface existe um teste que aplica o controle e **encontra o efeito
no código gerado** daquele tipo. Controle exposto sem entrada aprovada na matriz é violação — a
regra é "existe no código, então existe na interface", nunca o contrário; controle cinza, desabilitado
ou sem efeito é a mesma violação com outra roupa.

## Envelope de produto e fronteira de escopo

**Envelope de densidade** — 400 nós e 500 conexões é compromisso de produto, não meta de engenharia.
Toda capacidade nova consome dele (Princípio III). Ultrapassá-lo em uso avisa a pessoa (RF-29); nunca
segue como se nada fosse.

**Escopo congelado** — cinco tipos (Flowchart, Class, State, Sequence, ER) e as recusas da §4 da PRD:
sem repositório de diagramas, sem posição de nó no código entregue, sem estilo que não vira código,
sem exportação de imagem, sem texto virando estrutura, sem presumir a próxima escolha, sem outros
tipos de mermaid, sem colaboração, sem acessibilidade (o fluxo por teclado permanece no escopo como
eficiência de operação, não como acessibilidade).

**Fronteira de donos** — esta constituição governa princípios de repositório inteiro com critério
verificável. Ela **não** decide tecnologia: biblioteca, framework e desenho de módulo vivem no
`plan.md` da feature; decisões pontuais de repositório inteiro vivem em `docs/adr/`; a topologia e os
contratos do produto vivem em `docs/architecture.md`. Um princípio que só faz sentido para uma
feature está no lugar errado e DEVE migrar para o `plan.md` dela.

## Fluxo de desenvolvimento e portões

**Portão do plano** — todo `plan.md` preenche a seção Constitution Check nomeando os princípios que a
feature toca e, para cada um, a evidência que o PR apresentará. Feature que toque o Princípio III
declara o custo por elemento que acrescenta. Violação aceita conscientemente vai para Complexity
Tracking com justificativa e alternativa recusada — nunca fica implícita.

**Portão do PR** — o critério de cada princípio tocado é uma checagem executável (teste, benchmark,
validador ou checagem de fronteira) que roda em CI. Critério que só existe como prosa no PR não
conta; "verifiquei manualmente" não fecha portão.

**Dever de origem** — toda spec carrega a linha `**RF cobertos:** RF-xx`, conforme o `CLAUDE.md`.
Spec intraçável é acusada por `/zion-prd-trace`, que é o ritual de fim de spec.

**Barra honesta** — princípio cuja base é alvo e não medição declara isso no próprio texto
(hoje: apenas o Princípio II). A primeira feature que o toca produz a medição e a registra. Fingir
evidência que não existe é violação de governança, não descuido de redação.

## Governance

Esta constituição **supera** qualquer prática, convenção ou preferência do repositório. Onde ela
conflitar com um `plan.md`, uma spec ou um hábito de código, ela vence — ou é emendada.

**Emenda** — exige (a) o identificador do NFR, restrição ou regra invariável de origem, ou a
alteração correspondente na `docs/PRD.md`; (b) o critério verificável no texto do princípio; (c)
quando a emenda reverte uma decisão estruturante, o ADR de supersessão em `docs/adr/`, roteado por
`/zion-prd-evolve`. Recusa da §4 da PRD só se reabre por ADR novo — nunca em revisão de código.

**Versionamento** — MAJOR para remoção ou redefinição incompatível de princípio, e para reabertura de
recusa; MINOR para princípio novo ou ampliação material de critério; PATCH para redação, correção de
referência e refinamento que não mova barra.

**Conformidade** — toda revisão de PR verifica os princípios tocados contra os seus critérios. Um
critério que não consegue distinguir sim de não é defeito da constituição: reescreva-o no mesmo PR
que o expôs. Guia de execução em `CLAUDE.md`; canon de produto em `docs/PRD.md`, `docs/adr/`,
`docs/backlog.md` e `docs/architecture.md`.

**Version**: 1.0.0 | **Ratified**: 2026-07-20 | **Last Amended**: 2026-07-20
