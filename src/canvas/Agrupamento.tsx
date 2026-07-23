// Moldura de agrupamento (R1) — nó-container do React Flow (parentId/extent). Exibe
// o título + a marca; os membros projetam-se DENTRO por `parentId`. A moldura é
// arranjo (posição/tamanho efêmeros, derivados dos membros); editar o título por
// gesto é fora de escopo (edita-se pelo código).

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '../ui/utils'
import type { DadosAgrupamento } from '../projecao/projetar'

function AgrupamentoBase({ data }: NodeProps) {
  const d = data as unknown as DadosAgrupamento
  return (
    <div
      data-testid="moldura-agrupamento"
      data-marcado={d.marcado ? 'true' : 'false'}
      className={cn(
        'h-full w-full rounded-lg border-2 border-dashed bg-muted/20',
        d.marcado ? 'border-amber-500' : 'border-border',
      )}
    >
      <span
        data-testid="titulo-agrupamento"
        className="pointer-events-none absolute left-2 top-1 text-xs font-medium text-muted-foreground"
      >
        {d.titulo}
      </span>
    </div>
  )
}

export const Agrupamento = memo(AgrupamentoBase)
