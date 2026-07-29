# Research — Área de trabalho (R1)

Nenhum `NEEDS CLARIFICATION` permanece: a spec chegou clarificada (15 perguntas resolvidas em
`/speckit-clarify`) e os ADRs fecham as decisões estruturantes. O que este documento resolve é
exatamente o que a spec **delegou por escrito ao plano** — os números, as afordâncias e o caminho até
o destino — e as **cinco costuras** que o prompt de plan cobra. Formato: Decisão · Racional ·
Alternativas.

Regra que vale para o documento inteiro, e que decorre do ADR-002: **a engine entrega o canvas, não o
desenho**. Onde React Flow resolve, usa-se React Flow; onde a spec pede algo que a engine não promete
— centralização determinística, escala abaixo do piso, medir pela extensão desenhada, deslocamento
mínimo —, o que nasce é **função pura de produto**, nunca uma segunda engine.

---

## 1. Os números declarados

Todos vivem em **um arquivo só** (`src/areatrabalho/faixa.ts`), para que `FR-008` e `FR-011` não
possam divergir por descuido de constante duplicada.

| Constante | Valor | Requisito que a exige | Como o valor foi escolhido |
|---|---|---|---|
| `PISO_ZOOM` | **0,01** (1%) | `FR-001` | ≤ à escala que faz o envelope inteiro caber na área de referência (conta em §1.1). |
| `TETO_ZOOM` | **4** (400%) | `FR-001` | "alto o bastante para ler um rótulo de perto": o rótulo é `text-xs` (12px) → 48px a 4×. |
| `TAMANHO_NATURAL` | **1** | `FR-001`, `FR-009` | A escala 1:1 do desenho, **dentro** da faixa por construção (0,01 < 1 < 4). |
| `AREA_REFERENCIA` | **1280 × 720 px** | `FR-001` | O tamanho de referência **da área do diagrama** (não da janela) contra o qual o compromisso do piso é medido. |
| `FOLGA_BORDA` | **24 px de tela** | `FR-008`, `FR-011` | **Uma só** para os dois. Em px de tela (não do plano) para que "não encostado na borda" signifique a mesma coisa em qualquer zoom. |
| `MIN_DIAGRAMA` | **480 px** | `FR-006` | Abriga a barra de controles (≈220px) com plano útil sobrando. |
| `MIN_EDITOR` | **320 px** | `FR-006` | O `min-w-[320px]` que o R0 já declarou; nenhuma razão para mexer. |
| `SOMA_DOS_MINIMOS` | **800 px** | `FR-006` | Derivado. Abaixo disso a área de trabalho para de encolher e a **página** rola. |
| `PROPORCAO_PADRAO` | **58 % diagrama / 42 % editor** | `FR-006`, `FR-017` | O que o R0/R1 já entrega (`w-[42%]`): a feature não muda a sensação de quem já usa. |
| `DURACAO_TRANSITO` | **180 ms** | `FR-008`, `FR-009`, `FR-012` | ≈9 quadros a 50fps: longo o bastante para a vista acompanhar, curto o bastante para não ser espera. |
| `PASSO_ZOOM` | **1,2 ×** por acionamento | `FR-001`, `FR-018` | Passo do botão e da tecla (a roda é contínua). ~13 acionamentos de 1 até 4. |

### 1.1 A conta do piso — por que 0,01

O compromisso do `FR-001` é: a faixa **contém** a escala necessária para o diagrama inteiro do
envelope caber na área de referência. O arranjo determinístico do envelope é o que o R0 produz e o
teste de latência do R1 já monta (`tests/e2e/latencia-grafo.spec.ts`): 390 nós declarados em sequência,
colocados por `materializarPosicoes` a partir de `ORIGEM (48, 48)` com passo `dx = 220`, mais 10
molduras.

```
borda direita  = 48 + 389 × 220 + CAIXA_W(170)          = 85.798 px
borda esquerda = 48 − FOLGA da moldura(28)              =      20 px
largura da extensão desenhada                           ≈ 85.778 px

largura útil da área de referência = 1280 − 2 × 24      =  1.232 px
escala necessária = 1.232 / 85.778                      =  0,01436
```

A altura não amarra (extensão ≈142px contra 672px úteis → 4,7×). Logo o piso precisa ser **≤ 0,01436**;
declara-se **0,01**, um número redondo com ~30% de folga, para que um ajuste de espaçamento no arranjo
não desloque a fronteira. `SC-005` fica satisfeito por construção: com a área de referência **ou
maior**, ajustar à tela sobre o envelope determinístico resulta em escala **dentro** da faixa.

**Por que a colocação em fila única não é um defeito a esconder.** O arranjo determinístico do R0 é uma
linha, e é isso que faz o piso ser tão baixo. É dívida **declarada** do ADR-007 ("100 caixas criadas
uma ao lado da outra não formam um diagrama bem disposto"), cujo dono é `layout-automatico`. Quando ele
chegar, o envelope organizado ocupará um retângulo e a escala necessária subirá — e o piso declarado
continuará válido, porque a exigência é de **conter**, não de coincidir. Fazer o contrário — amarrar o
piso ao arranjo corrente — é exatamente o que a spec recusa: a faixa não acompanha nem o conteúdo nem o
tamanho da área.

**Alternativas.** (a) Piso 0,02, como o Figma — descartado: recortaria o envelope determinístico e
faria ajustar à tela mentir no caso comum, que é o que o `FR-001` existe para impedir. (b) Piso
calculado do conteúdo a cada mudança — descartado pela spec (reescalaria debaixo dos pés da pessoa a
cada exclusão). (c) Referência derivada da janela (ex.: 58% de 1440px) — descartado: faria o
compromisso do produto depender da proporção do momento, que é justamente o acoplamento que o
`FR-001` proíbe.

---

## 2. Onde o estado de sessão desta spec vive (ADR-003) — costura 1

**Decisão.** Num slot **irmão de `modelo` e `arranjo`** dentro do store único de sessão
(`EstadoSessao.areaDeTrabalho`, em `src/modelo/store.ts`), marcado como não-serializável:

```ts
areaDeTrabalho: {
  razaoEditor:   number         // fração da largura da área de trabalho que cabe ao editor (padrão 0,42)
  enquadramento: Enquadramento  // { x, y, zoom } — a casa declarada do enquadramento
  modoHand:      'off' | 'persistente' | 'temporario'
  piloto:        Piloto | null  // registrado pelo Canvas ao montar (§7)
}
```

Não num segundo store paralelo (o ADR-003 e a narrativa do `architecture.md` proíbem por nome), e
**não dentro do `Modelo`** — o `Modelo` é a verdade **estrutural** e o cabeçalho dele diz, desde o R0,
que posição, zoom, seleção e foco nunca vivem ali. O lugar certo é ao lado: exatamente onde o
`arranjo`, os `contadores`, o `textoEditor` e o sinal `revelar` já vivem.

**Racional.** É essa posição — e nada mais — que faz `FR-013`/`SC-001` verdadeiros. `serializar` é
`projetar`, e ele projeta o `Modelo`; o que não está no `Modelo` **simplesmente não é emitido**. Não
há passo de limpeza na cópia, não há campo a filtrar, não há teste de "esqueci de remover": o código é
byte-idêntico depois de qualquer rajada porque nenhuma das cinco escritas desta spec chega perto do
`Modelo`. A prova é a mesma que o R0 já roda (`byte-identico*`), com um caso a mais.

**Alternativas.** (a) Guardar o enquadramento só na engine, sem casa declarada — descartado: o ADR-003
quer o efêmero **no modelo de sessão**, e sem casa declarada `ciclo-por-teclado` não teria de onde ler
"área visível" sem falar React Flow. (b) Um `useAreaDeTrabalho` separado — é o "store paralelo" que o
ADR-003 nomeia como o erro a não cometer. (c) Campos dentro do `Modelo` marcados com um flag de
não-serialização — descartado aqui: `Modelo` é o que o codec lê e escreve, e enfiar `zoom` ali
obrigaria o codec a saber ignorá-lo, que é a limpeza-na-hora-de-copiar por outro nome.

---

## 3. Nenhum gesto abre transação — por construção (ADR-009) — costura 2

**Decisão.** As ações do slot (`fixarRazao`, `fixarEnquadramento`, `fixarModoHand`,
`trazerParaAreaVisivel`) escrevem por `set()` direto e **nunca** chamam `commit()`. O precedente já
está no código: `revelarUltimaLinha` do R1 faz `set({ revelar })` fora da fronteira transacional. A
regra fica **executável** por duas guardas:

1. `dependency-cruiser`: proibido `src/areatrabalho/**` → `src/modelo/transacao`.
2. Teste de rajada: 40 gestos (zoom, arrasto do enquadramento, arrasto da divisão) → `historico`
   cresce **0**, e um desfazer reverte o último ato **do modelo** (`SC-009`).

**Racional.** O prompt pede que seja verdade "por construção, não por filtragem", e a diferença é
verificável: com filtragem existiria uma entrada a descartar; aqui não existe entrada. O Princípio IV
diz "nenhum caminho de código altera **o modelo** fora de uma transação" — e nenhum destes altera o
modelo. A fronteira que o princípio protege continua intacta e ganha um vizinho declarado.

**Alternativas.** Registrar as mudanças de vista numa pilha separada de "navegação" (voltar ao
enquadramento anterior) — descartado: é capacidade nova, fora do escopo desta spec, e a spec é
explícita em que desfazer não desfaz enquadramento.

---

## 4. A proporção: CSS resolve `FR-006` quase inteiro — costura 3

**Decisão.** A divisão é **construída à mão** (ADR-001: Tailwind para o layout, shadcn/ui para os
controles), sem biblioteca de painéis. A razão é uma **variável CSS** e os mínimos são `min-width` e
`max-width` em px:

```
.area-de-trabalho   { display: flex; min-width: 800px; }        /* a soma dos mínimos */
.vista-diagrama     { flex: 1 1 auto;  min-width: 480px; }
.vista-editor       { flex: 0 0 var(--razao-editor, 42%);
                      min-width: 320px;
                      max-width: calc(100% - 480px); }
página (raiz)       { overflow-x: auto; }                        /* quem cede abaixo de 800px */
```

Daí saem, **sem uma linha de JavaScript no `resize`**, quatro exigências:

- **A razão é preservada quando a janela muda** (`FR-006`, `SC-007`): `flex-basis` em porcentagem faz
  as duas vistas crescerem e encolherem juntas na mesma fração.
- **Os mínimos recortam a razão por baixo**: o `max-width` do editor é o mínimo do diagrama espelhado.
  A 800px dá exatamente 480 + 320, **sem** rolagem prematura.
- **Abaixo de 800px quem cede é a página**: o `min-width` do contêiner segura a área de trabalho e a
  raiz rola horizontalmente. Nenhuma das duas vistas encolhe abaixo do próprio mínimo; nenhuma some.
- **O arrasto da divisão não passa pelo React**: `Divisao.tsx` escreve `--razao-editor` por `ref`
  durante o gesto e só comita a razão no store ao soltar — 0 re-render dos 400 nós, ≥50fps por
  construção (`SC-003`), pelo mesmo padrão que o R1 usa para o arrasto de nó.

**Racional.** A regra "abaixo da soma dos mínimos quem cede é a página" é incomum e é justamente a
que uma biblioteca de painéis atrapalharia: `react-resizable-panels` raciocina em porcentagem do
contêiner e assume que o contêiner sempre cabe. Reimplementar a exceção por cima dela custaria mais do
que as quatro linhas de CSS acima — e traria dependência nova, contra o hábito do R0/R1 de manter a
superfície pequena.

**O que o CSS não resolve, e é código de produto:** `FR-007` exige que redimensionar preserve o
**centro** do enquadramento. React Flow mantém `(x, y, zoom)` fixos quando o contêiner muda de
tamanho, o que ancora o **canto superior esquerdo**, não o centro. Um `ResizeObserver` sobre a área do
diagrama corrige por aritmética O(1):

```
x' = x + (largura_visível_nova − largura_visível_velha) / 2
y' = y + (altura_visível_nova  − altura_visível_velha)  / 2      // zoom inalterado
```

Medido sobre a **área visível descontada** (§5), e não sobre o retângulo bruto, para que a conta
concorde com `FR-011`. Vale igual para o arrasto da divisão e para a janela mudando de tamanho — um
caminho só, e nenhum reenquadramento por conta própria.

**Alternativas.** (a) `react-resizable-panels` via shadcn/ui `resizable` — descartado acima.
(b) Layout calculado em JS a cada `resize` — descartado: reintroduz trabalho por quadro no gesto e
reimplementa em código o que `flex-basis` já faz certo.

---

## 5. A extensão desenhada e a área visível: uma geometria só — costura 4

### 5.1 Como a extensão de um traçado é obtida

**Decisão.** O traçado é medido pelo **mesmo gerador de caminho que o desenha**. `Conexao.tsx` hoje
chama `getBezierPath` inline; ele passa a chamar `canvas/caminho.ts`, e `areatrabalho/extensao.ts`
chama a mesma função para obter os **pontos de controle** e devolver o **casco convexo** deles como
caixa da extensão.

| Elemento | Extensão desenhada | Origem do dado |
|---|---|---|
| **Nó** | `position + (CAIXA_W, CAIXA_H)` | direto da projeção |
| **Agrupamento** | a moldura (`position + width/height` do nó-container) | direto da projeção |
| **Conexão** | caixa dos pontos de controle do caminho (superset garantido da curva) | `canvas/caminho.ts` |
| **Rótulo de conexão** | caixa centrada em `(labelX, labelY)`, medida pelo medidor de texto injetável, com o `padding`/borda declarados | `canvas/caminho.ts` + `medirTexto` |

**Racional.** Três propriedades caem de graça deste corte:

- **Laço e arestas paralelas entram sozinhos.** Hoje eles não têm desenho próprio; quando tiverem, o
  gerador muda num lugar e a medida acompanha **no mesmo commit**. Não existe estado em que o desenho
  arqueia para fora e a medida não sabe — que é exatamente o defeito que o edge case "o que passa da
  caixa do nó" descreve.
- **`FR-008` e `FR-011` não podem divergir.** Não é disciplina: é a mesma função, com a mesma folga,
  chamada dos dois lugares. `SC-004` ("0 arcos, 0 rótulos, 0 molduras cortados") e `SC-008` ("0 falsos
  positivos") passam a ser o mesmo teste visto de dois ângulos.
- **O casco convexo erra para o lado seguro.** Uma curva de Bézier está contida no casco dos seus
  pontos de controle: a medida é um **superset**, então ajustar à tela pode sobrar folga, nunca
  cortar. E como produto e teste chamam a mesma função, o "centro da extensão no centro da área
  visível, **0 desvios**" do `SC-004` é verdadeiro por construção, não por coincidência de arredondamento.

**Custo e cache.** A varredura é O(n + m) e só roda em ajustar à tela e nas perguntas de visibilidade
— nunca por quadro. O cache é chaveado pela **identidade referencial** dos objetos projetados, o que
faz esta feature depender da invariante de reuso do ADR-004 em vez de ameaçá-la: enquanto a projeção
reusa, a extensão reusa junto.

**Alternativas.** (a) Ler `getBBox()`/`getBoundingClientRect()` do DOM — descartado: força
*layout* de 500 arestas no meio de um gesto que tem barra de 100ms, e depende de os elementos estarem
montados (hoje sim, porque `onlyRenderVisibleElements` está desligado por ADR-004 — mas o próprio ADR
registra a virtualização como saída conhecida, e essa saída derrubaria a medição por DOM).
(b) Caixa exata da cúbica (raízes da derivada) — mais apertada, mas o ganho é estético e o superset já
garante o que a spec cobra; fica registrado como refinamento possível, não como necessidade.
(c) Medir o rótulo pelo DOM — descartado pela mesma razão de (a); o medidor injetável mantém a função
testável em Vitest.

### 5.2 O que "área visível" significa em código

**Decisão.** Em coordenadas de tela, três operações em sequência; depois, conversão para o plano pelo
transform corrente:

```
quadro = retângulo da área do diagrama
       ∩ retângulo da janela                       ← FR-011: a página rolada encolhe a área visível
       − faixas de sobreposição persistente         ← FR-011: o que o produto tapa não conta
```

A interseção com a janela resolve o caso da rolagem horizontal **sem código especial**: quando a
janela cai abaixo de 800px e a página rola, o pedaço da área do diagrama fora da tela some da conta
sozinho. As sobreposições são **registradas**, não presumidas: cada controle persistente declara
`{ borda, espessura }` ao montar, e o quadro é o retângulo original recuado pela maior espessura
declarada em cada borda. Recuar por borda (e não subtrair polígonos) mantém o quadro **retangular**,
que é o que a aritmética de centralizar e de deslocamento mínimo precisa.

Quem paga: a barra de controles desta feature (borda inferior) e a barra de gestos do R1 (borda
superior). Quem lê: `FR-008`, `FR-011` e `FR-012`, todos contra o **mesmo** quadro.

---

## 6. As afordâncias, e por que estas teclas

**Decisão.**

| Gesto | Ponteiro | Sem ponteiro (`FR-018`) |
|---|---|---|
| Aproximar / afastar o zoom | **Ctrl/⌘ + roda** e **pinça** do trackpad (ancorado no ponteiro, `FR-002`) · botões `−` e `+` da barra | **`Ctrl/⌘ + =`** e **`Ctrl/⌘ + −`** (ancorados no centro da área visível) |
| Rolar o plano | **roda pura** — a rolagem herdada do R0 (`FR-005`) continua intacta | — |
| Arrastar o enquadramento | **modo hand** (persistente: alternância na barra; temporária: **segurar `Espaço`**) · **arrasto com o botão do meio** (gesto auxiliar explícito) | **não tem** — e a enumeração do `FR-018` é exaustiva |
| Ajustar à tela | botão `⛶` da barra | **`Shift + 1`** |
| Resetar o zoom | **clique no indicador de nível** (`NN %`) | **`Shift + 0`** |
| Nível corrente observável | indicador `NN %` na barra, atualizado por quadro (coalescido em rAF) | o mesmo indicador |
| Mudar a proporção | arrastar a divisão | **não tem** — idem |

Guarda única para todo o teclado: **nenhum atalho dispara quando o foco está em `input`, `textarea` ou
`contenteditable`** — o editor de código e os rótulos inline continuam donos das suas teclas. É a
mesma guarda que o R1 já usa para `Delete`/`Backspace` no `Canvas.tsx`.

**Racional.**

- **Por que a roda pura não dá zoom.** `FR-005` manda o plano rolável do R0 continuar valendo, e hoje
  `panOnScroll` está ligado com `zoomOnScroll` desligado. Trocar isso quebraria o alcance herdado.
  `Ctrl+roda` e pinça são a convenção de canvas (Figma, Miro) e chegam pela mesma propriedade da engine
  (`zoomOnPinch`), que trata os dois como o mesmo gesto.
- **Por que `Shift+1` / `Shift+0` e nenhuma letra.** ADR-005 é explícito: o keymap do repertório de
  edição é de `ciclo-por-teclado`. Letras são o alfabeto **dele**. Dígitos com `Shift` e os pares
  `Ctrl+=`/`Ctrl+−` são a convenção do gênero e não disputam nada com o repertório de edição — e a
  spec já avisa que teclas para pan livre ou proporção, se um dia existirem, são afordância de lá.
- **Por que o modo hand persistente não ganha tecla.** Pela mesma razão: `H` é uma letra. A forma
  persistente é a alternância na barra (ponteiro, que é o que ela governa); a **temporária** usa
  `Espaço`, que é a convenção universal de "segurar para arrastar a vista" e não é letra.
- **O gesto auxiliar de ponteiro (o botão do meio).** `FR-004` o autoriza desde que seja **explícito
  por construção** e não altere a seleção. Botão do meio é outro botão físico — não é inferência de
  distância, de velocidade nem do que está sob o ponteiro —, e o pan da engine não toca seleção.
  Na engine isso é uma propriedade só: `panOnDrag = modoHand ? [0, 1] : [1]`.
- **O indicador é o botão de resetar.** Mata dois requisitos com um controle: o nível fica legível
  (`FR-001`) e voltar ao tamanho natural é **um** gesto (`FR-009`). É a convenção do Figma, e o
  caminho sem ponteiro existe em paralelo (`Shift+0`), então ninguém fica preso ao ponteiro.
- **O cursor declara o destino do arrasto antes de ele começar** (`FR-004`, `SC-014`): sobre o espaço
  vazio, `crosshair` fora do modo (vai nascer seleção retangular) e `grab`/`grabbing` dentro dele.

**Onde a barra fica, e o que isso custa.** Canto **inferior direito** da área do diagrama, flutuando.
O preço está declarado pela spec e é pago em código: a faixa que ela cobre **sai da área visível**
(§5.2), e é por isso que a barra registra a própria oclusão ao montar em vez de o quadro presumir onde
ela está.

**Alternativas.** (a) Roda pura = zoom, como no Figma — descartado por `FR-005`. (b) `+`/`−` sem
modificador — descartado: colide com digitação e obriga uma guarda mais frágil do que a de foco.
(c) Proibir sobreposição, deixando a barra fora da área do diagrama — descartado pela própria spec,
que **prefere descontar a sobreposição a amarrar a afordância**.

---

## 7. Salta ou transita, e o preço de cada um

**Decisão.** **Transita**, em **180 ms**, por `requestAnimationFrame`, com três propriedades:

1. **Interrompe e assume.** Existe **um** trânsito por vez, guardado em `transito.ts`; qualquer gesto
   novo — outro ajustar, um zoom, um arrasto, um `FR-012` — cancela o quadro pendente e assume o
   comando. Nada enfileira e nada é ignorado (`SC-012`).
2. **O destino é o do salto.** O alvo `(x, y, zoom)` é calculado **antes** de o trânsito começar, pela
   mesma função pura que um salto usaria. O trânsito interpola; ele não decide para onde ir. Se
   for interrompido, o estado final é o do gesto que assumiu — nunca um meio-termo.
3. **A âncora do `FR-015` vale a cada quadro.** É a parte que exige código, e está em §8.

**Racional — por que o trânsito não estoura o orçamento.** Um quadro de trânsito é **um transform CSS
do painel**: 0 reprojeções, 0 re-renders dos 400 nós, 0 recomputações de extensão. O trabalho caro que
o ADR-004 mede em ajustar à tela (44,5ms em 800 nós) é **pintura** — repintar o diagrama inteiro numa
escala nova —, e ele acontece igual com salto ou com trânsito; o trânsito o espalha por ~9 quadros em
vez de concentrá-lo em um. O único trabalho novo por quadro é O(1): interpolar três números e
re-ancorar um arrasto, se houver. Ainda assim o fps do trânsito no envelope entra na mesma suíte de
`SC-003` como portão medido, e não como afirmação.

**Por que transitar em vez de saltar.** Ajustar à tela é o **gesto de recuperação** — a pessoa o aciona
justamente quando não sabe mais onde está. Saltar entrega o destino certo e destrói a única informação
que ela precisa: de onde ela veio. Interpolar `(x, y, zoom)` mantém a continuidade espacial, que é o
que transforma "apareceu outro diagrama" em "a vista viajou até lá".

**Alternativas.** (a) Saltar — mais barato e trivialmente dentro de `SC-012`; descartado pelo argumento
acima, e registrado como recuo seguro caso o portão de fps reprove no envelope, já que a spec declara
os dois estados finais idênticos. (b) Transição da própria engine (`setViewport` com `duration`, que
usa a transição do d3-zoom) — descartado: a interrupção fica sob controle do d3 e a re-ancoragem do
arrasto por quadro não tem gancho; com rAF próprio, "interrompe e assume" e a âncora do `FR-015` são
código nosso e testáveis. (c) Duração proporcional à distância — descartado: introduz espera variável
sem promessa de produto que a justifique.

---

## 8. Os três lugares em que a engine precisa de produto por cima (ADR-002)

### 8.1 Descer abaixo do piso sem perder a saturação

React Flow satura o zoom em `minZoom`/`maxZoom`. A spec pede três coisas que um par fixo não dá:
ajustar à tela **desce abaixo** do piso; estando abaixo, afastar por gesto contínuo **satura no nível
corrente** (não salta para o piso); e aproximar traz de volta para dentro da faixa.

**Decisão: `minZoom` dinâmico.** `minZoom = min(PISO_ZOOM, zoomCorrente)`, recalculado ao fim de cada
gesto de enquadramento (nunca por quadro). `maxZoom = TETO_ZOOM`, fixo. Fica assim: em operação normal
o piso é 0,01; depois de um ajuste que terminou em 0,006, o piso vira 0,006 — afastar mais não faz
nada, aproximar sobe, e ao cruzar 0,01 de volta o piso volta a ser 0,01. E "encolher ou apagar conteúdo
não reescala por conta própria" é verdade porque **nada** reexecuta o ajuste.

*Alternativa descartada:* `minZoom` tecnicamente irrisório (0,0001) com a saturação do produto imposta
num interceptador de roda — reimplementa dentro de casa o que a engine já faz certo, por quadro, no
caminho mais quente que existe.

### 8.2 Centralização determinística e o alvo de cada gesto

`fitView` da engine enquadra com *padding* relativo e não promete centro exato quando o teto de 1:1
dita a escala — que é justamente o caso em que a spec exige resultado único (diagrama pequeno,
`SC-004`). Os quatro alvos são aritmética de produto, em `enquadramento.ts`:

```
ajustar:  zoom = min( (W − 2f)/w , (H − 2f)/h , 1 )          // nunca amplia além do natural
          x, y tais que o CENTRO da extensão caia no CENTRO do quadro
resetar:  zoom = 1, preservando o ponto do plano no centro do quadro
abrir:    com conteúdo → ajustar;  vazio → zoom 1, centro do quadro no ponto de nascimento do 1º elemento
trazer:   zoom inalterado; translação MÍNIMA que põe a extensão inteira dentro do quadro recuado de f;
          nula se já está dentro; se não couber, alinha o CANTO DE PARTIDA da ordem de leitura
```

O `zoom` do ajuste **não** é recortado pelo piso — a função não conhece a faixa; quem conhece é o gesto
contínuo (§8.1). É essa separação que faz `FR-001` e `FR-008` conviverem sem exceção escrita à mão.

### 8.3 O canto de partida da ordem de leitura (`FR-012`)

Uma regra só para nó, conexão e agrupamento, aplicada sobre a **extensão desenhada** e relativa à
orientação corrente — que é de `layout-automatico` (`RF-16`, ADR-007) e entra por uma costura de um
valor só:

| Orientação | Canto de partida |
|---|---|
| `TB` / `TD` | superior-esquerdo |
| `BT` | inferior-esquerdo |
| `LR` | superior-esquerdo |
| `RL` | superior-direito |

Mesmo sentido do Princípio VI, medido nas **4 orientações** por teste de unidade. Hoje o R0/R1 fixa
`TD` no cabeçalho e o codec descarta a orientação ao analisar; `orientacao.ts` expõe o valor corrente
num ponto único, para que `layout-automatico` o substitua sem tocar em `FR-012`.

---

## 9. O que não se interrompe: o arrasto por baixo do enquadramento (`FR-015`) — costura 5

**O problema, em concreto.** O arrasto de nó do React Flow calcula `posição = ponto_do_plano_sob_o_ponteiro
− deslocamento_capturado_no_início`. Se o enquadramento muda **sem** o ponteiro se mexer, nenhum evento
dispara e o nó fica parado — correto. Mas no próximo movimento do ponteiro, `ponto_do_plano_sob_o_ponteiro`
é recalculado com o transform **novo** e o elemento **salta** pela diferença. É exatamente o "não pode
saltar" do `US1-7`.

**Decisão.** Uma **re-ancoragem** O(1) a cada mudança de enquadramento durante um arrasto: recalcula o
deslocamento capturado a partir do transform corrente, de modo que a posição do elemento **no plano**
fique invariante. Ela roda em três situações: no zoom por roda/tecla/controle, no arrasto do
enquadramento e **a cada quadro do trânsito**. Onde o zoom é ancorado no ponteiro (`FR-002`), a conta
dá zero por construção — o ponto do plano sob o ponteiro não mudou —, o que serve de asserção natural
nos testes.

**Racional.** É a leitura literal do `FR-015`: o arrasto está preso ao **ponto do plano**, não ao ponto
da tela. Sem isso a spec teria que escolher entre cancelar o arrasto (que o `FR-015` proíbe), deixá-lo
inerte (idem) ou inventar auto-pan de borda (que o edge case rejeita por nome). Custo: duas subtrações
por quadro, só quando há arrasto em curso.

**Racional do resto do `FR-015`.** Seleção e rótulo em edição sobrevivem **por não serem tocados**:
nenhum gesto desta spec escreve em `Modelo`, em seleção ou em foco, e mudar `(x, y, zoom)` não
desmonta componente nenhum. O editor inline do rótulo acompanha o elemento porque é filho do nó no
painel transformado. O que **poderia** quebrar isso é a remontagem do componente — e ela já é proibida
pela invariante de reuso (ADR-004/ADR-005, Condição 2), que esta feature não toca.

---

## 10. A abertura (`FR-017`): um gatilho, uma vez

**Decisão.** Um gatilho de disparo único: **armado** ao montar a área de trabalho, **dispara na
primeira projeção com conteúdo** e **desarma ao disparar**. Com conteúdo → ajustar à tela (a mesma
função do `FR-008`, mesmo destino, mesma folga, mesmo centro). Vazio → o padrão declarado (zoom 1, o
centro do quadro no ponto em que a colocação determinística do R0 faz nascer o primeiro elemento —
`ORIGEM + (CAIXA_W/2, CAIXA_H/2)`).

**Racional.** O disparo único é o que separa `FR-017` de `FR-007`: a abertura enquadra **uma vez**,
porque ali não há enquadramento escolhido por ela a preservar; depois disso o produto não enquadra
sozinho nunca mais. Amarrar o gatilho à **primeira projeção com conteúdo** (e não ao `mount`) cobre os
três casos que a spec enumera com um caminho só — sessão nova, aba reaberta com o rascunho restaurado
e documento inteiro colado —, porque nos três o conteúdo chega **depois** da montagem. O gatilho
também depende de o quadro já ter tamanho medido, o que evita ajustar contra um retângulo de zero.

**Alternativas.** (a) Disparar no `mount` — descartado: com rascunho restaurado o conteúdo chega um
tique depois e a pessoa veria o quadro vazio, que é o "pior primeiro instante possível" do edge case.
(b) Reajustar a cada vez que o conteúdo muda de tamanho — descartado por `FR-007` e por `SC-007`
(0 reenquadramentos automáticos). (c) Recuperar o enquadramento da sessão anterior — descartado pelo
ADR-010: o rascunho guarda modelo e arranjo, e o enquadramento **deriva** do conteúdo presente.
