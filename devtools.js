(() => {
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);
  const isLocalEnvironment = window.location.protocol === 'file:' || localHosts.has(window.location.hostname);
  if (!isLocalEnvironment) return;

  const panel = document.getElementById('devtools-panel');
  const stateOutput = document.getElementById('devtools-state');
  const statusOutput = document.getElementById('devtools-status');
  const roundOutput = document.getElementById('devtools-round');
  const debtOutput = document.getElementById('devtools-debt');
  const feedback = document.getElementById('devtools-feedback');
  if (!panel) return;

  panel.hidden = false;
  document.body.classList.add('devtools-enabled');

  function showView(viewName) {
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));

    if (viewName === 'admin') {
      sessionStorage.setItem('gameRole', 'admin');
      document.getElementById('view-controller')?.classList.add('active');
      if (typeof window.updateAdminDeckList === 'function') window.updateAdminDeckList();
    } else if (viewName === 'player') {
      sessionStorage.setItem('gameRole', 'player');
      document.getElementById('view-player')?.classList.add('active');
    } else {
      sessionStorage.removeItem('gameRole');
      document.getElementById('view-selection')?.classList.add('active');
    }
  }

  panel.querySelectorAll('[data-dev-view]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        sessionStorage.removeItem('devtoolsView');
        if (button.dataset.devView !== 'lobby') await ensureTestSession();
        showView(button.dataset.devView);
        report(`Visualização alterada para ${button.textContent.trim()}.`, 'success');
      } catch (error) {
        console.error('DevTools: erro ao trocar visualização', error);
        report(`Erro: ${error.message}`, 'error');
      }
    });
  });

  document.getElementById('devtools-open-player')?.addEventListener('click', async () => {
    try {
      await ensureTestSession();
      window.open(window.location.href, 'perfil-dev-player');
      showView('admin');
      report('Dominado aberto na mesma sala, em outra aba.', 'success');
    } catch (error) {
      console.error('DevTools: erro ao abrir dominado', error);
      report(`Erro: ${error.message}`, 'error');
    }
  });

  function report(message, type = 'normal') {
    feedback.textContent = message;
    feedback.dataset.type = type;
  }

  async function ensureTestSession() {
    const snapshot = await gameRef.get();
    const data = snapshot.exists ? snapshot.data() : {};
    if (snapshot.exists && data.status && data.status !== 'closed') return data;

    const testSession = {
      adminName: 'Dominador de Teste',
      adminPixKey: 'teste@perfil.local',
      adminPixType: 'email',
      clueCost: 2,
      mistakePenalty: 10,
      totalRounds: 6,
      status: 'waiting',
      debt: 0,
      latestGuess: '',
      revealedIndexes: [],
      guessLocked: false,
      playerName: 'Dominado de Teste',
      playerJoinedAt: Date.now(),
      pixCharge: null,
      history: [],
      playPrepMusic: false,
    };
    await gameRef.set(testSession, { merge: true });
    return testSession;
  }

  async function getGameData() {
    const snapshot = await gameRef.get();
    return snapshot.exists ? snapshot.data() : {};
  }

  async function startTestRound(data) {
    const completedRounds = Array.isArray(data.history) ? data.history.length : 0;
    const totalRounds = Number(data.totalRounds) || 6;
    if (completedRounds >= totalRounds || data.status === 'session_finished') {
      report('A partida já terminou.', 'warning');
      return;
    }

    const card = PRELOADED_CARDS[Math.floor(Math.random() * PRELOADED_CARDS.length)];
    await gameRef.update({
      cardId: card.id,
      category: card.category,
      answer: card.answer,
      clues: card.clues,
      trapIndices: [0, 5, 10],
      rouletteIndex: 15,
      inflationMultiplier: 1,
      silenceTarget: 0,
      trapsReady: true,
      revealedIndexes: [],
      roundPenalties: [],
      latestGuess: '',
      status: 'playing',
      guessLocked: false,
      roundResult: '',
      playPrepMusic: false,
    });
    report('Próxima rodada lançada e liberada para teste.', 'success');
  }

  async function completeTestRound(result) {
    let data = await ensureTestSession();
    if (data.status === 'session_finished') {
      report('A partida já terminou.', 'warning');
      return { isLastRound: true };
    }
    if (data.status !== 'playing') {
      await startTestRound(data);
      data = await getGameData();
    }

    const history = Array.isArray(data.history) ? [...data.history] : [];
    const totalRounds = Number(data.totalRounds) || 6;
    const penalty = result === 'wrong' ? Number(data.mistakePenalty) || 10 : 0;
    const finalDebt = (Number(data.debt) || 0) + penalty;
    history.push({
      answer: data.answer || 'Teste',
      category: data.category || 'Teste',
      cluesUsed: Array.isArray(data.revealedIndexes) ? data.revealedIndexes.length : 0,
      cost: finalDebt,
      result,
      penalties: data.roundPenalties || [],
      timestamp: Date.now(),
      testOnly: true,
    });

    const isLastRound = history.length >= totalRounds;
    await gameRef.update({
      debt: finalDebt,
      latestGuess: '',
      guessLocked: false,
      status: isLastRound ? 'session_finished' : 'finished',
      roundResult: result,
      history,
    });
    report(isLastRound ? 'Última rodada concluída. Partida encerrada.' : `Rodada concluída como ${result === 'correct' ? 'acerto' : 'erro'}.`, 'success');
    return { isLastRound };
  }

  document.getElementById('devtools-finish-correct')?.addEventListener('click', () => completeTestRound('correct').catch((error) => report(`Erro: ${error.message}`, 'error')));
  document.getElementById('devtools-finish-wrong')?.addEventListener('click', () => completeTestRound('wrong').catch((error) => report(`Erro: ${error.message}`, 'error')));

  document.getElementById('devtools-next-round')?.addEventListener('click', async () => {
    try {
      let data = await ensureTestSession();
      if (data.status === 'session_finished') {
        report('A partida já terminou.', 'warning');
        return;
      }
      if (data.status === 'playing') {
        const result = await completeTestRound('correct');
        if (result?.isLastRound) return;
        data = await getGameData();
      }
      await startTestRound(data);
    } catch (error) {
      console.error('DevTools: erro ao avançar rodada', error);
      report(`Erro: ${error.message}`, 'error');
    }
  });

  document.getElementById('devtools-finish-game')?.addEventListener('click', async () => {
    if (!window.confirm('Terminar imediatamente todas as rodadas de teste?')) return;
    try {
      const data = await ensureTestSession();
      const history = Array.isArray(data.history) ? [...data.history] : [];
      const totalRounds = Number(data.totalRounds) || 6;
      while (history.length < totalRounds) {
        history.push({
          answer: 'Rodada pulada pelo DevTools',
          category: 'Teste',
          cluesUsed: 0,
          cost: Number(data.debt) || 0,
          result: 'correct',
          penalties: [],
          timestamp: Date.now() + history.length,
          testOnly: true,
        });
      }
      await gameRef.update({ status: 'session_finished', roundResult: 'correct', guessLocked: false, playPrepMusic: false, history });
      report('Partida encerrada pelo DevTools.', 'success');
    } catch (error) {
      console.error('DevTools: erro ao terminar partida', error);
      report(`Erro: ${error.message}`, 'error');
    }
  });

  document.getElementById('devtools-toggle')?.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });

  if (window.name === 'perfil-dev-player') {
    sessionStorage.setItem('gameRole', 'player');
    window.setTimeout(() => showView('player'), 0);
  }

  if (typeof gameRef !== 'undefined') {
    gameRef.onSnapshot((snapshot) => {
      const data = snapshot.exists ? snapshot.data() : {};
      const completedRounds = Array.isArray(data.history) ? data.history.length : 0;
      const totalRounds = Number(data.totalRounds) || 6;
      const safeState = {
        status: data.status || 'closed',
        rodada: `${Math.min(completedRounds + 1, totalRounds)}/${totalRounds}`,
        concluidas: completedRounds,
        divida: Number(data.debt) || 0,
        jogador: data.playerName || '—',
        categoria: data.category || '—',
        resposta: data.answer || '—',
        dicasLiberadas: Array.isArray(data.revealedIndexes) ? data.revealedIndexes.length : 0,
        armadilhasProntas: Boolean(data.trapsReady),
        palpiteTravado: Boolean(data.guessLocked),
        cobrancaPixAtiva: Boolean(data.pixCharge?.active),
      };

      statusOutput.textContent = safeState.status;
      roundOutput.textContent = `${completedRounds}/${totalRounds}`;
      debtOutput.textContent = `R$ ${safeState.divida.toFixed(2).replace('.', ',')}`;
      stateOutput.textContent = JSON.stringify(safeState, null, 2);
    });
  }
})();
