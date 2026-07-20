import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './estilo.css'

// A guarda do spike: qualquer evento de ponteiro invalida a afirmação
// "o ciclo roda só com teclado". O contador é lido pelo verificador.
window.__ponteiro = { total: 0, tipos: {} }
for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'wheel']) {
  window.addEventListener(
    t,
    () => {
      window.__ponteiro.total++
      window.__ponteiro.tipos[t] = (window.__ponteiro.tipos[t] ?? 0) + 1
    },
    true,
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
