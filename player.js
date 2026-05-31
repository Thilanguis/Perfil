function generateClueButtons(revealedIndexes, clueCost) {
  const board = document.getElementById('clues-board');
  board.innerHTML = '';

  // Correção do Bug: Mapeia para pegar apenas o índice, lidando com o formato antigo e o novo
  const revealedIds = revealedIndexes.map((x) => (typeof x === 'object' ? x.index : x));

  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn-clue';
    // Visual Premium da Carta
    btn.innerHTML = `<span style="font-size: 1.2rem; display: block; margin-bottom: 4px;">💎</span>${String(i).padStart(2, '0')}`;

    if (revealedIds.includes(i - 1)) {
      btn.disabled = true;
    }

    btn.addEventListener('click', async () => {
      if (confirm(`Deseja comprar a dica ${i} por CAD ${clueCost.toFixed(2)}?`)) {
        btn.disabled = true;
        await gameRef.update({
          debt: firebase.firestore.FieldValue.increment(clueCost),
          revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
            index: i - 1,
            timestamp: Date.now(),
          }),
        });
      }
    });

    board.appendChild(btn);
  }
}

document.getElementById('btn-submit-guess').addEventListener('click', async () => {
  const guess = document.getElementById('player-guess-input').value.trim();
  if (!guess) return;

  await gameRef.update({ latestGuess: guess });
  document.getElementById('player-guess-input').value = '';
});
