# Contrato — Arranjo e projeção (modelo → área do diagrama)

ADR-003/004/007. O arranjo é a **exceção deliberada da topologia**: existe para a vista e a sessão,
nunca para o código. A projeção deriva a coordenada e **reusa** o objeto de vista quando nada visível
mudou. Um store só, não um segundo store paralelo (research §5).

## Arranjo (posição por identificador) — efêmero de sessão

```ts
interface Arranjo {
  porId: Map<string, { x: number; y: number }>   // lembra por id, inclusive de ids sem nó no momento
  gravar(id: string, pos: Pos): void              // criar/arrastar
  transferir(idAntigo: string, idNovo: string): void  // renomear (FR-018): move a lembrança, o antigo perde
  posicaoPara(id: string, ancora: Pos | null, ocupadas: Set<Pos>): Pos  // FR-015
}
```

`posicaoPara` (FR-015 / SC-008):

1. Se `porId[id]` existe **e o lugar está livre** (não colide com `ocupadas`) → devolve a lembrada.
2. Senão, **colocação local determinística**: adjacente à `ancora` (o elemento anterior na ordem do
   código), em espaço livre próximo, sem mover ninguém.
3. Sem `ancora` (primeiro nó) → **origem fixa** da área: ponto constante, **independente do tamanho da
   janela e da sessão**. Mesma cadeia de código → mesmas coordenadas, em qualquer tela.

O produto **nunca** empilha duas caixas no mesmo ponto (lugar ocupado → cai na colocação determinística).
O arranjo **nunca** é serializado no código (FR-008 / Princípio V).

## Projeção (a invariante de cinco donos)

```ts
function projetar(modelo: Modelo, arranjo: Arranjo): { nodes: RFNode[]; edges: RFEdge[] }
// edges = [] no R0 (sem conexões)
```

**Reuso obrigatório (ADR-004, Princípio III):** o objeto de vista de um nó é **reusado** (identidade
referencial) quando nada que a vista enxerga mudou. Chave de cache por nó:

```
`${rotulo ?? id}|${forma}|${marcado}|${x}|${y}`
```

Mudou a chave → objeto novo; igual → **o mesmo objeto**. É restrição de arquitetura, não otimização:
sem ela a tecla dobra e encosta na barra (ADR-006). Os cinco donos: latência (ADR-004), foco por
teclado (ADR-005), tecla no editor (ADR-006), as três famílias (ADR-008), a transação (ADR-009).

## Plano rolável (FR-007)

A área é um **plano rolável**: rola para acomodar conteúdo empurrado além da borda pela cadeia
determinística ou por um arraste, mantendo todo nó **alcançável**. Rolar é estado de vista — não aparece
no código (FR-008) nem move elemento nenhum (FR-009). Zoom, pan por arraste e ajustar-à-tela são
`area-de-trabalho`.

## Invariantes verificáveis

| Invariante | Teste | Requisito |
|---|---|---|
| Reuso da projeção | projeta 2× mudando 1 nó → identidade referencial dos demais | Princípio III (portão) |
| Determinismo | mesmo código 2× → posições idênticas, inclusive em telas de tamanhos diferentes | SC-008 |
| Lembrança por id | mover a linha de um nó arrastado → volta à posição exata (0 saltos) | SC-008 · FR-015 |
| Transferência no renomear | renomear → 0 caixas empilhadas; a antiga perde a lembrança | SC-008 · FR-015 |
| Arranjo não vaza | 0 posição/zoom/seleção/foco em qualquer código gerado | SC-004 · Princípio V |
| Nada rearranja preexistente | 0 reposicionamentos após qualquer operação | SC-008 · Princípio VII |
