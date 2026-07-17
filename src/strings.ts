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
  starter: {
    seeded: 'starter carregado',
  },
  clear: {
    button: 'Limpar',
    dialogTitle: 'Limpar tudo?',
    dialogDescription: 'Isso apaga todo o conteúdo do diagrama e do código. Essa ação não pode ser desfeita.',
    dialogConfirm: 'Limpar',
    dialogCancel: 'Cancelar',
    completed: 'diagrama limpo',
  },
  propertiesPanel: {
    heading: 'Propriedades',
    neutral: 'Selecione um nó ou uma conexão para editar',
    labelFieldLabel: 'Rótulo da conexão',
    labelFieldPlaceholder: 'Sem rótulo',
    shapeFieldLabel: 'Formato do nó',
  },
  shapeNames: {
    rect: 'Retângulo',
    round: 'Retângulo arredondado',
    stadium: 'Estádio',
    subroutine: 'Sub-rotina',
    cylinder: 'Cilindro',
    circle: 'Círculo',
    doublecircle: 'Círculo duplo',
    diamond: 'Losango',
    hexagon: 'Hexágono',
    odd: 'Bandeira',
    trapezoid: 'Trapézio',
    inv_trapezoid: 'Trapézio invertido',
    lean_right: 'Paralelogramo à direita',
    lean_left: 'Paralelogramo à esquerda',
  },
} as const
