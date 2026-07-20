// O corpus entra no bundle como texto cru, para o verificador do navegador
// medir exatamente os mesmos documentos que o harness de Node mede — agora
// carregando a família junto, porque são três corpora e não um.

const arquivos = import.meta.glob('../corpus/*/*.mmd', { query: '?raw', import: 'default', eager: true })

export default Object.entries(arquivos)
  .map(([caminho, texto]) => {
    const partes = caminho.split('/')
    return {
      familia: partes[partes.length - 2],
      nome: partes[partes.length - 1],
      texto: texto.replace(/\n$/, ''),
    }
  })
  .sort((a, b) => (a.familia + a.nome < b.familia + b.nome ? -1 : 1))
