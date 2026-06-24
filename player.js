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
  const board = document.getElementById('clues-board');
  if (!board) return;
  board.innerHTML = '';

  const safeRevealed = revealedIndexes || [];
  const revealedIds = safeRevealed.map((x) => (typeof x === 'object' ? x.index : x));

  window.clickedTraps = window.clickedTraps || [];

  // Retorna ao laço original travado rigidamente em 20 dicas
  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn-clue';
    btn.innerHTML = `<span style="font-size: 1.2rem; display: block; margin-bottom: 4px;">💎</span>${String(i).padStart(2, '0')}`;

    if (revealedIds.includes(i - 1) || window.clickedTraps.includes(i - 1)) {
      btn.disabled = true;
      if (window.clickedTraps.includes(i - 1)) {
        btn.style.opacity = '0.3';
        btn.style.cursor = 'not-allowed';
        btn.style.border = '1px solid var(--red)';
      }
    }

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.style.opacity = '0.3';
      btn.style.cursor = 'not-allowed';

      try {
        const doc = await gameRef.get();
        const currentData = doc.data();
        const isTrap = (currentData.trapIndices || []).includes(i - 1);
        const isRoulette = currentData.rouletteIndex === i - 1;

        // Custo atualizado com a inflação cumulativa
        const actualCost = clueCost * (currentData.inflationMultiplier || 1);

        if (isTrap) {
          window.clickedTraps.push(i - 1);
          btn.style.border = '1px solid var(--red)';

          await gameRef.update({
            debt: firebase.firestore.FieldValue.increment(actualCost),
            revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
              index: i - 1,
              timestamp: Date.now(),
            }),
            // LOG: Grava a explosão da armadilha com o número da casa
            roundPenalties: firebase.firestore.FieldValue.arrayUnion(`💥 Armadilha Ativada (Casa ${String(i).padStart(2, '0')})`),
          });
          showToast('⚠️ Que patético... Caiu na armadilha!', 'danger');
        } else if (isRoulette) {
          window.clickedTraps.push(i - 1);
          btn.style.border = '1px solid #b538ff';

          await gameRef.update({
            debt: firebase.firestore.FieldValue.increment(actualCost),
            revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
              index: i - 1,
              timestamp: Date.now(),
            }),
            rouletteData: { active: true, step: 'waiting_click' },
            latestGuess: '🎰 Dominado na Roleta (Aguardando giro...)',
            // LOG: Grava a ativação da roleta com o número da casa
            roundPenalties: firebase.firestore.FieldValue.arrayUnion(`🎰 Roleta Acionada (Casa ${String(i).padStart(2, '0')})`),
          });

          showToast('🎰 Roleta ativada! A Mistress está assistindo.', 'gold');
        } else {
          await gameRef.update({
            debt: firebase.firestore.FieldValue.increment(actualCost),
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
