// Memória local para lembrar quais armadilhas já explodiram nesta rodada
window.clickedTraps = window.clickedTraps || [];
let currentCardIdTracker = null;

// Reseta as armadilhas locais sempre que a Mistress lançar uma charada nova
gameRef.onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    if (data.cardId !== currentCardIdTracker) {
      currentCardIdTracker = data.cardId;
      window.clickedTraps = [];
    }
  }
});

// Memória local segura para lembrar armadilhas e a charada atual
window.clickedTraps = window.clickedTraps || [];
window.currentCardIdTracker = window.currentCardIdTracker || null;

gameRef.onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    if (data.cardId !== window.currentCardIdTracker) {
      window.currentCardIdTracker = data.cardId;
      window.clickedTraps = [];
    }
  }
});

function generateClueButtons(revealedIndexes, clueCost) {
  const board = document.getElementById('clues-board');
  if (!board) return;
  board.innerHTML = '';

  const safeRevealed = revealedIndexes || [];
  const revealedIds = safeRevealed.map((x) => (typeof x === 'object' ? x.index : x));

  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn-clue';
    btn.innerHTML = `<span style="font-size: 1.2rem; display: block; margin-bottom: 4px;">💎</span>${String(i).padStart(2, '0')}`;

    // Desativa se já for dica revelada OU trap estourada na memória do jogador
    if (revealedIds.includes(i - 1) || window.clickedTraps.includes(i - 1)) {
      btn.disabled = true;
      if (window.clickedTraps.includes(i - 1)) {
        btn.style.opacity = '0.3';
        btn.style.cursor = 'not-allowed';
        btn.style.border = '1px solid var(--red)'; // Marca visualmente que aqui tinha trap
      }
    }

    btn.addEventListener('click', async () => {
      // 1. TRAVA IMEDIATA NO CLIQUE PARA EVITAR SPAM
      btn.disabled = true;
      btn.style.opacity = '0.3';
      btn.style.cursor = 'not-allowed';

      try {
        const doc = await gameRef.get();
        const currentData = doc.data();
        const isTrap = (currentData.trapIndices || []).includes(i - 1);

        if (isTrap) {
          // SALVA NA MEMÓRIA QUE A ARMADILHA EXPLODIU
          window.clickedTraps.push(i - 1);
          btn.style.border = '1px solid var(--red)';

          // COBRA O VALOR DA DICA E AGORA SALVA NOS REVEALED INDEXES PARA APARECER NO HISTÓRICO
          await gameRef.update({
            debt: firebase.firestore.FieldValue.increment(clueCost),
            revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
              index: i - 1,
              timestamp: Date.now(),
            }),
          });
          showToast('ARMADILHA! Perdeu a vez e o valor da dica!', 'danger');
        } else {
          // DICA NORMAL: COBRA O VALOR DA DICA E MOSTRA O TEXTO
          await gameRef.update({
            debt: firebase.firestore.FieldValue.increment(clueCost),
            revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
              index: i - 1,
              timestamp: Date.now(),
            }),
          });
        }
      } catch (error) {
        console.error('Erro ao processar clique:', error);
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        showToast('Erro ao processar. Tente novamente.', 'danger');
      }
    });

    board.appendChild(btn);
  }
}

const guessInput = document.getElementById('player-guess-input');
const submitBtn = document.getElementById('btn-submit-guess');

// 1. Sincronização caractere por caractere enquanto digita
if (guessInput) {
  guessInput.addEventListener('input', async (e) => {
    try {
      await gameRef.update({ latestGuess: e.target.value });
    } catch (error) {
      console.error('Erro ao sincronizar palpite em tempo real:', error);
    }
  });
}

// 2. Trava o palpite oficial, envia a flag de trancado e limpa o campo do dominado
if (submitBtn && guessInput) {
  submitBtn.addEventListener('click', async () => {
    const finalGuess = guessInput.value.trim();
    if (!finalGuess) return;

    try {
      // Envia o palpite final marcando a flag guessLocked como verdadeira
      await gameRef.update({
        latestGuess: finalGuess,
        guessLocked: true,
      });
      showToast('Palpite cravado com sucesso! Aguarde julgamento.', 'gold');
      guessInput.value = '';
    } catch (error) {
      console.error('Erro ao cravar palpite oficial:', error);
    }
  });
}
