# Data Model — Elementos do grafo dirigido (R1)

A única verdade é o **Modelo** em memória (ADR-003). Canvas e código são vistas dele. O R1 **enche o
vocabulário** do R0: o `Modelo` ganha dois agregados — **Conexão** e **Agrupamento** — ao lado do **Nó**,
e o **Nó** ganha durabilidade de texto e pertencimento. Campos marcados **efêmero** vivem no estado de
sessão e **nunca** são serializados no código (Princípio V). Convenção de identificadores em português,
herdada do R0.

> **Fronteira núcleo × família (ADR-008, research §1):** os *tipos de dado* abaixo vivem no núcleo
> (`src/modelo/modelo.ts`) — são o vocabulário comum às três famílias. A *gramática* (como cada um lê e
> escreve como Flowchart, e o que é ruído de ordem) vive em `codec/flowchart/`. O núcleo nunca soletra
> `-->` nem `subgraph`.

---

## Entidade: Modelo

A única verdade estrutural. Projetado para o canvas e serializado para o código; nenhuma vista é dona.

| Campo | Tipo | Notas |
|---|---|---|
| `palavraChave` | `'flowchart'` | Herdado, fixo (o tipo não troca — `tipo-*`). |
| `orientacao` | `'TD'` | Constante do produto (orientação é `layout-automatico`). |
| `preservado` | `{ frontmatter, diretivas[], comentarios[] }` | Preâmbulo lossless do núcleo (ADR-003/008). |
| `nos` | `No[]` | Ver abaixo (estendido). |
| `conexoes` | `Conexao[]` | **NOVO.** Arestas dirigidas. Ordem = ruído (juiz `normalizar` ordena por id). |
| `agrupamentos` | `Agrupamento[]` | **NOVO.** Blocos `subgraph`. Ordem = ruído. |

O invariante de pertencimento é **global ao modelo**: cada id (de nó ou de agrupamento) aparece em
`membros` de **no máximo um** `Agrupamento` (vínculo exclusivo). Helpers do núcleo: `paiDe(m, id)`,
`membrosTransitivos(m, id)`, `conexoesPresas(m, idNo)`, `cascataEsvaziamento(m, idsRemovidos)`.

---

### Entidade: Nó (estendido)

| Campo | Tipo | Efêmero? | Notas |
|---|---|---|---|
| `id` | `string` | não | **Chave** no código (`nN`). Opaca, estável; não deriva do rótulo (R0). |
| `rotulo` | `string \| null` | não | Texto **integral** da pessoa (byte-exato). `null` = sem rótulo declarado → exibe o próprio id (R0). **Vazio (`''`)** é escrita legítima: caixa **sem rótulo**, o produto NÃO repõe o neutro nem exibe o id (`FR-018`). |
| `alertas` | `Alerta[]` | não | `em-digitacao` (R0) + **`expressividade`** (o checker; a **marca**). A marca é observável no diagrama (`data.marcado`) e **durável** na releitura (`FR-006`). |

**Fora do R1 (costura, sem uso):** `forma` (sempre retângulo — `estilo-de-elementos`), `classes`, `estilo`.

**Pertencimento** não é campo do Nó: é derivado de `Agrupamento.membros` (research §1). Um nó criado
**dentro** da moldura nasce **solto** — o pertencimento nunca é geométrico (`FR-003`).

---

### Entidade: Conexão — **NOVA**

A aresta **dirigida** entre dois **nós**. Só nó é ponta (agrupamento, não — `FR-001`).

| Campo | Tipo | Efêmero? | Notas |
|---|---|---|---|
| `id` | `string` | **sim (de sessão)** | `eN`, opaco, sequencial, **nunca reusado**. **NÃO é escrito no código** (aresta flowchart não tem token de id): vive só na sessão, para seleção/duplicação/histórico referenciarem (research §4). |
| `origem` | `string` | não | id do nó de origem. |
| `destino` | `string` | não | id do nó de destino. PODE ser `=== origem` (**laço**). |
| `texto` | `string \| null` | não | Texto **integral** da conexão (rótulo da aresta). Nasce `null` (neutro, `RN-06`). Byte a byte ou marcado (`FR-006`). |
| `conectivo` | `string` | não | Lexema do conectivo lido (`-->`, `==>`, `-.->`, …); default `-->` no gesto. Preservado para escrita byte-fiel; **não** é controle de estilo (research §9, RN-06). |
| `alertas` | `Alerta[]` | não | `expressividade` do texto da conexão (mesmo checker do rótulo de nó). |

**Identidade independe das pontas e do texto (`FR-007`):** reescrever o texto não troca a conexão;
**arestas paralelas** (mesmo par) e **laços** coexistem porque cada gesto cria uma `Conexao` de id
próprio — o produto não funde nem recusa a repetida (`FR-001`). Sem posição própria: acompanha as pontas.

**Reconciliação na releitura (research §4):** após reanalisar o texto, o store reassocia cada aresta
relida à conexão viva por **(origem, destino, ordinal entre paralelas)**, transferindo o `id eN` e
preservando `texto`/marca durável. Sem token no código, é isso que mantém a seleção estável.

---

### Entidade: Agrupamento — **NOVO**

O elemento que **reúne nós e outros agrupamentos** (aninhamento). Consome **1 vaga de nó** no envelope.

| Campo | Tipo | Efêmero? | Notas |
|---|---|---|---|
| `id` | `string` | não | `subN`, opaco, sequencial, nunca reusado. **É escrito** no código (id do `subgraph`). Disjunto do namespace de nó (prefixo `sub`). |
| `titulo` | `string \| null` | não | Texto **integral** do título. Nasce **neutro** (`Grupo N`) no gesto de agrupar (`FR-002`); a **cópia** copia o do original (`FR-010`). `null` = `subgraph` só com id. Editar o título por gesto é fora de escopo (edita-se pelo código). |
| `membros` | `string[]` | não | ids dos membros **diretos** (nós e/ou agrupamentos). Vínculo **exclusivo** e global (um dono no máximo). Ordem = ruído. |
| `alertas` | `Alerta[]` | não | `expressividade` do título. |

**Regras de vida (research §2, §3, §5; medições §0):**

- **Nasce** por: agrupar seleção (`FR-002`), adicionar a um existente (`FR-016`), ou **menção do id
  dentro de um bloco** no código — menção isolada **ou** ponta de aresta escrita ali (`FR-019`, M1/M2).
- **Aninha por menção** (M3): mencionar o id de um agrupamento dentro de outro bloco o torna membro —
  o produto escreve a menção isolada, **sem realocar** o bloco do filho (`FR-014`/`SC-009`).
- **Vínculo exclusivo, primeiro-vence** (M4): id mencionado em dois blocos fica com o **primeiro**; o
  bloco perdedor sem membro exclusivo vira agrupamento de **0 membros** (moldura exibida) — o código da
  pessoa **nunca** é reescrito.
- **Esvaziado por gesto deixa de existir**, em **cascata** pelos níveis aninhados, no **mesmo ato**
  (`FR-011`/`FR-012`). Título editado não salva a moldura (título é texto, não membro).
- **Bloco vazio escrito à mão** (M5) **existe e é exibido** enquanto o código o declara (`FR-019`); a
  proibição de moldura vazia governa **gestos**, não a escrita da pessoa.
- Moldura na área do diagrama (posição/tamanho) é **arranjo de sessão** — nunca projetada; a **composição
  de membros** é estrutura (projetada).

---

## Entidade: Seleção — **efêmero, de sessão** (NOVO módulo `src/modelo/selecao.ts`)

O conjunto de elementos que a pessoa manipula agora. Estado de sessão puro: **nunca** projetado (`RN-01`).

| Campo | Tipo | Notas |
|---|---|---|
| `nos` | `Set<string>` | ids de nós selecionados. |
| `agrupamentos` | `Set<string>` | ids de agrupamentos selecionados. |
| `conexoes` | `Set<string>` | derivada: entra quando as **duas** pontas entram (`FR-008`). |

**Operações:**

| Operação | Regra |
|---|---|
| Seleção retangular (`FR-008`) | **contenção** (elemento inteiro dentro); conexão **derivada** (duas pontas) |
| Clique (`FR-008`) | elemento **mais específico** sob o ponteiro (membro > agrupamento); moldura/título → o agrupamento; vazio fora de moldura → limpa |
| Acrescentar/remover da seleção | gesto de ponteiro com modificador (tecla exata: UI mínima; teclado é `ciclo-por-teclado`) |
| **Normalizar (antes de todo ato em bloco)** | expande pelo **fecho transitivo de pertencimento** e **deduplica** → cada elemento afetado **exatamente 1×** (`SC-006`) |

---

## Entidade: Arranjo (posição) — **efêmero, de sessão** (estendido)

Herdado do R0 (`Map<string, Pos>` por id). O R1 acrescenta a **moldura do agrupamento** (posição +
tamanho, derivados do arranjo dos membros) — também efêmera, também no mesmo store. Conexão **não** tem
entrada de arranjo (não tem posição própria). Regras do R0 valem; o membro herda a colocação local
próximo de quem o criou (`FR-003`/Princípio VII). Arrastar para dentro/fora da moldura é **só arranjo**:
**0** mudanças de pertencimento, código **byte-idêntico** (`SC-004`, `FR-009`).

---

## Entidade: Contador de sessão — **efêmero** (generalizado, research §8)

| Espécie | Emite | Observa o código? | Texto neutro |
|---|---|---|---|
| Nó | `nN` | **sim** (id escrito) | `Nó N` |
| Agrupamento | `subN` | **sim** (id do `subgraph`) | `Grupo N` |
| Conexão | `eN` | **não** (id nunca escrito) | — (nasce sem texto) |

Cada um monotônico, nunca reusa. No `emitir`, `ocupados` inclui **todos** os ids do documento (nós +
agrupamentos), de modo que espécie nenhuma colide com id escrito à mão.

---

## Entidade: Código mermaid — **a projeção em texto (a vista do editor)**

Como no R0: é **o texto do editor**, da pessoa (`FR-017`), derivado por análise e escrito
**cirurgicamente** (research §3), nunca re-serializado inteiro em runtime.

| Propriedade | Regra |
|---|---|
| Declaração no fim | Todo elemento novo (nó, conexão, **agrupamento**, cópia) nasce no **fim** do documento (`FR-017`). |
| Pertencimento por menção | Membro = **menção do id** dentro do bloco; agrupar/adicionar/duplicar-membro **inserem a menção** e **não realocam** declaração (`FR-014`/`SC-009`). |
| Escrita cirúrgica | Só as linhas do elemento afetado mudam; o resto **byte-idêntico**, inclusive espaçamento e trechos ilegíveis. |
| Conexão sem token de id | A aresta sai como `origem conectivo destino` (ou com `\|texto\|`); **nenhum** id de sessão viaja. |
| Efêmero ausente | Posição/tamanho de moldura/seleção/foco/zoom **nunca** aparecem (`SC-004`). |
| Leitura ⊇ escrita | O produto **lê** as duas formas de pertencimento (menção isolada e aresta-no-bloco, `FR-019`) mas **escreve** só a isolada. |

---

## Estado de sessão (o store único, ADR-003)

```text
SessaoStore
├── modelo: Modelo            // única verdade estrutural (nós + conexões + agrupamentos → vira código)
├── arranjo: Arranjo          // efêmero: posição por id + moldura de agrupamento (nunca serializado)
├── selecao: Selecao          // efêmero: o que a pessoa manipula agora (nunca serializado)
├── contador: Contadores      // efêmero: próximo id livre por espécie (n / e / sub)
└── textoEditor: string       // a vista do editor — texto da pessoa (escrito cirurgicamente)
```

Toda mutação atravessa **uma transação** (Princípio IV) e carrega a **origem** (canvas | editor) para
quebrar o eco (ADR-003). Um ato em bloco / uma cascata de esvaziamento é **1** entrada de histórico
(`FR-012`); a rajada de digitação/colagem **coalesce** (`FR-007`). A reconciliação da releitura (arranjo,
id de conexão, texto integral marcado) é do store, não do núcleo (research §4).

## Rastreabilidade entidade → requisito

| Entidade | Requisitos |
|---|---|
| Modelo (invariante de pertencimento) | FR-002, FR-011, FR-013, FR-019; SC-001, SC-008; Princípios V, IX, XII |
| Nó (estendido) | FR-003, FR-004, FR-006, FR-018; SC-002; Princípio VIII |
| Conexão | FR-001, FR-004, FR-006, FR-007, FR-010, FR-011; SC-002, SC-007; Princípios V, VIII |
| Agrupamento | FR-002, FR-010, FR-011, FR-016, FR-019; SC-001, SC-008, SC-009 |
| Seleção | FR-008, FR-009, FR-010, FR-011; SC-004, SC-006; Princípios V, VII |
| Arranjo (+ moldura) | FR-003, FR-009, FR-015; SC-004; Princípios V, VII |
| Contador | FR-010; RN-06 |
| Código (texto do editor) | FR-014, FR-017; SC-001, SC-009 |
| Transação (store) | FR-012; SC-006, SC-008; Princípio IV |
