# Arquitetura — Editor visual de diagramas mermaid

> Fonte da verdade do **como/com-quê** deste produto. O o-quê/por-quê vive em `docs/prd.md`
> (fronteira o-quê/como). A fronteira de donos completa está no bloco de regras do `CLAUDE.md`
> (instalado por `/zion-speckit-install`): constitution = princípios de repo; ADRs = decisões
> pontuais; este documento = estrutura e prosa do Autor + índices derivados; plan = o como por
> feature. As §3 e §4 são **derivadas** — reconciliadas por `/zion-prd-trace`; não as edite à mão.

## 1. Visão geral

<!-- zion:narrativa-avisos:start -->
_(narrativa em dia)_
<!-- zion:narrativa-avisos:end -->

<!-- zion:narrativa:start adrs=ADR-001,ADR-002,ADR-003,ADR-004,ADR-005,ADR-006,ADR-007,ADR-008,ADR-009,ADR-010 -->
O produto roda inteiramente no navegador — sem servidor, sem contas, uma tela só (ADR-001). O que o
organiza não é uma camada, é um dado: **um modelo de domínio próprio, em memória, que é a única
verdade do diagrama** (ADR-003). Canvas e código são vistas dele; nenhum dos dois é dono de nada, e
não há duas verdades a reconciliar.

Esse modelo é **um núcleo comum mais um vocabulário de agregados por família** (ADR-008). O núcleo —
preâmbulo preservado, as duas listas de severidade, tolerância por construção, serializador
normalizador com ponto fixo, ausência de coordenada e a marca de expressividade como propriedade do
modelo — é o mesmo para as três famílias. O que varia por família é a forma do nó e do bloco, e o que
ali é ruído de ordem e o que é gramática: permutar um agregado é inofensivo em grafo dirigido e em
nós estruturados, e reescreve o diagrama em sequência temporal.

Quatro componentes encostam no modelo, cada um por uma via declarada:

- **O codec mermaid** é o único caminho entre texto e modelo, nas duas direções (ADR-006, ADR-008),
  por uma superfície única — `analisar` / `serializar` / `normalizar` — que não sabe de que tipo é o
  documento. Na entrada, a análise devolve **sempre** um modelo, acompanhado de erros (derrubam o
  statement) e avisos (sinalizam sem derrubar). Na saída, serializar é **projetar**: o que é efêmero
  simplesmente não é emitido — é assim, e não por uma limpeza na hora de copiar, que a posição nunca
  viaja no código entregue.
- **A área do diagrama** é um canvas de nós e conexões (React Flow, ADR-002): consome a projeção do
  modelo e devolve gesto como **descritor discreto de mudança**, nunca como escrita direta. Cada tipo
  do escopo cabe nesse vocabulário; Sequence cabe por desenho próprio — participante é um nó da
  altura da lifeline, mensagem é uma aresta horizontal, instante é um handle — dentro da mesma
  engine, não numa segunda.
- **O editor de código** é vista e **produtor de comandos**, nunca dono de um histórico rival
  (ADR-003). A vista de origem de uma mutação não é reescrita a partir do que ela mesma emitiu — é o
  que quebra o eco entre as duas vistas — e o *debounce* existe só no caminho texto → modelo.
- **O rascunho** guarda o modelo e o arranjo — não o código — no armazém do navegador, versionado no
  cabeçalho (ADR-010). É uma sessão, uma chave, sobrescrita, e falha para o lado de não existir:
  rascunho ilegível produz sessão nova com aviso, nunca uma aba que não monta.

A posição, a seleção e os demais efêmeros vivem como **campos do próprio modelo, marcados como
não-serializáveis** — não num segundo store paralelo (ADR-003). Quando os ADR-007, ADR-009 e ADR-010
falam da posição como estando "fora do modelo", o que está fora é a **projeção para o código**, não o
dado: há um store só.

Entre o modelo e a área do diagrama existe um componente que parece detalhe e não é: **a projeção**.
Ela reusa o objeto projetado — de nós e de arestas — quando nada que a vista enxerga mudou, e essa
invariante tem cinco donos: latência dentro do envelope (ADR-004), correção do foco no fluxo por
teclado (ADR-005), custo da tecla no editor de código (ADR-006), as três famílias (ADR-008) e a
transação (ADR-009). É restrição de arquitetura, não otimização a fazer depois. O envelope de
densidade — 400 nós e 500 conexões — é compromisso do produto e não da feature: toda capacidade que
acrescente peso por elemento consome dele (ADR-004).

**Toda mutação do modelo atravessa uma transação, e a transação é a unidade do desfazer** (ADR-009).
Um ato sobre uma seleção de N elementos é uma entrada de histórico e reverte com um só desfazer; uma
rajada de digitação coalesce num ato; o histórico guarda diferença, não cópia; e ele governa as duas
metades do estado — estrutura e arranjo —, porque desfazer só uma delas devolve o que ninguém pediu.
O histórico é da sessão e não acompanha o rascunho: reabrir a aba devolve o diagrama, não o passado
dele (ADR-010).

**O arranjo é a exceção deliberada da topologia.** Ele existe para a vista e para a sessão, nunca
para o código: o motor de layout (dagre, com ELK como o adaptativo — ADR-007) é um serviço chamado
por **gesto explícito**, não uma consequência da edição. Nenhuma edição recalcula o diagrama inteiro;
o elemento novo nasce por colocação local, adjacente a quem o criou; e quando o layout roda, as
posições feitas à mão são reimpostas por cima do que ele calculou.

**O foco do DOM é responsabilidade do produto, não da engine** (ADR-005). O ciclo por teclado é
máquina de estados do produto: quem cria um elemento por teclado assume o dever de colocar o foco
onde a próxima tecla é esperada e de trazer o elemento para a área visível. A engine não move foco,
não conecta por teclado e não sabe onde a pessoa está no ciclo.

Por fim, **o mermaid fica fora do caminho de edição** (ADR-006). Ele não parseia a prévia e não é
fonte de nada: entra como **oráculo** — validador de que o código entregue é mermaid válido. Toda
leitura e escrita do texto é do codec próprio.
<!-- zion:narrativa:end -->

## 2. Integrações externas

_(nenhuma integração externa)_

O produto não consome serviço, não fala protocolo e não publica evento: roda inteiramente no
navegador, sem servidor e sem contas (ADR-001), e recusa colaboração e compartilhamento por escopo.
Os únicos contratos com o mundo de fora são **formatos e APIs da plataforma**, não integrações: o
**código mermaid**, artefato de entrada e produto final que se leva embora, validado contra o
`mermaid` embarcado como oráculo (ADR-006); o **armazém do navegador**, onde o rascunho da sessão
vive (ADR-010); e a **área de transferência**, por onde texto de fora entra num rótulo e o código
gerado sai.

## 3. Decisões estruturantes

<!-- zion:adr-index:start -->
### Sem área
- **[ADR-001 — Framework e stack de UI](adr/ADR-001-framework-e-stack-ui.md)**
  fixou: Adotar **React sobre Vite, com Tailwind CSS e shadcn/ui** como stack de UI.
- **[ADR-002 — Engine de diagrama](adr/ADR-002-engine-de-diagrama.md)**
  fixou: Adotar **React Flow (`@xyflow/react`)** como engine da área do diagrama.
- **[ADR-003 — Modelo interno e propagação bidirecional canvas ↔ código](adr/ADR-003-modelo-interno-e-propagacao-bidirecional.md)**
  fixou: Adotar um **modelo de domínio próprio, agnóstico de vista e lossless, como fonte única em memória**,
- **[ADR-004 — Fluidez em diagrama denso](adr/ADR-004-fluidez-em-diagrama-denso.md)**
  fixou: **A promessa de fluidez se sustenta sobre o desenho já escolhido; ADR-002 e ADR-003 ficam de pé.** O
- **[ADR-005 — Fluxo por teclado no ciclo principal](adr/ADR-005-fluxo-por-teclado.md)**
  fixou: **O ciclo principal por teclado se sustenta sobre a engine e o modelo já escolhidos; ADR-002 e
- **[ADR-006 — Ciclo completo código ↔ modelo](adr/ADR-006-ciclo-completo-codigo-modelo.md)**
  fixou: **O modelo interno é alimentado por um par parser/serializador próprio, tolerante por construção, e o
- **[ADR-007 — Motor de layout automático](adr/ADR-007-motor-de-layout-automatico.md)**
  fixou: **O layout automático é um gesto explícito da pessoa, não uma consequência da edição. Nenhuma edição
- **[ADR-008 — Alcance do modelo interno além do Flowchart](adr/ADR-008-alcance-do-modelo-alem-do-flowchart.md)**
  fixou: **O modelo interno é um núcleo comum mais um vocabulário de agregados por família — não uma forma
- **[ADR-009 — Ato em bloco e histórico de edição](adr/ADR-009-ato-em-bloco-e-historico-de-edicao.md)**
  fixou: **A transação do ADR-003 fica de pé, e o ato em bloco entra no release 1.** O que este ADR fixa são as
- **[ADR-010 — Durabilidade da sessão longa](adr/ADR-010-durabilidade-da-sessao-longa.md)**
  fixou: **A rede de segurança do discovery se sustenta, e a promessa da sessão longa fica de pé.** O que este
<!-- zion:adr-index:end -->

## 4. Visão do backlog

<!-- zion:backlog-view:start -->
- `cano-modelo-codigo` — ☐ pendente
- `elementos-grafo-dirigido` — ☐ pendente
- `area-de-trabalho` — ☐ pendente
- `ciclo-por-teclado` — ☐ pendente
- `desfazer-e-refazer` — ☐ pendente
- `codigo-de-entrada` — ☐ pendente
- `rascunho-da-sessao` — ☐ pendente
- `tipo-state` — ☐ pendente
- `aviso-de-envelope` — ☐ pendente
- `tipo-class` — ☐ pendente
- `tipo-er` — ☐ pendente
- `tipo-sequence` — ☐ pendente
- `teclado-em-sequence` — ☐ pendente
- `estilo-de-elementos` — ☐ pendente
- `trocar-em-bloco` — ☐ pendente
- `layout-automatico` — ☐ pendente
- `repetir-alteracao` — ☐ pendente
- `reconectar-conexao` — ☐ pendente
- `copiar-e-colar` — ☐ pendente
<!-- zion:backlog-view:end -->
