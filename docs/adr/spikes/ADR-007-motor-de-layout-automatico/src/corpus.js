// O corpus entra no bundle como texto cru, para o verificador do navegador
// medir exatamente os mesmos documentos que o harness de Node mede.

const arquivos = import.meta.glob('../corpus/*.mmd', { query: '?raw', import: 'default', eager: true })

export default Object.entries(arquivos)
  .map(([caminho, texto]) => ({ nome: caminho.split('/').pop(), texto: texto.replace(/\n$/, '') }))
  .sort((a, b) => (a.nome < b.nome ? -1 : 1))
