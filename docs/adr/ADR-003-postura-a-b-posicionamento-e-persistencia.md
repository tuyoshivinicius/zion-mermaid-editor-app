# ADR-003 — Postura A × B: posicionamento e persistência do modelo

- **Status:** Aceito
- **Data:** 2026-07-13
- **Decisores:** Tuyoshi (product owner)

## Contexto

O discovery deixou esta decisão explicitamente reaberta para ADR (`docs/discovery.md`,
Notas de spike):

- **Postura A** (adotada no discovery): dois artefatos — código Mermaid persistido +
  modelo interno **efêmero** só para habilitar o round-trip na sessão. Auto-layout posiciona
  os nós; **única saída salva = código puro e portável**.
- **Postura B** (adiada): um **documento nativo persistido** (código + metadados: posições
  manuais, viewport, estilos ricos) que permitiria arrastar nós livremente e reabrir
  restaurando o layout exato. Muda o "não persiste / única saída é o código".

A escolha do engine (ADR-001, React Flow) torna a decisão urgente: React Flow tem
**arrastar-e-fixar nó por coordenada como recurso nativo**, o que colide de frente com o
"não posiciona nós por coordenada / única saída é o código" do discovery.

**Spike / evidência (deep-research, 2026-07-13, verificação 3-0):**

- **Texto Mermaid não expressa coordenadas de nó.** Nem o texto nem o parse carregam
  posição/dimensão. Fontes: issue mermaid #2483, docs mermaid-to-excalidraw, blog tldraw.
- **Consequência direta e verificada:** manter só o texto Mermaid como fonte da verdade
  (Postura A) → re-roda auto-layout a cada carga e **posições manuais são efêmeras**;
  persistir documento nativo (Postura B) preserva layout/estilo **mas esse estado extra é
  inexprimível no Mermaid exportado** → o código copiado perde o layout, ferindo a
  portabilidade (o valor central: colar num README/PR).
- Prior art confirma o dilema: editores ou rodam layout próprio com drag efêmero
  (`mermaid-reactflow-editor`) ou tornam o canvas canônico e o Mermaid derivado
  (`saketkattu/mermaid-visual-editor`).

## Decisão

Confirmar a **Postura A**: o **texto Mermaid é a única fonte da verdade persistida/copiável**;
o modelo de grafo interno (React Flow) é **efêmero na sessão**, existindo só para habilitar a
edição visual e o round-trip. O **posicionamento dos nós é do auto-layout** (dagre/elkjs
rodado pela aplicação — ver ADR-002); o usuário controla **orientação/algoritmo de layout**
(TD/LR, hierárquico × adaptativo), **não coordenada manual fixada**. Não há documento nativo,
não há persistência entre sessões, não há export de imagem.

Descartada a **Postura B** (documento nativo com posições/estilos manuais persistidos):
introduz um formato cujo estado essencial não sobrevive ao copiar o Mermaid, contradizendo o
valor central de portabilidade; adia-se como possível evolução futura, fora do escopo atual.

## Consequências

**Fica mais fácil:** o código copiado é sempre limpo e portável (README/PR); sem formato
proprietário, sem migração de dados, sem sincronizar uma terceira camada de estado; o
"Não faz" do discovery (não persiste, única saída é o código) permanece coerente.

**Fica mais difícil / trade-offs aceitos:**
- **Sem drag-and-fix livre de nós**: o usuário não fixa coordenadas; a posição vem do
  auto-layout. É preciso **desabilitar/reinterpretar o drag nativo do React Flow** (ex.:
  drag reordena/reconecta, não grava coordenada) — restrição de UI que nasce aqui.
- **Layout pode "saltar"** entre edições, já que é recalculado; mitigável com layout estável
  e transições, mas é limite aceito.
- **Estilos ricos** só sobrevivem se forem serializáveis no Mermaid (`classDef`/`style`);
  o que não couber no texto é efêmero por definição.

**Impacto na PRD (restrição, seção 8):** "A sessão é efêmera; a única saída persistida/copiada
é o texto Mermaid; a posição dos nós é do auto-layout (usuário controla orientação/algoritmo,
não coordenada); sem documento nativo, persistência entre sessões ou export de imagem."

**Impacto na constitution:** princípio candidato — "nenhum estado necessário para reproduzir o
diagrama vive fora do texto Mermaid exportável; recursos de viewport e posição são efêmeros e
não entram na saída".

## Status

Aceito. (Reabre-se apenas se surgir requisito de reabrir/restaurar layout exato entre
sessões, que exigiria revisitar Postura B em um novo ADR.)
