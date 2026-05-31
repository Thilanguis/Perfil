// --- NAVEGAÇÃO BÁSICA ---
document.getElementById('btn-enter-player').addEventListener('click', async () => {
  const pName = document.getElementById('setup-player-name').value.trim() || 'Jogador';

  // Atualiza o nome do dominado no Firebase antes de abrir a tela
  await gameRef.update({ playerName: pName });

  document.getElementById('view-selection').classList.remove('active');
  document.getElementById('view-player').classList.add('active');
  generateClueButtons([], 5.0);
});

document.querySelectorAll('.btn-back').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('view-player').classList.remove('active');
    document.getElementById('view-controller').classList.remove('active');
    document.getElementById('view-selection').classList.add('active');
  });
});

// --- LISTENER EM TEMPO REAL (O CORAÇÃO DO JOGO) ---
let localPlayerDebt = 0;

gameRef.onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    const currentDebt = data.debt || 0;

    // 1. Aciona o Flash Tela Cheia se a dívida subiu
    if (currentDebt > localPlayerDebt) {
      const diff = currentDebt - localPlayerDebt;
      const flash = document.getElementById('punishment-flash');
      const flashVal = document.getElementById('flash-penalty-value');

      if (flash && flashVal) {
        flashVal.textContent = `CAD +${diff.toFixed(2)}`;
        flash.classList.add('active');

        // Correção do Aviso: Só tenta vibrar se o usuário já tiver interagido com a página
        try {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } catch (e) {
          console.log('Vibração ignorada até o usuário clicar na tela.');
        }

        setTimeout(() => {
          flash.classList.remove('active');
        }, 1000);
      }
    }
    localPlayerDebt = currentDebt;

    // Expulsa o jogador se a sessão for fechada
    const viewPlayerEl = document.getElementById('view-player');
    if (data.status === 'closed' && viewPlayerEl && viewPlayerEl.classList.contains('active')) {
      viewPlayerEl.classList.remove('active');
      document.getElementById('view-selection').classList.add('active');
      alert('Sessão encerrada pela Mistress. Você foi desconectado da mesa.');
    }

    // --- TRAVAS DE SEGURANÇA E LOBBY ---

    // 1. Controle do Lobby: Bloqueia o botão de entrar se não houver mesa VIP aberta
    const enterPlayerBtn = document.getElementById('btn-enter-player');
    if (enterPlayerBtn) {
      if (data.status === 'closed' || !data.status) {
        enterPlayerBtn.disabled = true;
        enterPlayerBtn.textContent = 'Mesa Fechada';
        enterPlayerBtn.style.opacity = '0.5';
        enterPlayerBtn.style.cursor = 'not-allowed';
      } else {
        enterPlayerBtn.disabled = false;
        enterPlayerBtn.textContent = 'Entrar na Mesa';
        enterPlayerBtn.style.opacity = '1';
        enterPlayerBtn.style.cursor = 'pointer';
      }
    }

    // 2. Controle da Mistress: Trava a edição de taxas e envio de carta se a rodada estiver em andamento
    const editClue = document.getElementById('admin-edit-clue');
    const editPenalty = document.getElementById('admin-edit-penalty');
    const cardSelect = document.getElementById('admin-card-select');
    const startRoundBtn = document.getElementById('btn-start-round');

    const isPlaying = data.status === 'playing';

    if (editClue) editClue.disabled = isPlaying;
    if (editPenalty) editPenalty.disabled = isPlaying;
    if (cardSelect) cardSelect.disabled = isPlaying;
    if (startRoundBtn) startRoundBtn.disabled = isPlaying;

    // Escurece os inputs da Mistress para dar feedback visual de que estão travados
    if (isPlaying) {
      if (editClue) editClue.style.opacity = '0.5';
      if (editPenalty) editPenalty.style.opacity = '0.5';
      if (startRoundBtn) startRoundBtn.style.opacity = '0.5';
    } else {
      if (editClue) editClue.style.opacity = '1';
      if (editPenalty) editPenalty.style.opacity = '1';
      if (startRoundBtn) startRoundBtn.style.opacity = '1';
    }

    // 2. Atualiza Admin Dashboard
    const adminStatusContainer = document.getElementById('controller-status-container');
    const adminDashboardCard = document.getElementById('admin-dashboard-card');

    if (adminStatusContainer && adminDashboardCard) {
      if (data.status === 'playing') {
        adminStatusContainer.style.display = 'none';
        adminDashboardCard.style.display = 'block';

        const secretAns = document.getElementById('admin-secret-answer');
        if (secretAns) secretAns.textContent = data.answer;

        const currDebt = document.getElementById('admin-current-debt');
        if (currDebt) currDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;

        const latestG = document.getElementById('controller-latest-guess');
        const btnCorrect = document.getElementById('btn-mark-correct');
        const btnWrong = document.getElementById('btn-mark-wrong');

        // Se a rodada acabou ou não há chute ativo, exibe vazio e trava os botões
        if (!data.latestGuess || data.status !== 'playing') {
          if (latestG) latestG.textContent = 'Aguardando palpite...';
          if (btnCorrect) btnCorrect.disabled = true;
          if (btnWrong) btnWrong.disabled = true;
          if (btnCorrect) btnCorrect.style.opacity = '0.4';
          if (btnWrong) btnWrong.style.opacity = '0.4';
        } else {
          if (latestG) latestG.textContent = data.latestGuess;
          if (btnCorrect) btnCorrect.disabled = false;
          if (btnWrong) btnWrong.disabled = false;
          if (btnCorrect) btnCorrect.style.opacity = '1';
          if (btnWrong) btnWrong.style.opacity = '1';
        }

        // Atualiza o Espelho da Mesa para a Mistress ver onde o dominado está clicando
        const mirrorBoard = document.getElementById('admin-mirror-board');
        if (mirrorBoard) {
          mirrorBoard.innerHTML = '';
          const revealedIndexes = data.revealedIndexes || [];
          const revealedIds = revealedIndexes.map((x) => (typeof x === 'object' ? x.index : x));

          for (let i = 1; i <= 20; i++) {
            const btn = document.createElement('div');
            btn.style.padding = '8px 0';
            btn.style.textAlign = 'center';
            btn.style.borderRadius = '4px';
            btn.style.fontSize = '0.8rem';
            btn.style.fontWeight = 'bold';

            if (revealedIds.includes(i - 1)) {
              btn.style.background = 'var(--gold-dark)';
              btn.style.color = 'var(--black)';
              btn.textContent = `💎 ${String(i).padStart(2, '0')}`;
            } else {
              btn.style.background = 'var(--border)';
              btn.style.color = '#555';
              btn.textContent = String(i).padStart(2, '0');
            }
            mirrorBoard.appendChild(btn);
          }
        }
      } else {
        adminDashboardCard.style.display = 'none';
        adminStatusContainer.style.display = 'block';
        const ctrlStatus = document.getElementById('controller-status');
        if (ctrlStatus) {
          ctrlStatus.textContent = data.status === 'closed' ? 'Sessão Fechada / Dominado Expulso' : 'Rodada Encerrada / Aguardando';
        }
      }
    }

    // 3. Atualiza Tela do Jogador

    const playerName = data.playerName || 'Jogador';
    const uiPlayerName = document.getElementById('ui-player-name');
    if (uiPlayerName) uiPlayerName.textContent = playerName;

    const pCategory = document.getElementById('player-category');
    if (pCategory) pCategory.textContent = data.category || 'Aguardando...';

    const pDebt = document.getElementById('player-debt');
    if (pDebt) pDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;

    const uiClueCost = document.getElementById('ui-clue-cost');
    if (uiClueCost) uiClueCost.textContent = (data.clueCost || 0).toFixed(2);

    const uiMistakePenalty = document.getElementById('ui-mistake-penalty');
    if (uiMistakePenalty) uiMistakePenalty.textContent = (data.mistakePenalty || 0).toFixed(2);

    // 4. Barra Animada da Dívida
    const progressFill = document.getElementById('debt-progress');
    if (progressFill) {
      const maxVisualDebt = 100;
      let percentage = (currentDebt / maxVisualDebt) * 100;
      if (percentage > 100) percentage = 100;

      progressFill.style.width = `${percentage}%`;

      if (currentDebt < 20) {
        progressFill.style.backgroundColor = 'var(--green)';
      } else if (currentDebt < 50) {
        progressFill.style.backgroundColor = '#f8d26a';
      } else if (currentDebt < 80) {
        progressFill.style.backgroundColor = '#ff8c00';
      } else {
        progressFill.style.backgroundColor = 'var(--red)';
      }
    }

    // 5. Dicas Reveladas (Premium)
    const cluesContainer = document.getElementById('revealed-clues');
    if (cluesContainer) {
      cluesContainer.innerHTML = '';

      if (data.revealedIndexes && data.revealedIndexes.length > 0) {
        const sortedRevealed = [...data.revealedIndexes].sort((a, b) => b.timestamp - a.timestamp);

        sortedRevealed.forEach((item) => {
          const div = document.createElement('div');
          div.style.background = 'var(--black)';
          div.style.border = '1px solid var(--gold-dark)';
          div.style.padding = '12px';
          div.style.borderRadius = '6px';
          div.style.marginBottom = '10px';

          div.innerHTML = `
            <div style="color: var(--gold); font-size: 0.8rem; font-weight: bold; margin-bottom: 5px;">DICA #${String(item.index + 1).padStart(2, '0')}</div>
            <div style="color: var(--text);">${data.clues[item.index]}</div>
          `;
          cluesContainer.appendChild(div);
        });
      } else {
        cluesContainer.innerHTML = '<p style="color: #555; text-align: center;">Nenhuma dica comprada.</p>';
      }
    }

    // 6. Bloqueador e Botões
    const playerBlocker = document.getElementById('player-blocker');
    if (playerBlocker) {
      playerBlocker.style.display = data.status === 'playing' ? 'none' : 'flex';
    }

    const viewPlayer = document.getElementById('view-player');
    if (viewPlayer && viewPlayer.classList.contains('active') && data.status === 'playing') {
      generateClueButtons(data.revealedIndexes || [], data.clueCost || 5.0);
    }
  }
});
