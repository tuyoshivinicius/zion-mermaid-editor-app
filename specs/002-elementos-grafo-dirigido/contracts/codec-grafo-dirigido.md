# Contrato — Codec do grafo dirigido (o vocabulário que enche o cano)

ADR-006/008. Estende a superfície única do R0 (`analisar`/`serializar`/`normalizar`) com o vocabulário
da conexão e do agrupamento. **O núcleo continua não sabendo de que tipo é o documento** e **não nomeia
família** (Princípio XII): a gramática nova vive em `codec/flowchart/conexao.ts` e
`codec/flowchart/agrupamento.ts`; o núcleo só ganha a mecânica **agnóstica** de pilha de container.

## Superfície do núcleo (estendida)

```ts
// texto → modelo. NUNCA devolve "nada" (Princípio IX): sempre um modelo + duas listas de severidade.
function analisar(texto: string, opcoes?: { tolerante?: boolean }): {
  modelo: Modelo   // agora com nos[], conexoes[], agrupamentos[]
  erros: Achado[]  // derruba o statement
  avisos: Achado[] // sinaliza sem derrubar (subgraph sem end, aresta incompleta)
}

// O Ctx ganha a pilha de container — agnóstica: o núcleo não sabe que o container é um subgraph.
interface Ctx {
  /* … R0: modelo, tolerante, erros, avisos, linha … */
  containerStack: string[]            // ids dos agrupamentos abertos (topo = mais interno)
  abrirContainer(id: string): void    // um reconhecedor de família chama ao abrir um bloco
  fecharContainer(): void             // …e ao fechar
  registrarMembro(id: string): void   // materializar com a pilha não-vazia → membro do topo (exclusivo)
}

// O que uma família ensina ao núcleo (estendido):
interface FamiliaCodec {
  reconhecedores: Reconhecedor[]      // ordem importa (ver abaixo)
  emitirNo: (no: No) => string
  emitirConexao: (c: Conexao, m: Modelo) => string       // NOVO
  emitirAgrupamentoAbre: (g: Agrupamento) => string      // NOVO — a linha `subgraph …`
  emitirAgrupamentoFecha: () => string                   // NOVO — a linha `end`
}
```

`registrarMembro` respeita o **vínculo exclusivo, primeiro-vence** (medição M4): se `id` já tem dono,
ignora — o segundo bloco não rouba o membro; nada é reescrito no código.

## Registro da família flowchart (ordem dos reconhecedores)

```ts
registrar('flowchart', {
  reconhecedores: [
    reconhecedorCabecalho,        // 5 declarações do escopo — descarta (R0)
    reconhecedorAbreAgrupamento,  // `subgraph id[titulo]` | `subgraph id` | `subgraph titulo` → abre container
    reconhecedorFechaAgrupamento, // `end` → fecha container (antes do nó: `end` não vira nó)
    reconhecedorConexao,          // aresta dirigida (antes do nó)
    reconhecedorNoRetangular,     // `nN` | `nN[…]` | `nN["…"]` (R0)
  ],
  emitirNo, emitirConexao, emitirAgrupamentoAbre, emitirAgrupamentoFecha,
})
```

A ordem é gramática: `end` e `subgraph` casam **antes** do nó (senão viram nó pelo identificador
sozinho); a conexão casa antes do nó (o R0 já rejeita tokens de link no nó, mas a conexão os **consome**).

## Reconhecedor: agrupamento (abre / fecha) — família

```
subgraph subN[Título]  →  garante Agrupamento{id:subN, titulo:'Título'}; abrirContainer('subN'); se pilha≠∅, registrarMembro('subN')  [M3: aninha por menção]
subgraph subN          →  idem, titulo=null
subgraph Título        →  id anônimo do contador; titulo='Título'  (forma que o produto NÃO escreve; lida p/ honrar código de fora)
end                    →  fecharContainer()
```

- **Membro por menção** (M1): um statement de nó/agrupamento com a pilha não-vazia → `registrarMembro`.
- **Membro por aresta no bloco** (M2, `FR-019`): a conexão, ao materializar dentro de um bloco, chama
  `registrarMembro(origem)` e `registrarMembro(destino)` — a aresta cria a conexão **e** agrupa as pontas.
- **Bloco vazio** (M5): `subgraph … end` sem membros → Agrupamento de `membros: []`, exibido enquanto o
  código o declara; a análise **não** o apaga (`FR-019`).
- **Tolerância** (Princípio IX): `subgraph` sem `end` mantém o container aberto até o fim do documento —
  os membros já lidos não somem; avisa (não derruba).

## Reconhecedor: conexão — família

```
a --> b            →  Conexao{origem:'a', destino:'b', texto:null, conectivo:'-->'}
a -->|texto| b     →  texto = decodificar('texto')  (rótulo de aresta; mesmo codec do rótulo de nó)
a -- texto --> b   →  idem (forma de rótulo no meio)
a ==> b / -.-> / --x / --o / <--> …  →  conectivo preservado (research §9); origem/destino iguais = laço
```

- **Pontas garantidas**: `garantirNo(origem)` e `garantirNo(destino)` — a aresta materializa os nós que
  faltarem (como o mermaid de fora).
- **Arestas paralelas e laço** (`FR-001`): cada statement de aresta cria uma **nova** `Conexao` (id de
  sessão próprio); o produto não funde nem recusa a repetida; `origem === destino` é laço válido.
- **Fora do vocabulário lido**: fan-out compacto (`a --> b & c`) e outros → **ilegível por inteiro**
  (permanece no texto, não vira elemento; a análise não devolve vazio). Entra quando uma spec o pedir.

## Emissão (runtime, por statement; documento inteiro só em teste)

```ts
emitirConexao(c, m)       // `origem conectivo destino`  |  `origem conectivo|codificar(texto)| destino`
emitirAgrupamentoAbre(g)  // `subgraph {g.id}[{codificar(titulo)}]`  |  `subgraph {g.id}`
emitirAgrupamentoFecha()  // `end`
// membro = a MENÇÃO ISOLADA do id, uma linha indentada dentro do bloco (o produto escreve só a isolada)
```

`serializar(modelo)` (documento inteiro — **só teste**, round-trip/ponto fixo) emite: preâmbulo,
cabeçalho, nós fora de bloco, conexões, e cada agrupamento como `abre` + menções dos membros + `fecha`,
recursivo para aninhados. `normalizar(modelo)` (juiz estrutural) ordena `conexoes` por (origem,destino,
ordinal), `agrupamentos` por id e `membros` como conjunto — **ordem é ruído** nesta família (research §1).

## Invariantes verificáveis (portões)

| Invariante | Teste | Requisito |
|---|---|---|
| Análise nunca devolve vazio | prefixos do corpus dirigido (subgraph sem end, aresta incompleta) → sempre um modelo; 0 perdas de elemento real | Princípio IX · SC-002 |
| Ponto fixo | `serializar` idempotente; `analisar∘serializar ≡ id` (normalizado) sobre o corpus dirigido | ADR-006 |
| Round-trip fiel + pertencimento | código projetado aceito por `mermaid.parse()`; **0 divergências de pertencimento** vs. o mermaid, inclusive aresta-no-bloco (M2) e dupla-menção (M4) | SC-001 · Princípio V |
| Aninhar por menção | agrupar um agrupamento existente → bloco novo com a **menção** do id do filho; releitura ≡ aninhamento léxico; **0 linhas realocadas** | FR-014 · SC-009 (M3) |
| Vínculo exclusivo primeiro-vence | id em dois blocos → membro do 1º; perdedor 0 membros; código intocado | FR-019 (M4) |
| Texto byte a byte ou marcado | corpus hostil de rótulo de nó **e** texto de conexão, multi-linha e vazio; codec lossless | Princípio VIII · SC-002 |
| Marca durável na releitura | editar outra linha e reler preserva texto integral + marca dos marcados não tocados | FR-006 · SC-002 |
| Núcleo sem nome de família | `grep` de `subgraph`/`-->`/`flowchart` em `codec/nucleo/` reprova | Princípio XII |
| mermaid fora do runtime | checagem de fronteira de importação (módulos novos inclusos) | Princípio X |
