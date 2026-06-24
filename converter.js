const fs = require('fs');

try {
  // 1. Lê o arquivo palavras.json que você baixou
  const dadosBrutos = fs.readFileSync('palavras.json', 'utf8');
  const dadosOriginais = JSON.parse(dadosBrutos);

  // 2. Mapeia e formata os dados para o padrão do seu sistema
  const cardsConvertidos = dadosOriginais.map((item, index) => {
    let cat = item.categoria || 'Geral';
    if (cat.toLowerCase() === 'coisa') cat = 'Objeto';

    // Capitaliza a primeira letra (ex: pessoa -> Pessoa)
    cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

    // Injeta o prefixo numérico "X. " nas dicas
    const dicasFormatadas = item.dicas.map((dica, i) => {
      const prefixo = `${i + 1}. `;
      return dica.trim().startsWith(prefixo) ? dica.trim() : `${prefixo}${dica.trim()}`;
    });

    return {
      id: `card_${String(index + 1).padStart(3, '0')}`,
      category: cat,
      answer: item.palavra,
      clues: dicasFormatadas,
    };
  });

  // 3. Monta a string final exatamente como o seu cards.js precisa
  const conteudoFinal = `const PRELOADED_CARDS = ${JSON.stringify(cardsConvertidos, null, 2)};`;

  // 4. Salva o novo cards.js na pasta
  fs.writeFileSync('cards.js', conteudoFinal, 'utf8');

  console.log('✅ Sucesso! O arquivo cards.js foi gerado com as dicas difíceis da Grow.');
} catch (error) {
  console.error('❌ Erro ao processar os arquivos:', error.message);
}
