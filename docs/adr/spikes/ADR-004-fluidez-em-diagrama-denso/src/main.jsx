import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './estilo.css'

// Sem StrictMode de propósito: o double-invoke de desenvolvimento distorceria
// a medição, e o que interessa aqui é o custo de um render, não de dois.
createRoot(document.getElementById('root')).render(<App />)
