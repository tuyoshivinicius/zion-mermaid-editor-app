# Data Model — Cano modelo ⇄ código (R0)

A única verdade é o **Modelo** em memória (ADR-003). Canvas e código são vistas dele. O que segue é o
recorte do R0: só o **nó** materializa; conexões, shapes, grupos e estilos existem no núcleo do codec
mas não são vocabulário desta spec. Campos marcados **efêmero** vivem no estado de sessão e **nunca**
são serializados no código (Princípio V).

Convenção de identificadores em português, seguindo o spike do ADR-006.

---

## Entidade: Modelo

A única verdade estrutural do diagrama. Projetado para o canvas e serializado para o código; nenhuma
das duas vistas é dona dele.

| Campo | Tipo | Notas |
|---|---|---|
| `palavraChave` | `'flowchart'` | Fixo no R0 (o tipo não troca — `tipo-*`). `graph` é aceito na leitura, normaliza para `flowchart` no que o produto escreve. |
| `orientacao` | `'TD'` | Constante do produto no R0 (FR-019). Escolher/trocar é `layout-automatico`. |
| `preservado` | `{ frontmatter, diretivas[], comentarios[] }` | Preâmbulo lossless do núcleo (ADR-003/008). No R0 não é vocabulário editável, mas **sobrevive ao ciclo** e viaja na cópia como texto da pessoa (FR-017). |
| `nos` | `No[]` | Ver abaixo. Único agregado que o R0 materializa. |

> O núcleo do codec também comporta `conexoes`, `grupos`, `classDefs`, `linkStyles`, `cliques` (formas
> provadas no spike). No R0 esses agregados **não têm reconhecedor registrado** (research §2): linhas
> assim são trecho ilegível, não entram no modelo, e permanecem no texto (FR-017). A costura existe;
> o vocabulário não.

### Entidade: Nó

O único elemento que o R0 materializa.

| Campo | Tipo | Efêmero? | Notas |
|---|---|---|---|
| `id` | `string` | não | **Chave** do nó no código (FR-016). Opaco e estável; não deriva do rótulo, não muda quando o rótulo muda. Do contador (`n1`, `n2`…) quando nasce por gesto, ou o que a pessoa escreveu no código. |
| `rotulo` | `string \| null` | não | Texto do rótulo. `null` = identificador sozinho (`nN`), cujo rótulo exibido é o próprio id (FR-005). Nasce "Nó N" no gesto (FR-013). Texto é da pessoa; volta byte a byte (Princípio VIII). |
| `alertas` | `Alerta[]` | não | Duas origens: `em-digitacao` (rótulo sem fecho, FR-018) e `expressividade` (o *checker* do rótulo; a **marca visível** é `codigo-de-entrada`). Marca é propriedade do modelo, não da direção de entrada (ADR-006). |

**Fora do R0 (costura, sem uso):** `forma` (sempre `retangulo` no vocabulário do R0 — `estilo-de-elementos`),
`classes`, `estilo`. Não são lidos nem escritos pelo R0.

**Regras de validação / leitura (FR-005, FR-016):**

- Uma linha materializa nó **só** nas formas `nN` ou `nN[…]` / `nN["…"]` (delimitador retangular, um só).
- Linha com **token de link** ou **outro delimitador de shape** → ilegível **por inteiro**, sem
  materialização parcial (research §2a).
- Identificador **repetido** no texto → **um** nó só; a **última** declaração de rótulo prevalece
  (FR-016). O produto nunca escreve id repetido.
- Aspas **delimitam** o rótulo e **não** entram nele: `n1["Nó, A"]` → rótulo `Nó, A`, caixa sem aspas (FR-005/FR-011).
- Rótulo **tolerante**: `n1[Nó ` (sem fecho) → rótulo `Nó ` acompanhando letra a letra (FR-018), com alerta `em-digitacao`.

---

## Entidade: Arranjo (posição) — **efêmero, de sessão**

Onde cada nó está na área do diagrama. Conforto de sessão; **nunca** projetado no código (FR-008,
Princípio V). Vive no **mesmo store** do modelo, não num segundo store paralelo (ADR-003, research §5).

| Campo | Tipo | Notas |
|---|---|---|
| `porId` | `Map<string, {x, y}>` | Posição **lembrada por identificador** (FR-015), inclusive de ids que no momento não têm nó (linha apagada/recortada). |

**Transições:**

| Evento | Efeito no arranjo |
|---|---|
| Criar nó por gesto (FR-001) | grava `porId[id] = ponto do duplo-clique` |
| Arrastar nó (FR-007) | grava `porId[id] = onde soltou` |
| Renomear id (FR-018) | **transfere** `porId[antigo] → porId[novo]`; remove o antigo |
| Materializar do código (FR-015) | se `porId[id]` existe **e o lugar está livre** → usa; senão colocação local determinística |
| Rolar o plano | nada (rolar é estado de vista, não move nada — FR-009) |

**Colocação local determinística (FR-015, SC-008):** ancorada no elemento **anterior na ordem do
código**, em espaço livre próximo, sem mover ninguém. Sem elemento anterior (primeiro nó, texto do
zero) → **origem fixa** da área: ponto constante, **independente do tamanho da janela e da sessão**.
Mesma cadeia de código → mesmas coordenadas, em qualquer tela. O produto **nunca** empilha duas caixas.

---

## Entidade: Contador de sessão — **efêmero, de sessão**

| Campo | Tipo | Notas |
|---|---|---|
| `proximo` | `number` | Próximo número livre da sequência. **Monotônico**: nunca reusa (FR-016), nem depois da linha apagada. Avança até um valor **livre** quando o próximo já está ocupado no texto da pessoa. |

Emite `n{proximo}` e o rótulo `Nó {proximo}` (FR-013): um contador só para id e rótulo.

---

## Entidade: Código mermaid — **a projeção em texto (a vista do editor)**

Não é uma estrutura à parte: é **o texto do editor**, que é **da pessoa** (FR-017). O modelo é derivado
dele pela análise (texto→modelo) e ele é escrito **cirurgicamente** pelos gestos (research §3), nunca
re-serializado inteiro em runtime. A **cópia** é esse mesmo texto com a declaração de tipo normalizada
(research §4).

| Propriedade | Regra |
|---|---|
| Semeadura | Na abertura, o editor nasce com `flowchart TD` (FR-019), semeado **uma vez**. |
| Propriedade | O texto é da pessoa: se ela apaga o cabeçalho, o produto **nunca** o recoloca no editor (FR-019). |
| Escrita por gesto | Só a linha do elemento afetado muda; o resto fica **byte-idêntico** (FR-017/SC-009). |
| Efêmero ausente | Posição/zoom/seleção/foco **nunca** aparecem (FR-008/SC-004). Serializar é projetar (ADR-003). |

---

## Estado de sessão (o store único, ADR-003)

```text
SessaoStore
├── modelo: Modelo            // a única verdade estrutural (serializável → vira código)
├── arranjo: Arranjo          // efêmero: posição por id (nunca serializado)
├── contador: Contador        // efêmero: próximo id livre
└── textoEditor: string       // a vista do editor — texto da pessoa (escrito cirurgicamente)
```

Toda mutação atravessa uma **transação** (ADR-009/Princípio IV) e carrega a **origem** (canvas | editor)
para quebrar o eco entre as vistas (ADR-003). A rajada de digitação **coalesce** num ato (FR-012/SC-007).
O **gesto** de desfazer/refazer é `desfazer-e-refazer`; a transação e a costura do histórico (que governa
as duas metades — modelo e arranjo) já existem aqui.

## Rastreabilidade entidade → requisito

| Entidade | Requisitos |
|---|---|
| Modelo / Nó | FR-004, FR-005, FR-006, FR-013, FR-016, FR-018; Princípios V, IX |
| Arranjo | FR-007, FR-008, FR-009, FR-015; SC-004, SC-008; Princípios V, VII |
| Contador | FR-013, FR-016 |
| Código mermaid (texto do editor) | FR-002, FR-014, FR-017, FR-019; SC-001, SC-009 |
| Transação (store) | FR-012; SC-007; Princípio IV |
