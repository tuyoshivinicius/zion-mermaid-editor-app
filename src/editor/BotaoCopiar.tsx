// Botão de copiar (FR-010 / SC-006) — único caminho de saída para o mundo de
// fora. 1 clique → o código inteiro na área de transferência, com o cabeçalho
// normalizado (cirurgica). A confirmação E a falha aparecem no PRÓPRIO botão:
// falhar em silêncio não é opção.

import { useCallback, useState } from 'react'
import { Button } from '../ui/button'
import { useSessao } from '../modelo/store'

type Estado = 'ocioso' | 'copiado' | 'falhou'

const ROTULO: Record<Estado, string> = {
  ocioso: 'Copiar código',
  copiado: 'Copiado ✓',
  falhou: 'Não copiou — tente de novo',
}

export function BotaoCopiar() {
  const copiar = useSessao((s) => s.copiar)
  const [estado, setEstado] = useState<Estado>('ocioso')

  const aoClicar = useCallback(async () => {
    const r = await copiar()
    setEstado(r === 'copiado' ? 'copiado' : 'falhou')
    setTimeout(() => setEstado('ocioso'), 1800)
  }, [copiar])

  return (
    <Button
      data-testid="botao-copiar"
      data-estado={estado}
      variant={estado === 'falhou' ? 'muted' : 'default'}
      onClick={aoClicar}
    >
      {ROTULO[estado]}
    </Button>
  )
}
