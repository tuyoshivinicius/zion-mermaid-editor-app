// Instrumentação do spike. Mesmo protocolo do ADR-004: nada é afirmado por
// inspeção visual, tudo é relógio do próprio navegador.

/**
 * Resolve DEPOIS do paint do próximo frame.
 * rAF roda antes do paint; a macrotask agendada de dentro dele roda depois.
 */
export function aposPaint() {
  return new Promise((res) => {
    requestAnimationFrame(() => {
      const ch = new MessageChannel()
      ch.port1.onmessage = () => res()
      ch.port2.postMessage(0)
    })
  })
}
