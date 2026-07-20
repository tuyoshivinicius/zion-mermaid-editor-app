// Instrumentação. Mesmo protocolo do ADR-004/005: nada é afirmado por inspeção
// visual, tudo é relógio do próprio navegador.

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

export function mediana(xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function percentil(xs, p) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]
}

export const arred = (x) => (x == null ? null : Math.round(x * 10) / 10)
