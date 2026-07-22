# Contrato — Codec mermaid (o único caminho texto ⇄ modelo)

ADR-006/008. Superfície única que **não sabe de que tipo é o documento**. No R0, só a família Flowchart
tem reconhecedores registrados, e só dois: cabeçalho e nó retangular.

## Superfície

```ts
// texto → modelo. NUNCA devolve "nada" (ADR-006): sempre um modelo + duas listas de severidade.
function analisar(texto: string, opcoes?: { tolerante?: boolean }): {
  modelo: Modelo
  erros: Achado[]    // derruba o statement ofensor
  avisos: Achado[]   // sinaliza sem derrubar (ex.: rótulo ainda sem fecho — estado de digitação)
}

// modelo → texto. Normalizador com PONTO FIXO: analisar(serializar(m)) ≡ m; serializar é idempotente.
// Exposto em duas granularidades (research §3):
function serializar(modelo: Modelo): string          // documento inteiro — SÓ em teste (round-trip/ponto fixo)
function emitirNo(no: No): string                    // UM statement — usado em runtime pela escrita cirúrgica

// comparação estrutural (juiz do round-trip; ignora ruído de ordem)
function normalizar(modelo: Modelo): ModeloNormalizado

type Achado = { linha: number | null; trecho: string; mensagem: string }
```

`opcoes.tolerante` (default **true**): estado de digitação é legítimo (rótulo sem fecho vira parcial).
`tolerante=false` é braço de teste — regride a prévia enquanto se digita, que é o que a spec proíbe
(base do SC-002; ADR-006 mede 70 perdas no braço estrito, 0 no tolerante).

## Registro de reconhecedores (o vocabulário como dado, não como código descartável)

```ts
interface Reconhecedor {
  // devolve true se consumiu a linha/statement; empurra nós/alertas no modelo.
  // NUNCA materializa parcialmente: ou casa a forma inteira, ou devolve false (→ ilegível).
  tentar(statement: string, ctx: Ctx): boolean
}

// R0 registra EXATAMENTE estes dois na família Flowchart:
registrar('flowchart', [reconhecedorCabecalho, reconhecedorNoRetangular])
```

Specs seguintes registram mais no mesmo núcleo (`elementos-grafo-dirigido` → conexão;
`estilo-de-elementos` → shapes; `tipo-*` → outras famílias). O núcleo **não** referencia nomes de
família (checagem do Princípio XII).

## Reconhecedor: cabeçalho (a exceção nomeada da FR-005)

Reconhece as **cinco** declarações do escopo, **com ou sem orientação**, em **qualquer posição**, e as
**descarta** (nunca vira nó):

```
flowchart | flowchart TD | graph | graph LR   →  descartado; no R0 fixa palavraChave=flowchart, orientacao=TD
stateDiagram | stateDiagram-v2 | classDiagram | sequenceDiagram | erDiagram [orientação?]  →  descartado, NÃO troca o tipo
```

Conjunto **fechado**: `pie`, `gantt`, `mindmap`… **não** são reconhecidos → caem na regra comum
(identificador sozinho → nó rotulado com a própria palavra). *(FR-005; clarificações spec linhas 48, 60.)*

## Reconhecedor: nó retangular (o vocabulário de nó do R0)

Casa **só** duas formas:

```
nN                →  Nó { id: 'nN', rotulo: null }              // rótulo exibido = o próprio id
nN[texto]         →  Nó { id: 'nN', rotulo: decodificar(texto) }
nN["texto"]       →  idem; aspas delimitam e NÃO entram no rótulo (FR-005/FR-011)
nN[texto          →  tolerante: rótulo parcial + alerta 'em-digitacao' (FR-018)
```

**Guarda de ilegibilidade (research §2a):** antes de tentar identificador sozinho, se o statement
contém **token de link** (`-->`,`---`,`-.->`,`==>`,`~~~`,`--x`,`<-->`,…) **ou outro delimitador de
shape** (`(`,`{`,`>`,`((`,…), o reconhecedor devolve `false` → linha **ilegível por inteiro**, nenhum nó
nasce (nem os que o mermaid de fora extrairia). O identificador do R0 é mais estrito que o `idValido`
permissivo do spike.

## Invariantes verificáveis (portões)

| Invariante | Teste | Requisito |
|---|---|---|
| Análise nunca devolve vazio | prefixos do corpus → sempre um modelo; 0 perdas de nó real | SC-002 · Princípio IX |
| Ponto fixo | `serializar` idempotente; `analisar∘serializar ≡ id` (normalizado) sobre o corpus | ADR-006 |
| Round-trip fiel | código projetado aceito por `mermaid.parse()` e mesmo SVG | SC-001 · Princípio V |
| Rótulo byte a byte | `n1["Nó, A"]` → `Nó, A`; corpus de rótulos | Princípio VIII |
| Sem materialização parcial | `a --> b`, `n1(Nó A)` → 0 nós; linha permanece no texto | FR-005 |
| mermaid fora do runtime | checagem de fronteira de importação | Princípio X |
