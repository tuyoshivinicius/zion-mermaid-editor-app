# Research — Cano modelo ⇄ código (R0)

Nenhum `NEEDS CLARIFICATION` permanece: a spec já está clarificada (28 perguntas resolvidas) e os
ADRs fecham as decisões estruturantes. O que este documento resolve é o **como de feature** que a
constituição delega ao `plan.md` (biblioteca, desenho de módulo) e as **três reconciliações** que o
prompt de plan cobra explicitamente. Formato: Decisão · Racional · Alternativas.

Há evidência de execução reutilizável: o spike do ADR-006
(`docs/adr/spikes/ADR-006-ciclo-completo-codigo-modelo/src/`) já traz um par parser/serializador de
Flowchart validado pelo **mermaid 11.16.0 de verdade** (151/151). Ele é **descartável por decisão do
próprio spike** ("existe para produzir um veredito, não para virar base do produto"), mas fixa as
formas provadas — `analisar`/`serializar`/`normalizar`, o codec de rótulo, a projeção com cache. O R0
reescreve como produto o **recorte** dessas formas que a spec pede.

---

## 1. Linguagem e desenho de módulo (delegado ao plan pela constituição)

**Decisão.** TypeScript 5.x sobre React 18 + Vite 5. Store único de sessão em **Zustand**. Editor de
código como **`<textarea>` controlado** (sem realce de sintaxe no R0). Projeção isolada em módulo
próprio. Fronteiras de módulo aplicadas por checagem (dependency-cruiser/ESLint boundaries).

**Racional.** ADR-001 fixa React+Vite+Tailwind+shadcn e o critério "densidade de código de treino";
TS e JS empatam nesse critério, e o TS ainda torna **verificáveis por tipo** as invariantes que o R0
precisa proteger (campos não-serializáveis do modelo, duas listas de severidade, registro de
reconhecedores). Zustand é o padrão de store externo do React Flow citado na própria evidência do
ADR-003 (`reactflow.dev/learn/advanced-use/state-management`) e casa com "canvas e editor são vistas
de um store só, a engine nunca é fonte". O editor `<textarea>` mantém o piso de latência medido no
ADR-006 (16ms **sem** realce) — realce, numeração e marcação de erro na margem são `codigo-de-entrada`
e acrescentariam trabalho por tecla fora do escopo. A projeção mora em módulo próprio porque a
invariante de reuso tem **cinco donos** (ADR-004/005/006/008/009) e é ali que a checagem de identidade
referencial roda.

**Alternativas.** JavaScript puro (como o spike) — descartado por não deixar as invariantes
verificáveis em tipo. Redux/Context — mais cerimônia que o store único pede. CodeMirror/Monaco como
editor — trazem realce e margem que o R0 não usa e que encareceriam a tecla; entram quando
`codigo-de-entrada` exigir.

---

## 2. Superfície do codec e o registro de reconhecedores (ADR-006/008)

**Decisão.** Uma superfície única `analisar` / `serializar` / `normalizar` (ADR-008), com um **núcleo
comum** permanente e um **registro de reconhecedores de statement por família**. O R0 registra dois
reconhecedores na família Flowchart: **cabeçalho** (as cinco declarações do escopo) e **nó
retangular**. Nenhum outro. O núcleo não referencia nomes de família (checagem do Princípio XII).

**Racional.** É a forma que o ADR-008 provou (núcleo de ~460 linhas reusado sem alteração; custo por
família **caindo**). O núcleo carrega o que a spec exige e não muda entre specs: divisão de linhas,
tolerância por construção, as duas listas `erros`/`avisos`, o preâmbulo preservado e o serializador
normalizador com ponto fixo. O que o R0 recorta é **só o vocabulário**, e vocabulário é dado
(reconhecedores registrados), não código descartável. `elementos-grafo-dirigido` registra o
reconhecedor de conexão; `estilo-de-elementos` registra os shapes; os `tipo-*` registram as outras
famílias — todos no mesmo núcleo. É a **reconciliação 2** do prompt, respondida: o codec do ADR-006/008
acomoda o recorte porque o recorte é a lista de reconhecedores ativos, não um parser à parte.

**Alternativas.** Portar o parser inteiro do spike (14 formas, links, subgraphs, estilos) e "ligar só o
retângulo" por flag — descartado: traz código morto de leitura que teria de ser suprimido a cada
release e confunde a fronteira do que o R0 lê. Escrever um mini-parser de retângulo isolado —
descartado: seria exatamente o "parser descartável" que o prompt proíbe, e jogaria fora o núcleo que
as specs seguintes reusam.

### 2a. A regra de recorte, ao pé da letra (FR-005)

**Decisão.** O **vocabulário de nó do R0** é uma linha de duas formas: **identificador sozinho** (`nN`)
e **identificador + rótulo entre colchetes** (`nN[…]`, com aspas opcionais `nN["…"]`, um delimitador
só, o retangular). Uma linha é nó **somente se** casar uma dessas formas; qualquer linha que contenha
um **token de link** (`-->`, `---`, `-.->`, `==>`, `~~~`, `--x`, `<-->`, …) ou **outro delimitador de
shape** (`(`, `{`, `((`, `>` …) é **trecho ilegível por inteiro** — nenhum nó nasce dela, nem os que
um mermaid de fora extrairia. **Sem materialização parcial de linha.**

**Racional.** É a decisão que impede `a --> b` de virar dois nós e `n1(Nó A)` de virar um retângulo
(clarificações das linhas 43, 58–59 da spec). O reconhecedor de nó retangular do R0 é mais **estrito**
que o `idValido` permissivo do spike: um identificador do R0 não pode conter sequência de link — daí a
guarda "linha com token de link é ilegível" precede o reconhecimento de identificador sozinho. Isso
também sustenta o caso `n1[Nó A] --> n2` (US2-12): a linha sai do vocabulário, é ilegível por inteiro,
a caixa some (FR-004/FR-005 reconciliados), e reapaga-se o excedente → o nó renasce na posição lembrada
(FR-015).

**Exceção nomeada — a declaração de tipo (FR-005).** O reconhecedor de cabeçalho reconhece as **cinco**
declarações do escopo (`flowchart`/`graph`, `stateDiagram(-v2)`, `classDiagram`, `sequenceDiagram`,
`erDiagram`), **com ou sem orientação**, em **qualquer posição** do texto, e as **descarta** — nunca
materializa nó, ainda que a regra do identificador sozinho a alcançasse. O conjunto é **fechado nos
cinco**: `pie`, `gantt` e afins **não** são reconhecidos e caem na regra comum (viram nó pelo
identificador sozinho). Reconhecer **não** troca o tipo, que é fixo `flowchart` no R0.

**Alternativas.** Amarrar o descarte à lista de palavras-chave do mermaid — descartado pela spec
(deixaria o corpus do SC-001 "sem fronteira"): o conjunto é os cinco tipos do produto, não o
dicionário da ferramenta de fora.

---

## 3. Escrita cirúrgica × serializador-normalizador (ADR-006 × FR-017) — reconciliação 1

**Decisão.** O texto do editor é **da pessoa** e só muda por **escrita cirúrgica**. Há três caminhos de
escrita, e **nenhum** reescreve o documento inteiro:

| Gesto | Escrita no editor |
|---|---|
| Criar nó por gesto (FR-001/FR-017) | **append** de **uma** linha `nN[Nó N]` no **fim** do documento; nada acima muda |
| Mover nó (FR-007/FR-008) | **zero bytes** — a posição é efêmera, atualiza só arranjo + projeção |
| Copiar (FR-014) | ver §4 — transforma o **texto da pessoa**, não o modelo |

A **normalização com ponto fixo** do ADR-006 vive no serializador (`serializar` modelo→texto) e é
**local ao statement**: a linha que um gesto cria ou edita é emitida na sua forma canônica única (via
a emissão *por nó* do serializador), e é isso — e só isso — que garante o ponto fixo. O **documento**
nunca é serializado inteiro enquanto a pessoa é dona dele: reancorar cabeçalho, reordenar statements
ou recanonizar espaçamento violaria FR-017/SC-009. As duas promessas ficam de pé porque atuam em
granularidades diferentes: **ponto fixo por statement** (a linha do gesto) × **byte-idêntico no
documento** (todo o resto).

**Onde mora a normalização.** No `codec/nucleo/serializar.ts`, exposta em duas granularidades: a
emissão de **um** statement (usada em runtime pela escrita cirúrgica) e a serialização do **documento**
(usada **só em teste**, para provar o ponto fixo e o round-trip — SC-001/SC-002). O runtime nunca chama
a segunda sobre o texto da pessoa.

**Racional.** Um diagrama construído só por gesto (US1: seed `flowchart TD` + dois appends) fica
consistente sem serialização global — cada gesto escreveu exatamente a linha que o modelo emitiria, e
reler essas linhas devolve o mesmo modelo (ponto fixo). O ADR-006 fica honrado (o serializador **é**
normalizador com ponto fixo, provado por teste) e a spec fica honrada (o produto nunca recoloca o
cabeçalho apagado nem recanoniza — FR-017/FR-019).

**Alternativas.** Serializar o modelo e escrever o resultado no editor a cada mutação (o caminho
ingênuo) — descartado: apaga o texto da pessoa, reordena, recanoniza; é exatamente o que FR-017 e
SC-009 proíbem, e reintroduziria o eco entre as vistas que o ADR-003 quebra pela origem de transação.

---

## 4. Cópia: validade sem tocar no texto da pessoa (FR-014)

**Decisão.** O gesto de copiar entrega **o texto do editor** com **uma** normalização cirúrgica: exatamente
**uma** declaração de tipo, `flowchart TD`. Se o editor não tem declaração reconhecida → a cópia
**acrescenta** `flowchart TD` (no topo); se tem a de **outro** tipo → a cópia **substitui** aquela
linha por `flowchart TD`; se já tem `flowchart`/`flowchart TD` → nada muda. Todo o resto vai
**byte-idêntico**, inclusive trechos ilegíveis (US3-8). O **editor permanece intocado** (FR-017/FR-019).

**Racional.** O produto **nunca** é a causa da invalidez (FR-014), mas **nunca** remove texto da pessoa
para salvar a própria promessa (FR-017) — o texto dela vence (clarificação da linha 44). A cópia usa o
**reconhecedor de cabeçalho** (§2a) para achar/trocar a linha da declaração; é transformação de texto,
não re-serialização do modelo. Documento de zero nós → a cópia é `flowchart TD` sozinha, válida
(SC-001). Sustenta US3-6, US3-7, US3-8 e o edge "copiar com trecho que o mermaid recusa".

**Alternativas.** Copiar `serializar(modelo)` — descartado: perderia os trechos ilegíveis que a pessoa
deixou (FR-017) e reescreveria o texto dela; contradiz US3-8.

---

## 5. Memória de arranjo × um store só (ADR-003/007) — reconciliação 3

**Decisão.** O arranjo é um **mapa `identificador → posição`** que vive no **mesmo store de sessão** do
modelo, como estado **não-serializável** — não um segundo store paralelo. A projeção lê esse mapa para
derivar a coordenada de cada nó; a coordenada **nunca** existe no modelo estrutural nem no código.
Regras:

- **Criar/arrastar** grava a posição do id no mapa.
- **Renomear** (trocar o id na linha, FR-018) **transfere** a entrada do id antigo para o novo; o antigo a perde.
- **Materializar do código** (FR-015): se o id tem posição lembrada **e o lugar está livre**, o nó
  renasce ali; senão, **colocação local determinística** — ancorada no elemento anterior na ordem do
  código, em espaço livre próximo, sem mover ninguém; sem elemento anterior, a **origem fixa** da área
  (ponto constante, independente do tamanho da janela). O produto **nunca** empilha duas caixas.

**Racional.** ADR-003 diz "efêmeros são campos do mesmo modelo marcados como não-serializáveis, não um
segundo store". O arranjo do R0 precisa lembrar posições de ids **que no momento não existem** (linha
apagada, recortada), então não cabe literalmente num campo de um nó ausente — mas cabe como **a metade
de arranjo do estado de sessão** que o ADR-009 nomeia ("as duas metades: estrutura e arranjo") e o
ADR-007 chama de "dado de sessão que sobrevive ao layout". A proibição do ADR-003 é contra um segundo
store de **estrutura** (uma verdade rival de quais nós existem); o mapa de arranjo não guarda estrutura,
guarda conforto de sessão, e mora no mesmo store, atrás da mesma disciplina de não-serialização. Um
store, duas metades. É a **reconciliação 3** do prompt.

**Determinismo (SC-008).** A colocação local não depende do tamanho da área: mesma cadeia de código →
mesmas coordenadas, em qualquer tela. O plano é **rolável** (FR-007) para manter alcançável o que a
cadeia empurra além da borda; rolar é estado de vista e não aparece no código nem move nada.

**Alternativas.** Guardar a posição num campo do nó no modelo — descartado: não sobrevive à linha
apagada (perde a memória por id) e arriscaria vazar na serialização. Um store de posição separado do
store de sessão — descartado: é o "segundo store paralelo" que o ADR-003 recusa.

---

## 6. Propagação bidirecional sem eco, e a projeção com reuso (ADR-003/004)

**Decisão.** Toda mutação carrega a **origem** (canvas ou editor); a vista de origem **não** é reescrita
a partir do que ela mesma emitiu (ADR-003). **Debounce** existe **só** no caminho texto→modelo. A
projeção `projetar(modelo, arranjo)` **reusa** o objeto de vista (nó) quando nada que a vista enxerga
mudou — chave de cache `rótulo|forma|marcado|x|y`, identidade referencial dos demais preservada.

**Racional.** É o que quebra o eco entre as duas vistas (US2: digitar no editor não faz o editor se
reescrever) e o que segura a latência: sem o reuso, a tecla no envelope **dobra** e encosta na barra
(ADR-006: 32,6ms mediana / 48,2ms p95 com `memo=0`). A invariante de reuso é **portão** (Princípio III),
testada por identidade referencial. Sustenta SC-003, SC-005 e a promessa de US2 (o que já estava
construído continua na tela enquanto se digita).

**Alternativas.** *Dirty flags* / recomputar a projeção inteira por tecla — descartado por latência e
por reintroduzir o eco.

---

## 7. Foco do DOM: revelar sem tomar (ADR-005 × FR-002/SC-010)

**Decisão.** Quando um gesto no diagrama escreve a linha nova, o **editor revela** a linha (rola até ela
e a destaca por um instante) **sem** mover o cursor de digitação e **sem** roubar o foco do editor; ao
voltar a digitar, a vista volta ao cursor. Responsabilidade do produto, não da engine.

**Racional.** ADR-005 fixa que o foco é do produto: "quem cria um elemento assume o dever de trazê-lo à
área visível". No `<textarea>`, revelar = ajustar `scrollTop` até a linha e aplicar um destaque
transitório; preservar cursor = **não** tocar em `selectionStart/End` nem chamar `focus()`. É medível:
SC-010 assere 0 deslocamentos de cursor e 0 perdas de foco. Atalho de teclado para o gesto é
`ciclo-por-teclado`.

**Alternativas.** Deixar a engine/React Flow gerir foco — descartado pelo ADR-005 (a engine não move
foco e não sabe onde a pessoa está).

---

## 8. Contador de identificador e rótulo padrão (FR-013/FR-016)

**Decisão.** Um **contador monotônico de sessão** emite ids opacos e sequenciais `n1`, `n2`… — **nunca**
reusa um id já emitido (nem depois da linha apagada) e **avança até um valor livre** quando o próximo
já está ocupado no texto da pessoa. O **rótulo padrão** espelha o número do id: `n3` → "Nó 3" (um
contador só para as duas vistas). O id é **opaco**: não deriva do rótulo nem muda quando o rótulo é
reescrito.

**Racional.** FR-016 exige unicidade do id e não-reuso; o R0 é a primeira a materializar isso. A
numeração dos rótulos pode ter buracos (o contador pula ocupados) e isso é aceitável (FR-013); o produto
não promete rótulo único (rótulo é texto, é da pessoa).

**Alternativas.** Derivar o id do rótulo — descartado por FR-016 (editar rótulo reescreveria o id).
Reusar ids apagados — descartado (a identidade não volta; só a posição volta, via arranjo).

---

## 9. mermaid como oráculo, fora do runtime (ADR-006 × Princípios X/XIII)

**Decisão.** `mermaid` entra **só nos testes**, como oráculo de SC-001 (o código que sai é submetido a
`mermaid.parse()`/`mermaid.render()` e o SVG comparado). Em **runtime o R0 não usa mermaid**: a prévia é
o canvas React Flow sobre a projeção; não há sinalização de erro de sintaxe (é `codigo-de-entrada`).

**Racional.** Reproduz o desenho de prova do ADR-006/008 (o mermaid de verdade é o juiz, não o nosso
parser — senão o round-trip é circular). Mantém o Princípio X trivialmente satisfeito (checagem de
fronteira de importação) e o Princípio XIII (sem rede em runtime, artefato estático).

**Alternativas.** `mermaid.parse` como parser da prévia — descartado por medição no ADR-006 (aceita só
35% dos estados intermediários de digitação; a prévia passaria dois terços do tempo apagada).
