// --- AÇÕES DO CONTROLADOR (ADMIN) ---

function updateAdminDeckList() {
  const select = document.getElementById('admin-card-select');
  select.innerHTML = '';

  const randomOpt = document.createElement('option');
  randomOpt.value = 'random';
  randomOpt.textContent = '🎲 Sortear Carta Aleatória';
  select.appendChild(randomOpt);

  PRELOADED_CARDS.forEach((card) => {
    const opt = document.createElement('option');
    opt.value = card.id;
    opt.textContent = `${card.category} - ${card.answer}`;
    select.appendChild(opt);
  });
}

document.getElementById('btn-enter-controller').addEventListener('click', async () => {
  const adminName = document.getElementById('setup-admin-name').value.trim() || 'Dominador';
  const cCost = parseFloat(document.getElementById('setup-clue-cost').value) || 2.0;
  const pPenalty = parseFloat(document.getElementById('setup-penalty').value) || 10.0;

  await gameRef.set(
    {
      adminName: adminName,
      clueCost: cCost,
      mistakePenalty: pPenalty,
      status: 'waiting',
    },
    { merge: true },
  );

  document.getElementById('view-selection').classList.remove('active');
  document.getElementById('view-controller').classList.add('active');
  updateAdminDeckList();
});

document.getElementById('btn-reset-debt').addEventListener('click', async () => {
  if (confirm('Tem certeza que deseja zerar a dívida acumulada dessa sessão?')) {
    await gameRef.update({ debt: 0 });
  }
});

document.getElementById('btn-start-round').addEventListener('click', async () => {
  let selectedCardId = document.getElementById('admin-card-select').value;
  if (!selectedCardId) return;

  let cardData;
  if (selectedCardId === 'random') {
    const randomIndex = Math.floor(Math.random() * PRELOADED_CARDS.length);
    cardData = PRELOADED_CARDS[randomIndex];
  } else {
    cardData = PRELOADED_CARDS.find((c) => c.id === selectedCardId);
  }

  // Lê os novos valores configurados na tela antes de lançar a carta
  const newClueCost = parseFloat(document.getElementById('admin-edit-clue').value) || 2;
  const newPenalty = parseFloat(document.getElementById('admin-edit-penalty').value) || 10;

  await gameRef.update({
    cardId: cardData.id,
    category: cardData.category,
    answer: cardData.answer,
    clues: cardData.clues,
    clueCost: newClueCost,
    mistakePenalty: newPenalty,
    revealedIndexes: [],
    latestGuess: '',
    status: 'playing',
  });

  alert(`Nova carta na mesa com valores atualizados! A dívida global foi mantida.`);
});

// Botão para derrubar o jogador e resetar a mesa
document.getElementById('btn-close-session').addEventListener('click', async () => {
  if (confirm('Deseja encerrar a sessão, zerar a dívida e expulsar o dominado?')) {
    await gameRef.update({
      status: 'closed',
      debt: 0,
      revealedIndexes: [],
      latestGuess: '',
    });
    // Retorna a Mistress para o Lobby
    document.getElementById('view-controller').classList.remove('active');
    document.getElementById('view-selection').classList.add('active');
  }
});

document.getElementById('btn-mark-correct').addEventListener('click', async () => {
  // Encerra a rodada mudando o status para finished, o que ativa o bloqueador do jogador
  await gameRef.update({
    status: 'finished',
    latestGuess: '',
  });
  alert('Rodada encerrada com acerto! Escolha a próxima carta.');
});

document.getElementById('btn-mark-wrong').addEventListener('click', async () => {
  const doc = await gameRef.get();
  if (doc.exists) {
    const data = doc.data();
    // Taxa o dominado E encerra a rodada atual mudando o status para finished
    await gameRef.update({
      debt: firebase.firestore.FieldValue.increment(data.mistakePenalty),
      latestGuess: '',
      status: 'finished',
    });
    alert('Penalidade aplicada! Rodada encerrada. Escolha a próxima carta.');
  }
});

// 6. Bloqueador e Botões
const playerBlocker = document.getElementById('player-blocker');
if (playerBlocker) {
  // O bloqueador só some se o status for estritamente 'playing'.
  // Se for 'finished', 'waiting' ou 'closed', a mesa tranca na hora.
  playerBlocker.style.display = data.status === 'playing' ? 'none' : 'flex';
}
