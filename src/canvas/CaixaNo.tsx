// Nó retangular customizado do R0 — o único shape do vocabulário. Consome a
// projeção; a marca de expressividade/digitação aparece por `data.marcado`.

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '../ui/utils'
import type { DadosCaixa } from '../projecao/projetar'

function CaixaNoBase({ data }: NodeProps) {
  const d = data as unknown as DadosCaixa
  return (
    <div
      data-testid="caixa-no"
      data-marcado={d.marcado ? 'true' : 'false'}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm',
        d.marcado ? 'border-amber-500' : 'border-border',
      )}
    >
      <span className="truncate">{d.rotulo}</span>
    </div>
  )
}

export const CaixaNo = memo(CaixaNoBase)
