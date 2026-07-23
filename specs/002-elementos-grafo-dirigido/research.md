# Research — Elementos do grafo dirigido (R1)

Nenhum `NEEDS CLARIFICATION` permanece: a spec já está clarificada (37 perguntas resolvidas) e os ADRs
fecham as decisões estruturantes. O que este documento resolve é o **como de feature** que a constituição
delega ao `plan.md` e as **cinco costuras** que o prompt de plan cobra. Formato: Decisão · Racional ·
Alternativas.

Onde a semântica do grafo dirigido decide — pertencimento, aninhamento, desempate de dupla-menção —, a
spec manda **medir no mermaid de fora, não inventar** (`FR-019`, `SC-001`). Este plano **mediu**: os
resultados do `mermaid@11.16.0` estão em [§0](#0-medições-no-oráculo-o-que-o-mermaid-de-fora-faz) e
fundamentam cada decisão. A prova permanente é o **corpus do oráculo** (`corpus/*.mmd` + `oraculo.spec.ts`),
estendido por esta feature; as sondagens que produziram §0 foram descartadas.

---

## 0. Medições no oráculo (o que o mermaid de fora faz)

Renderizei sete formas no `mermaid.render` real e li a estrutura de clusters/nós resultante. Fatos que
fundamentam §2–§5:

| # | Forma | Resultado medido | Consequência |
|---|---|---|---|
| M1 | `subgraph sub1[…]` com `n1` (nó declarado fora) mencionado dentro | `n1` vira **membro** de sub1 | pertencimento de **nó** por **menção isolada** — o que o produto escreve (`FR-017`) |
| M2 | `subgraph { x --> y }` (aresta escrita dentro do bloco) | `x` e `y` viram **membros** | pertencimento por **ponta de aresta no bloco** (`FR-019`) |
| M3 | `subOuter` mencionando o **id de `subInner`** vs. aninhamento **léxico** | **idênticos** — subOuter envolve subInner nos dois; nenhum nó `subInner` degenerado | **aninhamento por menção** funciona → agrupar aninha **sem realocar** (`FR-014`/`SC-009`) |
| M4 | `n1` mencionado em **dois** blocos (subA antes, subB depois) | subA fica com `n1`; **subB degenera em nó** | desempate: **o primeiro bloco vence**; o perdedor sem membro exclusivo vira nó (`FR-019`) |
| M5 | `subgraph vazio end` (sem membros) | mermaid **colapsa em um nó** rotulado | bloco vazio à mão **existe**, é preservado no texto e exibido; **0 membros** (`FR-019`) |
| M6 | `a -->|passo| b` (rótulo inline) | aresta com label `passo` | forma que o produto **escreve** para o texto de conexão (`FR-004`) |

Método: página de teste importando `mermaid` (fora do runtime, Princípio X), `render` + leitura da
geometria dos clusters. Os arquivos de sondagem foram removidos; o que fica é o **corpus do SC-001** que
transforma M1–M6 em portão de CI.

---

## 1. Onde vive o vocabulário: agregado no núcleo, gramática na família (ADR-008) — costura 1

**Decisão.** `Conexao` e `Agrupamento` entram como **slots de agregado do `Modelo`** (`conexoes[]`,
`agrupamentos[]`), ao lado de `nos[]`, no `src/modelo/modelo.ts` — exatamente onde o `No` já vive e onde
o data-model do R0 já **anteviu** esses slots ("o núcleo do codec também comporta conexoes, grupos…; a
costura existe, o vocabulário não"). Toda a **gramática** do grafo dirigido — como uma aresta e um bloco
se **leem** e se **escrevem**, e o que ali é **ruído de ordem** — vive em `codec/flowchart/` (conexao.ts,
agrupamento.ts). O **núcleo do codec** (`analisar`/`serializar`/`reconhecedores`) itera slots e delega
ao registro; ganha apenas a mecânica **agnóstica de família** de pilha de container (§2), e **nunca**
soletra `-->` nem `subgraph` (checagem do Princípio XII: `grep` de nome de família no núcleo reprova).

**Racional.** É a leitura de ADR-008 coerente com o código do R0: a **forma dos dados** (id, texto,
membros) é o núcleo comum que as três famílias compartilham — a própria narrativa (`architecture.md §1`)
diz que participante/mensagem de Sequence também são nó/aresta; o que **varia por família** é a
**gramática** (a forma do nó e do bloco) e **o que é ruído de ordem e o que é gramática**. Isolar a
gramática em `flowchart/` — e não os tipos de dado — é o corte que deixa `tipo-state`/`tipo-class`/… 
reporem o seu vocabulário **sem tocar no núcleo**, que é o teste de "isolável, sem contaminar o núcleo".
Para o R1, com uma família só, `normalizar` (o juiz do round-trip) trata a permutação de conexões e
agrupamentos como **ruído de ordem** (ordena por id) — em grafo dirigido permutar um agregado é
inofensivo; a família **Sequence** é que vai sobrescrever isso ("ordem é gramática"), e o ponto de
sobrescrita é o próprio `normalizar` por família (costura preparada, não construída aqui).

**Alternativas.** Mover `Conexao`/`Agrupamento` inteiros para dentro de `flowchart/` (tipos de dado por
família) — descartado: quebra o `Modelo` como núcleo comum, força o store, a transação e a projeção a
falarem de tipos de família, e contradiz a narrativa (nó/aresta são comuns às três famílias). O corte
por **gramática**, não por **dado**, é o que ADR-008 pede.

---

## 2. Ler o bloco: pilha de container agnóstica no núcleo (ADR-006/008, FR-019) — costura 2 (leitura)

**Decisão.** O `analisar` do R0 lê linha a linha, statement a statement, cada reconhecedor tentando **um**
statement. O agrupamento é um **bloco multi-linha** (`subgraph … end`), com aninhamento. Em vez de
ensinar o núcleo as palavras `subgraph`/`end`, o núcleo ganha uma **pilha de container** no `Ctx`:

```ts
interface Ctx {
  /* … R0 … */
  containerStack: string[]                 // ids dos agrupamentos abertos (topo = mais interno)
  abrirContainer(id: string): void         // um reconhecedor de família chama ao abrir um bloco
  fecharContainer(): void                  // …e ao fechar
  registrarMembro(id: string): void        // materializar um elemento com a pilha não-vazia → membro do topo
}
```

O **reconhecedor de `subgraph …`** (família) casa a abertura, cria/garante o `Agrupamento` e chama
`abrirContainer(id)`; o **reconhecedor de `end`** (família) chama `fecharContainer()`. Quando **qualquer**
reconhecedor materializa um nó, uma aresta (as duas pontas) ou um agrupamento com a pilha não-vazia, o
núcleo registra o pertencimento no **topo** da pilha (`FR-019`: *qualquer menção* dentro do bloco cria
pertencimento — menção isolada **e** ponta de aresta, medições **M1/M2**). O núcleo não sabe que o
container é um `subgraph`; sabe que **há uma pilha e que membros pegam o topo**.

**Aninhamento por menção (M3).** Medido: mencionar o **id de um agrupamento** dentro de outro bloco
**aninha** (idêntico ao aninhamento léxico). Logo o registro de membro do topo trata **agrupamento-filho**
igual a nó-membro: o id no topo da pilha vira membro, seja ele nó ou agrupamento. Isso é o que sustenta
a escrita cirúrgica de §3.

**Desempate de dupla-menção (M4).** O vínculo é **exclusivo** (um dono no máximo). Medido: **o primeiro
bloco vence**. Na análise, `registrarMembro(id)` **ignora** o registro se `id` já tem dono — o segundo
bloco não rouba o membro. O bloco perdedor que fica **sem nenhum membro** vira um `Agrupamento` de **0
membros** (moldura vazia exibida, §5) — o mermaid degenera em nó, mas o que o `SC-001` mede é
**pertencimento** (n1 ∈ subA nas duas vistas: **0 divergências**), e o código da pessoa **nunca** é
reescrito para tirar a menção perdedora (`FR-019`).

**Tolerância (Princípio IX).** Um `subgraph` ainda **sem `end`** (estado de digitação/prefixo) mantém o
container aberto até o fim do documento — os membros já lidos não somem; a análise nunca devolve vazio.
`end` reservado do mermaid: `end` sozinho fecha container; o produto nunca emite um nó chamado `end`.

**Alternativas.** Dar ao núcleo um sub-parser de bloco que conheça `subgraph`/`end` — descartado
(contamina o núcleo, Princípio XII). Detectar bloco por **indentação** — descartado: mermaid pareia por
`subgraph`/`end`, não por indentação, e indentação é justamente o que a escrita da pessoa varia (`FR-014`).

---

## 3. Escrever o bloco: menção cirúrgica, zero realocação (FR-014/FR-017/SC-009) — costura 2 (escrita)

**Decisão.** Herdando o R0, o texto do editor é **da pessoa** e só muda por **escrita cirúrgica**; a
declaração de todo elemento novo vai para o **fim do documento** (`FR-017`), e o pertencimento é **menção
do identificador dentro do bloco** — nunca realocação (`FR-014`). Os caminhos de escrita do R1:

| Gesto | Escrita no editor (cirúrgica) |
|---|---|
| Conectar (FR-001) | **append** de `origem --> destino` (ou `origem -->|texto| destino`) no fim; nada acima muda |
| Agrupar seleção (FR-002) | **append** do bloco `subgraph subN[Grupo N]\n  ‹menções isoladas dos membros›\nend` no fim; para membro que muda de dono (parte de outro grupo), **remove** a menção antiga do bloco antigo. **0** declarações realocadas |
| Adicionar membro (FR-016) | **insere** a linha de menção `  id` antes do `end` do bloco alvo (uma inserção); se o id estava em outro bloco, **remove** de lá |
| Retirar membro / desagrupar (FR-016) | **remove** a menção do bloco (um nível); se o bloco esvaziou, **remove o bloco** e cascateia (§5) |
| Duplicar membro (FR-010) | **append** da declaração da cópia no fim **+ insere** a menção do id da cópia no bloco do original (herda o pertencimento) |
| Editar rótulo/texto (FR-004) | reescreve **só a linha** daquele elemento (a rajada coalesce, FR-007) |
| Mover / arrastar p/ dentro-fora da moldura (FR-009) | **zero bytes** — posição é efêmera; arrastar **não** muda pertencimento (`SC-004`) |
| Excluir (FR-011) | remove as linhas exatas do(s) elemento(s); nó leva as conexões presas; agrupamento remove só `subgraph`/`end` (membros ficam); cascata de esvaziamento (§5) |

A cirurgia de bloco em `cirurgica.ts` localiza um bloco por id **pareando `subgraph`/`end` com um
contador de profundidade** (para achar o `end` certo em blocos aninhados), e insere/remove **linhas de
menção isoladas** — que é o que a família **escreve**, embora **leia** as duas formas (menção isolada e
ponta de aresta, `FR-019`). Como no R0, depois de escrever a nova versão do texto, o store **reanalisa**
o documento (`derivar`), e o modelo reanalisado é a verdade — a escrita cirúrgica só precisa produzir um
texto que **releia** para o modelo pretendido.

**Racional.** M3 é o que torna isso possível: como o mermaid **aninha por menção**, o produto nunca
precisa mover o bloco de um agrupamento para dentro de outro — agrupar um agrupamento existente insere,
no bloco novo, a **menção do id** do agrupamento-filho, e o filho continua com o seu bloco onde estava.
Assim `SC-009` (0 realocações, 0 declarações movidas) vale para **nó** e para **agrupamento** — o gesto
sempre só insere o bloco novo (no fim) e as menções (nos blocos). A regra "declaração no fim, sem exceção
para membros" do `FR-017` fica literal.

**Alternativas.** Aninhar por **contenção léxica** (mover o bloco do filho para dentro do pai) —
descartado por M3 (desnecessário) e por `FR-014`/`SC-009` (realocaria linhas preexistentes). Escrever a
menção como **aresta** (`subN --> …`) — descartado: a família **escreve** a forma isolada (`FR-017`); ler
aresta-no-bloco é só para **honrar o código de fora** (`FR-019`).

---

## 4. Identidade de conexão sem token e a marca durável (FR-006/FR-007) — costuras 3 e 4

**Decisão (identidade).** A aresta do Flowchart **não tem id escrito** no código. A identidade da conexão
(`id` opaco `eN`) é **efêmera de sessão** — como a posição —, **nunca projetada**. Ela existe no modelo
para a seleção, a duplicação e o histórico referenciarem a conexão. Após cada reanálise do documento (o
caminho texto→modelo, que reconstrói o modelo do zero como no R0), uma **passagem de reconciliação** no
store reassocia cada aresta relida à conexão viva por chave estrutural **(origem, destino, ordinal entre
paralelas)**, transferindo o `id eN` — a generalização da `arranjo.transferir` do R0 (que já casa 1-sai/
1-entra no renomear). Sem token no código, é a reconciliação que mantém a **seleção estável** enquanto a
pessoa digita noutra linha.

**Decisão (marca durável).** O codec de rótulo do R0 é **lossless**: `decodificar(codificar(x)) === x`
para todo texto — controle vira `#n;`, tab vira `#9;`, `\n` vira `<br/>`, `"`/`#`/`<`/`>`/`&` viram
entidades, todos reversíveis. A **marca** de expressividade (`checarExpressividade`) é propriedade
**determinística do texto**: reler o código reproduz o texto integral e **recomputa a mesma marca**. Logo
`FR-006`/`SC-002` (editar outra linha não apaga o texto colado; a marca é durável) valem **por
construção** para a esmagadora maioria dos textos — sem estado extra. Para os poucos casos em que a
**forma mais fiel** que o tipo expressa é **lossy** (ex.: um rótulo que é `` `code` `` inteiro, que o
mermaid lê como *string markdown* e volta `code`), o modelo guarda o **texto integral** e a reconciliação
por id **preserva o integral + a marca enquanto a linha degradada continua byte-idêntica** à emissão
atual; só quando a pessoa **edita aquela linha** o modelo adota o que ela escreveu (a marca cai ou
recalcula). É a regra "o modelo prevalece enquanto o texto não for tocado" (`FR-006`), e é o `plan`
respondendo "como a correspondência linha↔elemento é mantida na análise" (Assumptions da spec).

**Onde mora.** A reconciliação é do **store** (estende a `derivarComRenomeio` do R0), não do `analisar`
— o núcleo continua **stateless e tolerante**, devolvendo sempre um modelo do zero; o store é quem
conhece o modelo **anterior** e casa ids, arranjo, id-de-conexão e texto-integral-marcado.

**Racional.** O texto de conexão é rótulo como o de nó, e o mesmo checker o serve (a marca é do modelo,
não da direção de entrada, ADR-006). Como o codec é lossless, `SC-002` ("0 perdas por releitura") cai de
graça salvo o corner markdown, que a reconciliação por id cobre. Manter a identidade da conexão fora do
código honra `FR-006`/`FR-007` (a identidade independe das pontas **e** do texto) e o `SC-004`/Princípio V
(nada de token de sessão no código): arestas paralelas e laços (`FR-001`) coexistem porque a identidade
é de sessão, não derivada das pontas.

**Alternativas.** Escrever um id de aresta no código (comentário-âncora `%% e3`) para casar na releitura
— descartado: sujaria o código da pessoa (`FR-014`), viajaria na cópia (Princípio V) e o mermaid o
ignoraria (ruído). Regenerar ids de conexão a cada análise sem reconciliar — descartado: a seleção
penduraria a cada tecla no editor.

---

## 5. Ato em bloco, cascata e envelope (FR-008/FR-011/FR-012/SC-006/SC-008) — costura 5

**Decisão (seleção normalizada).** A seleção é **estado de sessão** (`src/modelo/selecao.ts`), nunca no
código (`RN-01`). A seleção retangular pega por **contenção** (`SelectionMode.Full` do React Flow: o
elemento inteiro dentro do retângulo), e a **conexão entra derivada** quando as **duas pontas** entram —
regra única compartilhada por selecionar (`FR-008`), duplicar (`FR-010`) e excluir (`FR-011`). Antes de
**qualquer** ato em bloco, a seleção é **normalizada**: expandida pelo **fecho transitivo de
pertencimento** (um agrupamento arrasta os seus membros, recursivamente) e **deduplicada**, de modo que
cada elemento é afetado **exatamente uma vez** — o membro já carregado pelo seu agrupamento não é
processado de novo (`SC-006`: 0 deslocamentos/cópias em dobro).

**Decisão (transação e cascata).** Cada ato é **uma** transação — o store aplica todas as mutações do
ato e faz **um** commit → **1** entrada de histórico (`FR-012`), qualquer que seja N. A exclusão compõe
três regras numa passagem, tudo no mesmo commit:
- excluir **nó** → remove também as **conexões presas** a ele (uma aresta sem ponta não é expressável,
  `SC-007`);
- excluir **agrupamento** → remove **a moldura**, os membros **sobrevivem** (viram membros do agrupamento
  de cima, se havia, ou soltos) (`SC-008`);
- todo agrupamento que fica **sem membro** por causa do ato **deixa de existir**, e o esvaziamento **sobe
  em cascata** pelos níveis aninhados **até o primeiro que ainda tem membro** — na **mesma** entrada
  (`FR-011`/`FR-012`; título editado não salva a moldura: título é texto, não membro).

**Decisão (duplicar).** Duplicar expande a seleção pelo fecho transitivo, gera **ids próprios** (contador
de sessão, nunca reusados) com **rótulos/textos/título copiados** (o texto é da pessoa; só o id é novo),
por **colocação local determinística** perto dos originais **sem mover** ninguém (Princípio VII), e liga
as conexões conforme as pontas: as **duas** pontas duplicadas → liga as **cópias**; **nenhuma** → **aresta
paralela** ligando as **pontas originais** (herança simétrica à herança de agrupamento); **exatamente uma**
→ a conexão **não** renasce (`FR-010`). A cópia de um membro **herda o agrupamento** do original (menção
inserida no bloco existente).

**Decisão (envelope).** Agrupamento **consome uma vaga das 400** (sem número novo, clarificação da spec);
conexão consome das 500. O custo por elemento está declarado no Constitution Check (Princípio III). A
profundidade de aninhamento e o tamanho do texto colado são **medidos, não limitados** (`FR-005`): o
texto entra inteiro, e a medição de custo vira insumo de `/zion-prd-evolve` se doer. Um ato em bloco do
tamanho do envelope **não pode nascer estourando** as barras (`SC-005`/`SC-010`), o que a **invariante de
reuso** da projeção sustenta (§6).

**Racional.** É a transação do ADR-009 aplicada ao vocabulário novo: a unidade do desfazer é o ato, e o
ato em bloco/cascata é um só commit. A normalização da seleção é o que impede o dobro (`SC-006`) sem
mexer na regra de contenção (`FR-008`).

**Alternativas.** Uma entrada de histórico por elemento afetado — descartado (`FR-012`/Princípio IV).
Cascata em atos separados por nível — descartado (`SC-008`: 1 entrada em qualquer profundidade).

---

## 6. Projeção com reuso, agora com três famílias de objeto (ADR-004/Princípio III)

**Decisão.** `projetar(modelo, arranjo)` passa a devolver **nós, arestas e nós-container**, cada família
com o seu **cache de reuso por id** (identidade referencial quando nada que a vista enxerga mudou —
Princípio III é portão). Chaves de cache:
- **nó**: `rotulo|forma|marcado|parentId|x|y` (ganha `parentId` — o agrupamento a que pertence);
- **aresta**: `origem|destino|texto|marcado|conectivo`;
- **agrupamento (nó-container)**: `titulo|marcado|parentId|x|y|w|h`.

O agrupamento projeta-se como **nó-container** do React Flow (`parentId`/`extent`), e os membros
projetam `parentId = id do agrupamento`; o aninhamento é `parentId` de container em container. A projeção
**ordena pai antes de filho** (exigência do React Flow para nós aninhados), ordenação estável para não
quebrar o reuso. A moldura (posição/tamanho) é **arranjo** (efêmero) — deriva do arranjo dos membros,
nunca do modelo estrutural.

**Racional.** É a invariante de cinco donos do ADR-004 estendida: mover um nó muda só o objeto daquele
nó (a aresta referencia as pontas por **id string**, então não muda; o container só muda se a moldura
mudar). O teste do Princípio III passa a asserir identidade referencial das **três** famílias ao mudar 1
elemento. Sem o reuso, a tecla e o gesto contínuo dobram no envelope cheio (ADR-006) e encostam nas
barras `SC-005`/`SC-010`.

**Alternativas.** Recomputar arestas/containers por tecla — descartado por latência (Princípio III).
Guardar posição/tamanho da moldura no modelo estrutural — descartado (vazaria no código, Princípio V; a
moldura é arranjo).

---

## 7. Gestos na área do diagrama: o que é da engine, o que é do produto (ADR-002/005)

**Decisão.** A área do diagrama devolve **descritor discreto de mudança**; a engine nunca é fonte
(contrato em `contracts/change-descriptor.md`). O que o React Flow oferece de fábrica e o R1 usa:
- **conectar**: `onConnect` com **handles** origem/destino na `CaixaNo` (`nodesConnectable` passa a
  `true`); soltar no vazio **não** dispara `onConnect` (não há nó destino) e soltar sobre a moldura de um
  agrupamento também não (a moldura não tem handle conectável) → nada nasce (`FR-001`, edge case);
- **seleção retangular por contenção**: `selectionOnDrag` + `SelectionMode.Full`;
- **alvo mais específico**: com nós aninhados, clicar num membro seleciona o **membro** (a engine seleciona
  o nó mais interno); o agrupamento seleciona-se clicando na **moldura/título** (`FR-008`);
- **mover seleção / mover moldura**: multi-drag da engine move os selecionados juntos; arrastar a moldura
  move os filhos (`extent`/parent-drag) — tudo vira **um** `moverSelecao` ao soltar (só arranjo).

O que é **do produto** (não da engine), cada um emitindo um descritor discreto que atravessa a transação:
- **agrupar / desagrupar / adicionar / retirar membro** (`FR-002`/`FR-016`) — comandos de ponteiro; a
  afordância exata (botão de ação, menu) é detalhe de UI e nasce mínima, com o teclado adiado a
  `ciclo-por-teclado`;
- **duplicar** e **excluir** a seleção (`FR-010`/`FR-011`) — comandos de ponteiro;
- **editar rótulo/texto** por gesto (`FR-004`) — abre um **editor inline** sobre o nó/aresta; ao digitar,
  propaga ao vivo (sem confirmação); **colar** injeta `text/plain` (sem formatação da origem, `FR-005`/
  `SC-003`); se o elemento em edição some pela outra vista, o editor **fecha e descarta** com ele
  (`FR-004`, edge case).

**Racional.** Reusa o máximo da engine (ADR-002) mantendo-a fora da verdade: `onNodesChange`/
`onEdgesChange` continuam **filtrados** — só o descritor de um gesto concluído vira comando; seleção/hover
não sujam o modelo (ADR-003). O foco do editor inline é responsabilidade do produto (ADR-005): abrir/
fechar sem roubar o foco do editor de código quando não é o caso.

**Alternativas.** Deixar a engine escrever no modelo (usar o estado interno do React Flow como verdade) —
descartado (ADR-003: a engine nunca é fonte). Afordâncias de teclado para os gestos — adiadas a
`ciclo-por-teclado` (os gestos desta spec são de ponteiro, Assumptions da spec).

---

## 8. Contador por espécie e o texto que nasce neutro (FR-002/RN-06)

**Decisão.** O contador do R0 generaliza para **um contador por espécie**, cada um monotônico e nunca
reusando: nó `n1, n2…` (rótulo neutro `Nó N`), agrupamento `sub1, sub2…` (título neutro `Grupo N`),
conexão `e1, e2…` (**sem** texto — a conexão nasce neutra/vazia, `RN-06`). Nó e agrupamento **observam o
código** (o id é escrito: `nN` e `subN` como id de `subgraph`) e avançam além de qualquer id já presente;
a conexão **não observa** (o id `eN` nunca é escrito). No `emitir`, o conjunto `ocupados` inclui **todos**
os ids do documento (nós + agrupamentos), de modo que espécie nenhuma colide — inclusive um `subgraph n5`
escrito à mão não faz o contador de nó emitir `n5`.

**Racional.** Separar por espécie mantém a numeração de cada uma legível e a lógica de observação limpa
(só quem tem id no código observa). O título/rótulo neutro é do **gesto de criar/agrupar**; a **cópia**
copia o texto do original (o título vai junto, `FR-010`), e o neutro do `FR-002` é só do agrupamento que
nasce de agrupar.

**Alternativas.** Um contador único com prefixo — descartado: a criação de conexão consumiria números de
nó, tornando os buracos de `nN` função da contagem de arestas (ruído sem ganho).

---

## 9. Conectivo preservado: honrar o código de fora sem oferecer estilo (FR-014/RN-06)

**Decisão.** A `Conexao` guarda o **lexema do conectivo** lido (`conectivo: string`, default `-->` no
gesto). O produto **escreve** sempre a forma canônica com o conectivo preservado (`origem conectivo
destino`, ou `origem conectivo|texto| destino`), de modo que uma aresta lida como `a ==> b` **volte**
`a ==> b` (byte-fiel, `FR-014`/`SC-009`) mesmo se um gesto editar o seu **texto**. O R1 **lê** a família
de conectivos dirigidos (`-->`, `---`, `-.->`, `==>`, `--x`, `--o`, `<-->`, com rótulo `|…|` ou `-- … --`)
e **escreve** por padrão `-->`; escolher/trocar o conectivo é **estilo** (`estilo-de-elementos`/R4) e
**não** é oferecido como controle (RN-06/Princípio XIV).

**Racional.** Preservar o que se leu ≠ presumir/oferecer. Guardar o lexema mantém `SC-009` airtight (a
linha volta byte-fiel) sem introduzir um controle de estilo. As formas compactas de fan-out (`a --> b & c`,
`a & b --> c`) ficam **fora** do que o R1 garante ler — o corpus do `SC-001` do R1 é o **que o produto
escreve** + os dois hostis à mão enumerados (aresta-no-bloco, dupla-menção); fan-out entra quando uma
spec o pedir. Uma linha fora do vocabulário lido é **ilegível por inteiro** (Princípio IX: permanece no
texto, não vira elemento, a análise não devolve vazio).

**Alternativas.** Normalizar todo conectivo para `-->` na leitura — descartado: reescreveria a intenção
da pessoa e quebraria `SC-009` numa edição de texto. Modelar o conectivo como campo de estilo editável —
descartado (RN-06/R4).

---

## 10. mermaid como oráculo, ainda fora do runtime (ADR-006 × Princípios X/XIII)

**Decisão.** Como no R0, `mermaid` entra **só nos testes**, agora como oráculo do corpus do **grafo
dirigido**: conexões, blocos, aninhados e os hostis à mão (aresta-no-bloco **M2**, dupla-menção **M4**,
bloco-vazio **M5**) são submetidos a `mermaid.parse()`/`render()` e o **pertencimento** comparado (0
divergências, `SC-001`). Em runtime o R1 não usa mermaid: a prévia é o canvas React Flow sobre a projeção.

**Racional.** É a mesma disciplina do R0 (o juiz é o mermaid de verdade, não o nosso parser — senão o
round-trip é circular), estendida ao vocabulário novo, e é o que transforma as medições §0 em **portão**.
Mantém o Princípio X trivial (checagem de fronteira de importação estendida aos módulos novos) e o XIII
(sem rede em runtime).

**Alternativas.** Confiar nas medições §0 sem corpus permanente — descartado: a semântica do mermaid é o
oráculo **contínuo** (`SC-001`), não uma sondagem única.
