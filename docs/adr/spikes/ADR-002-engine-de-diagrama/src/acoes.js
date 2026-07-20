import { createContext, useContext } from 'react'

export const AcoesContext = createContext({
  moverMensagem: () => {},
})

export const useAcoes = () => useContext(AcoesContext)
