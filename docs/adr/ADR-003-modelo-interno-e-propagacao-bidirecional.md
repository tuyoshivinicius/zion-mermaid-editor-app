# ADR-003 — Modelo interno e propagação bidirecional canvas ↔ código

- **Status:** Aceito
- **Data:** 2026-07-19
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** Pesquisa (risco de conhecimento), 2026-07-19 — fonte decisiva: <https://github.com/mermaid-js/mermaid/tree/develop/packages/parser/src/language> (o parser Langium do mermaid não cobre nenhum dos cinco tipos do escopo). 29 fontes buscadas, 25 claims verificadas adversarialmente; demais fontes primárias abaixo.
  - Cobertura do parser Langium do mermaid: <https://raw.githubusercontent.com/mermaid-js/mermaid/develop/packages/parser/src/parse.ts>
    · <https://cdn.jsdelivr.net/npm/@mermaid-js/parser@1.2.0/dist/src/index.d.ts>
  - Os cinco tipos em Jison acoplado ao renderer: <https://raw.githubusercontent.com/mermaid-js/mermaid/develop/packages/mermaid/src/diagrams/flowchart/parser/flowParser.ts>
    · <https://raw.githubusercontent.com/mermaid-js/mermaid/develop/packages/mermaid/src/diagrams/flowchart/flowDiagram.ts>
    · <https://github.com/mermaid-js/mermaid/issues/4401>
  - Superfície pública do mermaid (`parse` é validador; `mermaidAPI` é interno/deprecado):
    <https://raw.githubusercontent.com/mermaid-js/mermaid/develop/packages/mermaid/src/mermaid.ts>
    · <http://mermaid.js.org/config/setup/mermaid/interfaces/ParseResult.html>
  - Supressão de erro (não recuperação) e o padrão validate-then-render:
    <https://raw.githubusercontent.com/mermaid-js/mermaid/develop/docs/config/usage.md>
    · <http://mermaid.js.org/config/setup/mermaid/interfaces/ParseOptions.html>
  - Prior art Excalidraw (usa `getDiagramFromText` e depende do render para geometria):
    <https://github.com/excalidraw/mermaid-to-excalidraw/blob/master/src/parseMermaid.ts>
    · <https://docs.excalidraw.com/docs/@excalidraw/mermaid-to-excalidraw/codebase/parser>
  - Prior art React Flow + mermaid (texto como fonte única; não bidirecional):
    <https://raw.githubusercontent.com/albingcj/mermaid-reactflow-editor/master/README.md>
  - Store externo e descritores de mudança do React Flow:
    <https://reactflow.dev/learn/advanced-use/state-management>
    · <https://reactflow.dev/api-reference/types/node-change>
  - Hub de modelo abstrato (AnyText, SLE '26): <https://dl.acm.org/doi/10.1145/3806383.3815516>
  - Manipulação direta bidirecional e o ônus de desambiguação (Sketch-n-Sketch, OOPSLA 2018):
    <https://arxiv.org/pdf/1809.04209>
  - Árvore lossless / sintaxe concreta preservada: <https://libcst.readthedocs.io/en/latest/why_libcst.html>
    · <https://github.com/oils-for-unix/oils/wiki/Lossless-Syntax-Tree-Pattern>
  - Limites do reparse incremental para este escopo: <https://lezer.codemirror.net/docs/guide/>
    · <https://github.com/inspirnathan/codemirror-lang-mermaid>

## Contexto

O ADR-001 fechou a stack de UI e o ADR-002 a engine do canvas, e ambos deixaram o mesmo buraco
nomeado: o ADR-001 delegou "como o modelo interno propaga mudanças para canvas e código"; o ADR-002
fechou dizendo "este ADR escolhe a engine da vista, não a estrutura da verdade". Este ADR ocupa esse
buraco — e é onde mora o risco que os dois anteriores empurraram adiante.

A descoberta já fixou a forma, não o mecanismo: "o modelo interno é o centro. Ele recebe edições
vindas do canvas e do editor de código, e propaga para os dois. Canvas e código são duas vistas da
mesma verdade — nunca duas verdades que precisem ser reconciliadas." E cobra dessa estrutura quatro
promessas concretas: a posição vive no modelo e **não** viaja no código entregue; um ato aplicado a
uma seleção inteira desfaz como um só; ao errar a sintaxe no código a prévia não quebra nem se perde;
e o texto que a Marina trouxe de fora chega ao rótulo e ao código intacto, sem alteração em silêncio.

A dúvida é de **conhecimento**, não de execução: o que decide não é medir o *nosso* caso, e sim o que
a infraestrutura pública do mermaid oferece e o que quem já tentou pagou. Quatro arquiteturas
estavam em jogo: **(a)** modelo de domínio próprio como fonte única, com parser na entrada e
serializador na saída; **(b)** o texto mermaid como fonte única, re-parseado a cada gesto do canvas;
**(c)** híbrida, texto como fonte da estrutura e side-store para posição; **(d)** estrutura
sincronizada tipo CRDT.

A pesquisa fechou a porta de (b) por indisponibilidade de infraestrutura, e o fez em três camadas:

**Não existe AST público do mermaid para os cinco tipos do escopo.** O pacote Langium
`@mermaid-js/parser` (MIT, v1.2.0 de 2026-06-25) traz gramática para 15 tipos — architecture,
gitGraph, pie, packet, radar, treemap e afins — e **nenhum** de Flowchart, Class, State, Sequence ou
ER. Os cinco continuam em gramáticas Jison dentro do pacote do renderer, e as ações do Jison **mutam
diretamente o `db` do renderer**: não há árvore intermediária a consumir. A migração Jison→Langium é
rastreada pela issue #4401, aberta em 2023 e ainda em andamento.

**A API pública de parse é validador, não parser.** `mermaid.parse()` devolve `{ diagramType }` ou
`false` — detecção e validação, nada mais. O único acesso a um modelo estruturado dos cinco tipos é
`mermaidAPI.getDiagramFromText()` → `diagram.db`, superfície marcada ao mesmo tempo `@deprecated` e
`@internal`. É exatamente o caminho que o Excalidraw usa, e o projeto documenta a dívida no próprio
código: *"deprecated but there's no public alternative that provides access to diagram.db"*. Note a
distinção, que importa: não é que o mermaid não consiga parsear — é que o acesso estruturado só
existe por contrato não-público, que pode quebrar numa minor.

**Sob erro de sintaxe o mermaid oferece supressão, não recuperação.** `suppressErrors` faz `parse`
retornar `false` em vez de lançar, e o padrão oficialmente documentado é validate-then-render: só
re-renderiza se válido, deixando o SVG anterior na tela **por omissão, não por design**. Onde o
Langium chega a produzir árvore parcial, o mermaid a descarta e lança. Ou seja: a promessa da
descoberta de que "o trabalho nunca desaparece por causa de um caractere" **não pode vir do mermaid**
— tem que ser sustentada pela arquitetura do produto.

A prior art confirma o diagnóstico em vez de contradizê-lo. O projeto mais próximo do nosso escopo,
`albingcj/mermaid-reactflow-editor`, escolheu (b) e declara no README que "o conteúdo do editor é a
fonte única de verdade" — e o resultado é um scanner de expressões regulares artesanal de 2.080
linhas que cobre **só Flowchart**, sem serializador de volta, com os gestos de canvas morrendo no
grafo. O Excalidraw, que é o conversor mais maduro, precisa **renderizar o diagrama para SVG e medir
o resultado** para obter posição e dimensão, porque geometria não está no texto nem no modelo
parseado. E o argumento de escape — "reparse incremental barateia (b)" — também não se sustenta
aqui: a única gramática Lezer de mermaid cobre 3 dos 5 tipos, está sem release desde 2023, e o
próprio guia do Lezer avisa que uma mudança minúscula pode exigir re-parse de boa parte do documento.

Do outro lado, (b) **não** é impossível — Sketch-n-Sketch (OOPSLA 2018) é referência revisada por
pares de duas vistas editáveis com propagação reversa funcionando. Mas o preço documentado é uma UI
de desambiguação: um gesto no output mapeia para vários reparos válidos do código, exigindo menu de
candidatos com preview. Isso é justamente o oposto do que a persona quer — Marina quer o custo
unitário de materializar um elemento perto de zero, não uma pergunta a cada arraste.

(d) sai por ausência de requisito: a descoberta recusa colaboração e compartilhamento explicitamente,
e um CRDT sem segundo editor é maquinário sem carga — o mesmo argumento que descartou o Next.js no
ADR-001.

## Decisão

Adotar um **modelo de domínio próprio, agnóstico de vista e lossless, como fonte única em memória**,
com parser mermaid→modelo na entrada e serializador modelo→mermaid na saída. Posição, seleção e
demais efêmeros vivem como **campos do mesmo modelo, marcados como não-serializáveis** — não num
segundo store paralelo.

- **Escolhido:** (a) temperado com (c). Nem canvas nem texto são donos da verdade; ambos são vistas.
  O texto mermaid é **saída projetada** do modelo, e a projeção simplesmente não emite os campos
  efêmeros — é assim que a promessa "posição não viaja no código" se cumpre por construção, e não
  por uma limpeza a mais na hora de copiar.
- **Descartado:** **(b) texto como fonte única** — não implementável sobre a infraestrutura pública
  do mermaid nos cinco tipos, e herda ônus de desambiguação de UI mesmo onde funciona.
- **Descartado:** **(c) puro, com side-store paralelo** — mantém a estrutura no texto, portanto
  herda o problema de (b), e ainda cria a fronteira de sincronização entre dois stores que a
  descoberta recusa.
- **Descartado:** **(d) CRDT / store sincronizado** — resolve concorrência multiusuário, que este
  produto declaradamente não tem.

Três decisões de mecanismo acompanham a escolha, porque são o que a torna decidível:

1. **Lossless.** Comentários, ordem de declaração, frontmatter YAML e diretivas `%%{init}%%` são
   guardados no próprio modelo, como sintaxe concreta preservada — não reconstruídos por
   embelezamento na saída. É o padrão de árvore lossless (LibCST, cstree, Lossless Syntax Tree
   Pattern), e é o que impede o round-trip de destruir o que a pessoa escreveu à mão.
2. **Origem de transação.** Toda mutação carrega de onde veio, e a vista de origem não é reescrita a
   partir do que ela mesma emitiu. É o que quebra o eco entre as duas vistas — mais barato que
   *dirty flags* e sem a latência que um *debounce* longo imporia ao canvas. O *debounce* fica só no
   caminho texto→modelo, onde já é o padrão documentado do mermaid.
3. **`mermaid.parse` como portão de renderização, não como fonte.** O `parse` do mermaid valida a
   prévia; o modelo vem do nosso parser. Se `getDiagramFromText` for usado para dar arranque ao
   parser, fica atrás de um adaptador e é tratado como dívida, por ser API interna e deprecada.

## Consequências

**Fica mais fácil.**

- **O canvas continua vivo sob sintaxe inválida.** O último modelo bom permanece em memória e o
  parse que falhou vira erro anotado, não perda de estado. A promessa da descoberta — "Marina percebe
  onde errou sem perder de vista o que já construiu" — passa a ser uma propriedade da arquitetura, e
  não uma esperança sobre o comportamento do renderer.
- **Desfazer sobre uma seleção inteira é um ato só**, porque é uma transação no modelo. O editor de
  código vira **produtor de comandos**, não dono de um histórico rival — o que dissolve o conflito
  clássico entre a pilha de undo do editor de texto e a do documento.
- **A posição não viaja no código entregue**, por construção. Serializar é projetar, não despejar.
- **Não há duas verdades a reconciliar**, que é literalmente o que a descoberta pediu. O canvas
  projeta a estrutura que o app possui; o React Flow entrega os gestos como descritores discretos de
  mudança (`onNodesChange`/`onEdgesChange`, mais `onConnect`, `onReconnect`, `onDelete`), que é o
  ponto onde o gesto vira comando de modelo.

**Fica mais difícil.**

- **Parser e serializador próprios, cinco vezes.** Não existe biblioteca madura de geração de
  mermaid para reusar — a pesquisa não encontrou nenhuma, e a hipótese de derivar o serializador da
  mesma gramática do parser **não sobreviveu** à verificação. É código nosso, mantido por nós.
- **Manutenção contra a evolução da sintaxe.** Novos shapes, `classDef`, frontmatter e mudanças entre
  versões do mermaid batem no nosso par parser/serializador, não numa dependência que se atualiza
  sozinha. O `flow.jison` do upstream recebeu commits em maio e junho de 2026: é gramática viva.
- **Filtrar o funil do React Flow.** `onNodesChange` dispara em arraste e em seleção, com eventos de
  posição de alta frequência. Gesto efêmero não pode sujar o documento nem disparar reescrita do
  texto — a separação entre o que é edição e o que é conforto de sessão precisa ser feita à mão, no
  ponto de interceptação.

**Trade-offs aceitos.**

- **O custo do par parser/serializador é assumido sem ancoragem empírica externa.** Nenhum projeto
  verificado escreveu um serializador canvas→mermaid em produção. A única referência de custo é o
  lado do parser num projeto que cobriu **um** tipo: 2.080 linhas. Não há estimativa confiável para
  os outros quatro, e o ADR é aceito sabendo disso.
- **Fluidez em diagrama denso continua não medida.** O ADR-001 delegou a promessa ao ADR-002, que a
  delegou adiante; aqui ela é endereçada por **argumento arquitetural** — modelo em memória mutado
  incrementalmente em vez de re-parse do documento a cada tecla —, não por medição. Nenhuma fonte
  primária mede isso para mermaid. O risco de performance da descoberta segue sem evidência
  empírica, agora de forma declarada e no lugar certo.
- **Dependência de contrato não-público, se houver arranque via `getDiagramFromText`.** Mitigado por
  adaptador, mas é dívida real: pode quebrar numa minor do mermaid.

**Limites conhecidos — o que este ADR não decide.**

- **Fatiamento por tipo de diagrama.** A decisão vale para os cinco tipos, mas nenhum projeto
  conhecido cobre os cinco. Flowchart primeiro e os outros quatro como incrementos é a ordem
  natural, e ela já casa com a progressão por família de modelo mental que a descoberta fixou — mas
  *quanto* custa cada incremento continua desconhecido. Um spike de calibragem escrevendo o par
  parser/serializador de um tipo não-Flowchart (Class ou ER) foi **considerado e adiado**; se a
  estimativa do primeiro incremento estourar, é aqui que se volta.
- **Motor de layout automático.** Segue aberto desde o ADR-002. Este ADR estabelece que a posição
  vive no modelo e não é serializada; qual motor calcula a posição inicial no canvas, e quanta
  divergência é tolerável entre o que Marina vê e o que o destinatário do código vê, é decisão
  separada — e cabe no `plan.md` da feature que a exigir.
- **Preservação de `%%{init}%%` e frontmatter YAML no ciclo completo.** A recomendação de guardá-los
  como sintaxe preservada é transferência do padrão lossless, **não** observação direta sobre
  mermaid. Nenhuma fonte verificada trata desse caso específico.

**Sensibilidade temporal.** A afirmação sobre a cobertura do `@mermaid-js/parser` é um retrato de
alvo móvel, verificado em **2026-07-19** contra `develop` e contra a v1.2.0 publicada em 2026-06-25.
A issue #4401 pode adicionar Flowchart numa versão futura. Se isso acontecer, a premissa que fecha a
porta de (b) enfraquece e este ADR merece revisão.

## Status

Proposto → **Aceito**.
