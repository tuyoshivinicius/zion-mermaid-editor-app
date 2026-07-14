/**
 * Centralized pt-BR fixed strings (spec Assumptions — idioma). S0 has no
 * i18n mechanism; this module exists solely to prevent the same message
 * from drifting into slightly different copies across components.
 */
export const strings = {
  status: {
    invalid: 'texto não interpretável',
    unsupportedType: 'apenas Flowchart é suportado nesta fatia',
  },
  copy: {
    button: 'Copiar',
    success: 'código copiado',
    failure: 'falha ao copiar — texto selecionado para cópia manual',
  },
  codePanel: {
    ariaLabel: 'Código Mermaid',
  },
  toolbar: {
    newNodeLabelPlaceholder: 'Rótulo do novo nó',
    addNodeButton: 'Adicionar nó',
    connectModeButton: 'Modo conectar',
  },
} as const
