// --- SISTEMA DA ROLETA FINDOM (RODA FÍSICA ANIMADA) ---
function triggerRouletteSpin(currentData) {
  const modal = document.getElementById('roulette-modal');
  const canvas = document.getElementById('roulette-wheel');
  const resultTitle = document.getElementById('roulette-result-title');
  const resultDesc = document.getElementById('roulette-result-desc');
  const btnClose = document.getElementById('btn-close-roulette');

  if (!modal || !canvas) return;

  modal.style.display = 'flex';
  btnClose.style.display = 'none';
  resultTitle.textContent = 'GIRANDO...';
  resultTitle.style.color = '#fff';
  resultDesc.textContent = '';

  // Reseta qualquer rotação que tenha ficado da rodada anterior
  canvas.style.transition = 'none';
  canvas.style.transform = 'rotate(0deg)';

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width / 2;

  // Grade de 12 fatias, com múltiplos spins e silêncios escalonados
  const options = [
    { id: 'spin_2', label: '2.00 + SPIN', desc: '+ 2.00 e a roleta gira de novo!', color: '#e62236' },
    { id: 'silencio_3', label: 'SILÊNCIO +3', desc: 'Compre +3 dicas para chutar.', color: '#2ecc71' },
    { id: 'inflacao', label: 'INFLAÇÃO 2X', desc: 'O valor das dicas dobra!', color: '#ff8c00' },
    { id: 'spin_3', label: '3.00 + SPIN', desc: '+ 3.00 e a roleta gira de novo!', color: '#8a6d1c' },
    { id: 'multa_5', label: '5.00', desc: '+ 5.00 na dívida.', color: '#8a6d1c' },
    { id: 'spin_4', label: '4.00 + SPIN', desc: '+ 4.00 e a roleta gira de novo!', color: '#e62236' },
    { id: 'inflacao', label: 'INFLAÇÃO 2X', desc: 'O valor das dicas dobra!', color: '#ff8c00' },
    { id: 'silencio_2', label: 'SILÊNCIO +2', desc: 'Compre +2 dicas para chutar.', color: '#2ecc71' },
    { id: 'spin_5', label: '5.00 + SPIN', desc: '+ 5.00 e a roleta gira de novo!', color: '#b538ff' },
    { id: 'silencio_4', label: 'SILÊNCIO +4', desc: 'Compre +4 dicas para chutar.', color: '#2ecc71' },
    { id: 'multa_10', label: '10.00', desc: '+ 10.00 na dívida.', color: '#1a1a22' },
    { id: 'inflacao', label: 'INFLAÇÃO 2X', desc: 'O valor das dicas dobra!', color: '#ff8c00' },
  ];

  const numSegments = options.length;
  const arcSize = (2 * Math.PI) / numSegments;

  // Função para desenhar as fatias da roleta
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < numSegments; i++) {
    const angle = i * arcSize;
    ctx.beginPath();
    ctx.fillStyle = options[i].color;
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arcSize, false);
    ctx.fill();

    // Contorno da fatia (Linhas divisórias pretas)
    ctx.strokeStyle = '#040406';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Texto da fatia inclinado em direção à borda
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arcSize / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif'; // Fonte um pouco menor para caber na fatia de 10

    // Se a fatia for preta, a letra fica dourada para dar contraste. Senão, fica branca.
    ctx.fillStyle = options[i].color === '#1a1a22' ? '#f8d26a' : '#fff';

    ctx.fillText(options[i].label, radius - 15, 0); // Ajuste fino do posicionamento do texto
    ctx.restore();
  }

  // Desenha o pino central da roleta
  ctx.beginPath();
  ctx.fillStyle = '#0c0c10';
  ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#f8d26a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Escreve "SPIN" no pino
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8d26a';
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.fillText('SPIN', centerX, centerY);

  // Gatilho do giro físico (Damos 50ms para o navegador renderizar a tela)
  setTimeout(() => {
    // A roda gira no mínimo 6 voltas completas (2160 graus) + um ângulo aleatório
    const extraDegrees = Math.floor(Math.random() * 360);
    const totalDegrees = 360 * 6 + extraDegrees;

    // A mágica acontece aqui: uma transição CSS que desacelera como uma roleta de verdade
    canvas.style.transition = 'transform 4.5s cubic-bezier(0.25, 1, 0.25, 1)';
    canvas.style.transform = `rotate(${totalDegrees}deg)`;

    // Após 4.6 segundos (fim da animação), ele faz a matemática para saber que fatia parou no topo
    setTimeout(() => {
      // O CSS gira no sentido horário. Precisamos calcular o que sobrou.
      const netRotation = totalDegrees % 360;

      // O topo da roda no HTML Canvas fica no ângulo de 270 graus.
      let pointerAngle = (270 - netRotation) % 360;
      if (pointerAngle < 0) pointerAngle += 360;

      const degreesPerSegment = 360 / numSegments;
      const winningIndex = Math.floor(pointerAngle / degreesPerSegment);
      const selectedOption = options[winningIndex];

      // Exibe o prêmio ganho na tela
      resultTitle.textContent = selectedOption.label;
      resultTitle.style.color = selectedOption.id === 'multa_10' ? '#f8d26a' : selectedOption.color;
      resultDesc.textContent = selectedOption.desc;

      btnClose.style.display = 'block';

      btnClose.onclick = async () => {
        btnClose.textContent = 'APLICANDO...';
        btnClose.disabled = true;

        try {
          let updates = {};

          // Trata os novos níveis de silêncio dinamicamente
          if (selectedOption.id.startsWith('silencio_')) {
            const extraDicas = parseInt(selectedOption.id.split('_')[1]);
            const freshDoc = await gameRef.get();
            const freshLength = freshDoc.data().revealedIndexes ? freshDoc.data().revealedIndexes.length : 0;
            updates.silenceTarget = freshLength + extraDicas;
          }
          // Trata a inflação
          else if (selectedOption.id === 'inflacao') {
            updates.inflationActive = true;
          }
          // Trata valores diretos de multa ou spin
          else if (selectedOption.id === 'multa_5') {
            updates.debt = firebase.firestore.FieldValue.increment(5);
          } else if (selectedOption.id === 'multa_10') {
            updates.debt = firebase.firestore.FieldValue.increment(10);
          } else if (selectedOption.id === 'spin_2') {
            updates.debt = firebase.firestore.FieldValue.increment(2);
          } else if (selectedOption.id === 'spin_3') {
            updates.debt = firebase.firestore.FieldValue.increment(3);
          } else if (selectedOption.id === 'spin_4') {
            updates.debt = firebase.firestore.FieldValue.increment(4);
          } else if (selectedOption.id === 'spin_5') {
            updates.debt = firebase.firestore.FieldValue.increment(5);
          }

          await gameRef.update(updates);

          // Verifica se o ID clicado é um dos que giram a roleta de novo
          if (selectedOption.id.startsWith('spin_')) {
            btnClose.disabled = false;
            btnClose.textContent = 'ACEITAR PUNIÇÃO';
            // Chama a função novamente para girar mais uma vez
            triggerRouletteSpin(currentData);
          } else {
            modal.style.display = 'none';
            btnClose.disabled = false;
            btnClose.textContent = 'ACEITAR PUNIÇÃO';
          }
        } catch (e) {
          console.error('Erro na Roleta:', e);
        }
      };
    }, 4600);
  }, 50);
}

function generateClueButtons(revealedIndexes, clueCost) {
  const board = document.getElementById('clues-board');
  if (!board) return;
  board.innerHTML = '';

  const safeRevealed = revealedIndexes || [];
  const revealedIds = safeRevealed.map((x) => (typeof x === 'object' ? x.index : x));

  // BLINDAGEM: Garante que a memória de armadilhas exista antes de tentar ler
  window.clickedTraps = window.clickedTraps || [];

  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn-clue';
    btn.innerHTML = `<span style="font-size: 1.2rem; display: block; margin-bottom: 4px;">💎</span>${String(i).padStart(2, '0')}`;

    // Desativa se já for dica revelada OU trap/roleta estourada na memória do jogador
    if (revealedIds.includes(i - 1) || window.clickedTraps.includes(i - 1)) {
      btn.disabled = true;
      if (window.clickedTraps.includes(i - 1)) {
        btn.style.opacity = '0.3';
        btn.style.cursor = 'not-allowed';
        btn.style.border = '1px solid var(--red)'; // Marca visual padrão de armadilha acionada
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
        const isRoulette = currentData.rouletteIndex === i - 1;

        // Pega o custo real considerando se a Inflação está ativa
        const actualCost = currentData.inflationActive ? clueCost * 2 : clueCost;

        if (isTrap) {
          // SALVA NA MEMÓRIA QUE A ARMADILHA EXPLODIU
          window.clickedTraps.push(i - 1);
          btn.style.border = '1px solid var(--red)';

          // COBRA O VALOR DA DICA E SALVA NOS REVEALED INDEXES
          await gameRef.update({
            debt: firebase.firestore.FieldValue.increment(actualCost),
            revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
              index: i - 1,
              timestamp: Date.now(),
            }),
          });
          showToast('ARMADILHA! Perdeu a vez e o valor da dica!', 'danger');
        } else if (isRoulette) {
          window.clickedTraps.push(i - 1);
          btn.style.border = '1px solid #b538ff';

          // Cobra o valor da dica normal e depois joga pra roleta
          await gameRef.update({
            debt: firebase.firestore.FieldValue.increment(actualCost),
            revealedIndexes: firebase.firestore.FieldValue.arrayUnion({
              index: i - 1,
              timestamp: Date.now(),
            }),
          });

          triggerRouletteSpin(currentData);
        } else {
          // DICA NORMAL: COBRA O VALOR DA DICA
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
