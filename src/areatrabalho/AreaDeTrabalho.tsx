// A CASCA da área de trabalho (FR-006) — as duas vistas do mesmo modelo (`R-03`) e a
// divisão entre elas. A razão vive como variável CSS: durante o arrasto a `Divisao`
// a escreve por `ref`, e o React só entra quando o gesto termina.
//
// Colapsar, ocultar ou alternar as duas vistas em abas NÃO é escopo (`FR-006`):
// esconder uma delas é capacidade nova, com consequência própria.

import { useEffect, useRef } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Canvas } from '../canvas/Canvas'
import { EditorCodigo } from '../editor/EditorCodigo'
import { BotaoCopiar } from '../editor/BotaoCopiar'
import { useSessao } from '../modelo/store'
import { Divisao } from './Divisao'
import { alvoAbertura, padraoDeclarado } from './enquadramento'
import { extensaoDesenhada } from './extensao'

/**
 * FR-017 — O GATILHO DE ABERTURA, de disparo ÚNICO.
 *
 * Armado ao montar; dispara na primeira projeção COM CONTEÚDO e com o quadro já
 * medido; desarma ao disparar. É o disparo único que separa `FR-017` de `FR-007`: a
 * abertura enquadra UMA vez, porque ali não há enquadramento escolhido por ela a
 * preservar — e depois disso o produto não enquadra sozinho nunca mais.
 *
 * Amarrar o gatilho à primeira projeção com conteúdo (e não ao `mount`) cobre com um
 * caminho só os três casos que a spec enumera — sessão nova, aba reaberta com o
 * rascunho restaurado e documento inteiro colado —, porque nos três o conteúdo chega
 * DEPOIS da montagem (research §10).
 *
 * A origem do ato entra na conta porque a spec enumera ABERTURAS, não edições: um
 * primeiro nó criado por gesto no canvas é trabalho dela, não uma abertura. Ali o
 * gatilho apenas desarma — reenquadrar por cima do nó que ela acabou de pousar seria
 * exatamente o produto reenquadrando por conta própria que o `FR-007` recusa.
 */
function useAberturaDerivada() {
  const projecao = useSessao((s) => s.projecao)
  const ultimaOrigem = useSessao((s) => s.ultimaOrigem)
  const piloto = useSessao((s) => s.areaDeTrabalho.piloto)
  const pendente = useSessao((s) => s.areaDeTrabalho.aberturaPendente)
  const desarmarAbertura = useSessao((s) => s.desarmarAbertura)
  const vazioAplicado = useRef(false)

  useEffect(() => {
    if (!pendente || !piloto) return
    const q = piloto.quadro()
    if (q.w === 0 || q.h === 0) return // o quadro ainda não foi medido

    const ext = extensaoDesenhada(projecao)
    if (!ext) {
      // Vazia, abre no PADRÃO DECLARADO — e continua armada: o conteúdo pode
      // chegar num tique (rascunho restaurado, documento colado).
      if (!vazioAplicado.current) {
        vazioAplicado.current = true
        piloto.aplicar(padraoDeclarado(q), false)
      }
      return
    }

    if (ultimaOrigem !== 'canvas') piloto.aplicar(alvoAbertura(ext, q), false)
    desarmarAbertura()
  }, [projecao, ultimaOrigem, piloto, pendente, desarmarAbertura])
}

export function AreaDeTrabalho() {
  const razaoEditor = useSessao((s) => s.areaDeTrabalho.razaoEditor)
  const fixarRazao = useSessao((s) => s.fixarRazao)
  const ref = useRef<HTMLDivElement>(null)
  useAberturaDerivada()

  return (
    <div
      ref={ref}
      data-testid="area-de-trabalho"
      className="area-de-trabalho h-full w-full"
      style={{ '--razao-editor': `${(razaoEditor * 100).toFixed(4)}%` } as React.CSSProperties}
    >
      <section className="vista-diagrama h-full border-r border-border" aria-label="Área do diagrama">
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </section>

      <Divisao refAreaDeTrabalho={ref} aoSoltar={fixarRazao} />

      <section className="vista-editor flex h-full flex-col" aria-label="Editor de código">
        <div className="min-h-0 flex-1">
          <EditorCodigo />
        </div>
        <div className="flex items-center justify-end border-t border-border p-2">
          <BotaoCopiar />
        </div>
      </section>
    </div>
  )
}
