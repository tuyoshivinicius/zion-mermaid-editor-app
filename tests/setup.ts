// Preparo do ambiente do Vitest.
//
// jsdom não implementa `HTMLCanvasElement.getContext` e, ao ser chamado, escreve um
// erro no console virtual em vez de lançar. O medidor de texto da extensão desenhada
// (`areatrabalho/extensao.ts`) SONDA o canvas 2D em runtime e degrada para uma média
// por caractere quando ele não existe — o comportamento correto aqui, já que fora do
// navegador não há fonte a medir. Declarar a ausência explicitamente evita o ruído e
// deixa claro que, em Vitest, a medição de texto é determinística por construção.
//
// Os testes de unidade da extensão injetam o próprio medidor e não dependem disto.
HTMLCanvasElement.prototype.getContext = (() => null) as HTMLCanvasElement['getContext']
