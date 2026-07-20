# ADR-006 — Ciclo completo código ↔ modelo

- **Status:** Aceito
- **Data:** 2026-07-20
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-006-ciclo-completo-codigo-modelo/ — spike de execução que fecha o
  ciclo texto → modelo → texto com um par parser/serializador próprio de Flowchart, tendo o **mermaid
  11.16.0 de verdade como oráculo externo**: o código que sai do modelo é submetido ao `mermaid.parse()`
  e ao `mermaid.render()`, e o SVG resultante é comparado com o SVG do documento original. 151/151
  checagens passaram (80 em Node, 71 em Chromium headless) sobre um corpus de 10 documentos. O veredito
  vem dos braços de controle, não do placar: `tolerante=0` perde nó real 70 vezes, e o `mermaid.parse()`
  recusa 65% dos 2.885 estados intermediários de digitação.

## Contexto

Esta decisão existe porque o **ADR-003** decidiu a forma do modelo interno por **pesquisa** e nunca a
rodou, e porque três ADRs empurraram o mesmo braço de medição adiante.

O ADR-003 fez o trabalho de conhecimento com rigor — 29 fontes, 25 claims verificadas
adversarialmente — e a fonte decisiva foi negativa: o parser Langium do `@mermaid-js/parser` não cobre
nenhum dos cinco tipos do escopo, e o Jison que os cobre está acoplado ao renderer. A conclusão foi
**par parser/serializador próprio**. Conclusão correta, e ainda assim uma conclusão sobre papel: o
próprio ADR-003 registrou que a recomendação de guardar `%%{init}%%` e frontmatter como *sintaxe
preservada* era "transferência do padrão lossless, **não** observação direta sobre mermaid".

O rastro do buraco está escrito nos ADRs anteriores, cada um do seu lado:

- O **ADR-002** escolheu a engine e parou na vista: *"o spike parou na vista: não gerou
  `sequenceDiagram` a partir do modelo nem leu texto de volta. Provar que 'canvas e código são duas
  vistas da mesma verdade' depende da forma do modelo interno, ainda em aberto."*
- O **ADR-004** fixou o envelope de fluidez medindo **gesto → modelo → canvas**, e registrou que o
  painel de código do spike era um `<pre>`: *"o caminho texto → modelo continua sem medição."*
- O **ADR-005** repetiu a ressalva palavra por palavra ao fechar o fluxo por teclado.

O que o discovery pendura nesse braço não é pouco. Ele promete que *"canvas e código são duas vistas
da mesma verdade — nunca duas verdades que precisem ser reconciliadas"*; que Marina *"sabe que o
código que copia é exatamente o diagrama que está vendo"*; e faz, numa frase só, duas exigências que
brigam entre si — *"sinalizar o erro de sintaxe ao editar o código, **sem que a prévia quebre ou se
perca**"*. Some-se a terceira dor da persona, que também mora aqui: *"caractere que o tipo de diagrama
não expressa em código deixa o rótulo **marcado** — o texto nunca é alterado em silêncio para caber"*.

Nada disso tinha evidência de execução de nenhum tipo.

## Decisão

**O modelo interno é alimentado por um par parser/serializador próprio, tolerante por construção, e o
mermaid entra apenas como oráculo de validação — nunca no caminho de edição.**

Em quatro compromissos decidíveis, cada um provado no spike:

1. **O parser nunca devolve "nada".** A análise devolve sempre um modelo, acompanhado de **duas listas
   de severidade distinta**: `erros`, que derrubam o statement ofensor, e `avisos`, que sinalizam sem
   derrubar nada. Estado de digitação legítimo — rótulo ainda aberto, seta ainda sem destino — é
   **aviso**, não erro. Fica descartado o desenho `modelo | null` e o padrão validate-then-render que
   o ADR-003 identificou na superfície pública do mermaid.
2. **O serializador é normalizador com ponto fixo.** Dado um modelo existe um só texto, e re-analisar
   esse texto devolve o mesmo texto. O ciclo é lossless quanto ao **conteúdo** (estrutura, estilo,
   frontmatter, `%%{init}%%`, comentários) e normalizador quanto ao **arranjo**.
3. **O texto de rótulo é preservado byte a byte ou marcado — nunca alterado em silêncio.** A marca é
   propriedade **do modelo**, não da direção por onde o texto entrou: o mesmo conteúdo colado de fora
   ou digitado no código chega marcado igual.
4. **O mermaid fica fora do caminho de edição.** Ele é usado como validador/oráculo — para conferir que
   o código entregue é mermaid válido —, e não como parser da prévia.

**Descartado:** usar `mermaid.parse()` como parser da prévia. Não é opinião de desenho, é aritmética:
digitando os 10 documentos do corpus caractere a caractere, ele aceita **35%** dos 2.885 estados
intermediários (faixa de 11% a 77% por documento). A prévia passaria dois terços do tempo de digitação
apagada, e a promessa do discovery seria impossível por construção.

**Descartado também:** parser próprio porém **estrito**. O braço `tolerante=0` mostra que ter parser
próprio não basta — ele perde nó real **70 vezes** ao longo do corpus, nos dois estados mais banais do
ciclo principal: um rótulo com a aspa ainda aberta, e o **primeiro traço** de uma seta.

## Consequências

**Fica mais fácil.**

- **O último braço não medido desde o ADR-002 fecha.** "Canvas e código são duas vistas da mesma
  verdade" deixa de ser prosa de descoberta: no app rodando, canvas, modelo e código concordam na
  contagem em 10/10 documentos, e o mermaid de verdade desenha o mesmo diagrama a partir do código que
  sai do modelo em 10/10.
- **A PRD ganha NFRs binários e verificáveis por máquina**, todos derivados de medição e não de
  intenção: zero perda de nó durante a digitação; o código copiado é aceito pelo `mermaid.parse()`;
  texto de rótulo volta byte a byte idêntico ou marcado. São a forma que a `constitution` do Spec Kit
  consegue converter em princípio decidível com limiar.
- **O medo de o parser ser o gargalo não se materializou.** No envelope do ADR-004 (400 nós / 500
  conexões), re-analisar o documento inteiro a cada tecla custa **6ms** de uma tecla de 15,5ms —
  com o cursor no meio do documento, não no fim. Otimização incremental é dívida que ainda não venceu.
- **A terceira dor da persona sai do abstrato.** Os 26 textos hostis — aspas, `#`, `&`, `<br/>`
  literal, emoji, cirílico, CJK, árabe RTL, quebra de linha, NUL — voltaram idênticos; 5 voltaram
  marcados, que são exatamente os casos em que a renderização não é fiel mas o texto é.

**Fica mais difícil.**

- **Tolerância e sinalização brigam, e a briga volta a cada capacidade nova.** A primeira versão
  tolerante aceitava `B[[[oops` **em silêncio** — não quebrava a prévia e dizia "sintaxe ok", o que
  reprova tanto quanto quebrar. A separação erro/aviso resolve, mas toda construção nova do parser
  precisa decidir de que lado cai, e errar esse lado é invisível em teste comum.
- **A invariante do reuso de objeto agora tem três donos.** O ADR-004 a fixou por latência de gesto,
  o ADR-005 a reencontrou por correção do foco por teclado, e aqui ela reaparece no braço de entrada
  por texto: com `memo=0` a mediana dobra (32,6ms) e o p95 encosta na barra (48,2ms). Continua sendo
  o tipo de propriedade que uma refatoração inocente derruba sem quebrar teste nenhum — só que agora
  derruba três coisas de uma vez.
- **Cada tipo de diagrama novo custa um par parser/serializador inteiro.** O custo deixa de ser
  desconhecido e passa a ter unidade: **717 linhas** para Flowchart, o tipo mais simples, a maior
  parte no parser. O ADR-003 previu esse ponto de retorno ao adiar o spike de calibragem; ele continua
  adiado, mas agora com número.
- **Ser mais permissivo que o mermaid é uma escolha que precisa ser mantida deliberadamente.** Das 8
  sondas de divergência, 3 divergem — e uma delas apareceu como falha de teste: o corpus original
  usava comentário `%%` no fim de um statement, o mermaid **rejeitou o corpus**, e o serializador
  consertava o documento inválido sem avisar. Divergência não anotada vira surpresa.

**Trade-offs aceitos.**

- **Só Flowchart.** Class, State, ER e Sequence não têm parser nem serializador. Sequence segue sendo
  o suspeito declarado desde o ADR-002 e o ADR-005.
- **Cobertura de Flowchart não é total.** Ficaram de fora shapes v11 `@{...}`, `click` com callback,
  `linkStyle` por índice múltiplo, `accTitle`/`accDescr` e o dialeto antigo com `;`. O que não é lido
  **acusa erro** em vez de sumir calado — mas acusar erro no documento da pessoa é ruim igual.
- **Nós fantasma piscam.** Digitar a palavra `subgraph` passa por `s`, `su`, `sub`, que um parser de
  linha lê como um nó. No documento realista, **191 dos 757** prefixos exibem ao menos um nó que não
  existe no documento final. Nenhum trabalho real se perde — a perda real medida é 0 —, mas uma caixa
  espúria aparece e some enquanto a pessoa digita uma palavra-chave. Medido, não contornado.
- **A posição do comentário não sobrevive, só o comentário.** Reancorá-lo exigiria guardar posição de
  texto no modelo, que é justamente o que o modelo não guarda.
- **Editor de código é um `<textarea>`.** O piso de 16ms medido aqui é o piso **sem** destaque de
  sintaxe, numeração de linha ou marcação de erro na margem — todos acrescentam trabalho por tecla.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 do ADR-004/005. Lê-se com confiança a razão
  entre os braços (2× entre `memo=1` e `memo=0`), não o valor absoluto.

**Limites conhecidos — o que este ADR não decide.**

- **Motor de layout automático.** Segue aberto desde o ADR-002 e rebaixado pelo ADR-003 ao `plan.md`
  da feature que o exigir. Este ADR não o toca, e registra que ele roda sobre o mesmo orçamento de
  frame que a tecla medida aqui.
- **A gramática visível do erro.** Que o parser devolva `erros` e `avisos` é decisão de forma; como
  isso aparece para a pessoa — margem, sublinhado, contador — é design que cabe no `spec.md`/`plan.md`.
- **Colar diagrama grande, desfazer/refazer e edição sobre seleção múltipla.** Cada medição aqui é uma
  tecla. São os mesmos gestos que o ADR-004 deixou de fora, e continuam fora.
- **Sessão longa.** Cada cenário dura segundos. Se o modelo degrada, vaza ou perde o ponto fixo ao
  longo de horas, este spike não vê.

## Status

Proposto → **Aceito**.
