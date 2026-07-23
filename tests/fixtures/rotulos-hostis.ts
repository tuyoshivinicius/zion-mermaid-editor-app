// ≥26 rótulos hostis para o round-trip byte-a-byte do Princípio VIII (T006/T009).
// Acento, aspas, quebras, escapes do mermaid, emoji, vírgula, colchetes, CJK…
// O codec é lossless: TODOS voltam byte-a-byte. `esperaMarcado` diz quais o
// mermaid ainda não renderiza fielmente (a marca é sinal adicional, não perda).

export interface RotuloHostil {
  texto: string
  esperaMarcado: boolean
}

export const ROTULOS_HOSTIS: RotuloHostil[] = [
  { texto: 'Rótulo com espaços', esperaMarcado: false },
  { texto: 'acentuação: ção, ãe, ü, ñ', esperaMarcado: false },
  { texto: 'crase e til: à â ê î ô', esperaMarcado: false },
  { texto: 'aspas: "citado"', esperaMarcado: false },
  { texto: "apóstrofo: d'água", esperaMarcado: false },
  { texto: 'vírgula, ponto. e vírgula;', esperaMarcado: false },
  { texto: 'hash # e cerquilha ##', esperaMarcado: false },
  { texto: 'menor < e maior >', esperaMarcado: false },
  { texto: 'e-comercial: A & B & C', esperaMarcado: false },
  { texto: 'colchete [ e ]', esperaMarcado: false },
  { texto: 'chave { e }', esperaMarcado: false },
  { texto: 'parênteses ( e )', esperaMarcado: false },
  { texto: 'seta --> literal', esperaMarcado: false },
  { texto: 'pipe | e barra \\', esperaMarcado: false },
  { texto: 'dois pontos: valor', esperaMarcado: false },
  { texto: 'porcento 100% aqui', esperaMarcado: false },
  { texto: 'emoji: 🚀 ✅ ♥', esperaMarcado: false },
  { texto: 'emoji ZWJ: 👩‍💻 família 👨‍👩‍👧', esperaMarcado: false },
  { texto: 'cirílico: Привет мир', esperaMarcado: false },
  { texto: 'grego: Δοκιμή αβγ', esperaMarcado: false },
  { texto: 'CJK: 図 表 の 例', esperaMarcado: false },
  { texto: 'árabe: مرحبا بالعالم', esperaMarcado: false },
  { texto: 'entidade literal #62; escrita', esperaMarcado: false },
  { texto: 'html-like <br/> escrito', esperaMarcado: false },
  { texto: 'misto: "a", #b, <c> & [d]', esperaMarcado: false },
  { texto: 'símbolos: ± × ÷ ≠ ≤ ≥ ∞', esperaMarcado: false },
  { texto: 'quebra\nde linha', esperaMarcado: false },
  { texto: 'travessão — e reticências …', esperaMarcado: false },
  // R1: texto multi-linha (parágrafo) — cada `\n` vira `<br/>`, lossless (SC-002).
  { texto: 'passo 1\npasso 2\npasso 3', esperaMarcado: false },
  // R1: texto típico de conexão (rótulo de aresta) — pipe e seta literais.
  { texto: 'condição: a | b', esperaMarcado: false },
  // Marcados: o codec preserva byte-a-byte, mas o mermaid não renderiza fiel.
  { texto: '  borda com espaços  ', esperaMarcado: true },
  { texto: 'espaço    colapsado', esperaMarcado: true },
  { texto: 'tabulação\taqui', esperaMarcado: true },
  { texto: 'controleaqui', esperaMarcado: true },
]

/** Rótulo/texto multi-linha (SC-002: 0 quebras colapsadas, 0 truncamento na 1ª linha). */
export const MULTILINHA = 'linha 1\nlinha 2\nlinha 3'

/** Rótulo vazio (FR-018): 0 repovoados com o neutro, 0 identificadores exibidos como rótulo. */
export const ROTULO_VAZIO = ''
