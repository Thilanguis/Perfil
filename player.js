// --- SISTEMA DA ROLETA FINDOM (RODA FÍSICA ESTÁTICA) ---
// Apenas desenha a roleta no carregamento da tela (a animação roda pelo app.js)
function drawRouletteWheel() {
  const canvas = document.getElementById('roulette-wheel');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width,
    h = canvas.height,
    cX = w / 2,
    cY = h / 2,
    r = w / 2;

  // Textos curtos e explicativos
  const options = [
    { id: 'spin_2', label: '2.00 + SPIN', color: '#e62236' },
    { id: 'silencio_3', label: 'SILÊNCIO +3', color: '#2ecc71' },
    { id: 'inflacao', label: 'INFLAÇÃO + SPIN', color: '#ff8c00' },
    { id: 'spin_3', label: '3.00 + SPIN', color: '#8a6d1c' },
    { id: 'multa_5', label: '5.00', color: '#8a6d1c' },
    { id: 'spin_4', label: '4.00 + SPIN', color: '#e62236' },
    { id: 'inflacao', label: 'INFLAÇÃO + SPIN', color: '#ff8c00' },
    { id: 'silencio_2', label: 'SILÊNCIO +2', color: '#2ecc71' },
    { id: 'spin_5', label: '5.00 + SPIN', color: '#b538ff' },
    { id: 'silencio_4', label: 'SILÊNCIO +4', color: '#2ecc71' },
    { id: 'multa_10', label: '10.00', color: '#1a1a22' },
    { id: 'inflacao', label: 'INFLAÇÃO + SPIN', color: '#ff8c00' },
  ];

  const arc = (2 * Math.PI) / options.length;
  ctx.clearRect(0, 0, w, h);

  for (let i = 0; i < options.length; i++) {
    const angle = i * arc;
    ctx.beginPath();
    ctx.fillStyle = options[i].color;
    ctx.moveTo(cX, cY);
    ctx.arc(cX, cY, r, angle, angle + arc, false);
    ctx.fill();
    ctx.strokeStyle = '#040406';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.translate(cX, cY);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // REDUÇÃO DINÂMICA: Previne que o texto longo estoure as bordas da fatia
    ctx.font = options[i].label.length > 10 ? 'bold 11px "Segoe UI", Arial, sans-serif' : 'bold 13px "Segoe UI", Arial, sans-serif';

    ctx.fillStyle = options[i].color === '#1a1a22' ? '#f8d26a' : '#fff';
    ctx.fillText(options[i].label, r - 12, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.fillStyle = '#0c0c10';
  ctx.arc(cX, cY, 35, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#f8d26a';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8d26a';
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.fillText('SPIN', cX, cY);
}

document.addEventListener('DOMContentLoaded', drawRouletteWheel);

function generateClueButtons(revealedIndexes, clueCost) {
  const cardSlot = document.getElementById('revealed-clues');

  if (!cardSlot) return;

  // O valor é atualizado a cada mudança do Firebase.
  window.currentPlayerClueCost = Number(clueCost) || 0;

  // Evita adicionar o mesmo evento várias vezes.
  if (cardSlot.dataset.clueHandlerBound === 'true') {
    return;
  }

  cardSlot.dataset.clueHandlerBound = 'true';

  const processClueClick = async (row) => {
    if (!row || row.dataset.processing === 'true') {
      return;
    }

    const clueIndex = Number(row.dataset.clueIndex);

    if (!Number.isInteger(clueIndex) || clueIndex < 0 || clueIndex >= 20) {
      return;
    }

    row.dataset.processing = 'true';
    row.classList.add('is-processing');
    row.setAttribute('aria-disabled', 'true');

    try {
      const doc = await gameRef.get();

      if (!doc.exists) {
        throw new Error('Sessão não encontrada.');
      }

      const currentData = doc.data();

      if (currentData.status !== 'playing' || !currentData.trapsReady) {
        throw new Error('A carta ainda não está liberada.');
      }

      const alreadyRevealed = (currentData.revealedIndexes || []).some((item) => {
        const index = typeof item === 'object' ? item.index : item;

        return index === clueIndex;
      });

      if (alreadyRevealed) {
        row.dataset.processing = 'false';
        row.classList.remove('is-processing');
        row.removeAttribute('aria-disabled');
        return;
      }

      const baseCost = Number(currentData.clueCost) || window.currentPlayerClueCost || 0;

      const multiplier = Number(currentData.inflationMultiplier) || 1;

      const actualCost = baseCost * multiplier;

      const clueNumber = String(clueIndex + 1).padStart(2, '0');

      const isTrap = (currentData.trapIndices || []).includes(clueIndex);

      const isRoulette = currentData.rouletteIndex === clueIndex;

      if (isTrap) {
        await gameRef.update({
          debt: firebase.firestore.FieldValue.increment(actualCost),

          revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
            index: clueIndex,
            timestamp: Date.now(),
          }),

          roundPenalties: firebase.firestore.FieldValue.arrayUnion(`💥 Armadilha Ativada (Casa ${clueNumber})`),
        });

        showToast('⚠️ Que patético... Caiu na armadilha!', 'danger');
      } else if (isRoulette) {
        await gameRef.update({
          debt: firebase.firestore.FieldValue.increment(actualCost),

          revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
            index: clueIndex,
            timestamp: Date.now(),
          }),

          rouletteData: {
            active: true,
            step: 'waiting_click',
          },

          latestGuess: '🎰 Dominado na Roleta (Aguardando giro...)',

          roundPenalties: firebase.firestore.FieldValue.arrayUnion(`🎰 Roleta Acionada (Casa ${clueNumber})`),
        });

        showToast('🎰 Roleta ativada! A Mistress está assistindo.', 'gold');
      } else {
        await gameRef.update({
          debt: firebase.firestore.FieldValue.increment(actualCost),

          revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
            index: clueIndex,
            timestamp: Date.now(),
          }),
        });
      }
    } catch (error) {
      console.error('Erro ao processar clique na carta:', error);

      row.dataset.processing = 'false';
      row.classList.remove('is-processing');
      row.removeAttribute('aria-disabled');

      const message = error?.message === 'A carta ainda não está liberada.' ? error.message : 'Erro ao processar. Tente novamente.';

      showToast(message, 'danger');
    }
  };

  const findClickableRow = (target) => {
    const row = target.closest('.player-profile-card .profile-card-clue.sealed.is-clickable[data-clue-index]');

    return row && cardSlot.contains(row) ? row : null;
  };

  cardSlot.addEventListener('click', (event) => {
    const row = findClickableRow(event.target);

    if (row) {
      processClueClick(row);
    }
  });

  cardSlot.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const row = findClickableRow(event.target);

    if (!row) return;

    event.preventDefault();
    processClueClick(row);
  });
}

const guessInput = document.getElementById('player-guess-input');
const submitBtn = document.getElementById('btn-submit-guess');

if (guessInput) {
  guessInput.addEventListener('input', async (e) => {
    try {
      await gameRef.update({ latestGuess: e.target.value });
    } catch (error) {
      console.error('Erro ao sincronizar palpite em tempo real:', error);
    }
  });
}

if (submitBtn && guessInput) {
  submitBtn.addEventListener('click', async () => {
    const finalGuess = guessInput.value.trim();
    if (!finalGuess) return;

    try {
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
