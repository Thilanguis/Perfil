// --- AÇÕES DO CONTROLADOR (ADMIN) ---

// ==========================================
// 🎛️ CENTRAL DE MIXAGEM DE ÁUDIO (EQUILIBRADA)
// ==========================================

// Trilha 1: Fase de preparação das armadilhas
window.bgMusicPrep = window.bgMusicPrep || new Audio('assets/sfx/preparacao-mesa.mp3');
window.bgMusicPrep.loop = true;
window.bgMusicPrep.volume = 0.45;

// Trilha 2: Rodada ativa (Subida de 0.15 para 0.35 para dar presença sem cobrir a Azure)
window.bgMusicGameplay = window.bgMusicGameplay || new Audio('assets/sfx/gameplay.mp3');
window.bgMusicGameplay.loop = true;
window.bgMusicGameplay.volume = 0.35;

// Trilha 3: Roleta girando e aplicando punições
window.bgMusicRoulette = window.bgMusicRoulette || new Audio('assets/sfx/roleta.mp3');
window.bgMusicRoulette.loop = true;
window.bgMusicRoulette.volume = 0.45;

// Trilha 4: Clímax do Palpite Cravado (Coração bombando alto para gerar pânico nas duas telas)
window.bgMusicSuspense = window.bgMusicSuspense || new Audio('assets/sfx/suspense-palpite.mp3');
window.bgMusicSuspense.loop = true;
window.bgMusicSuspense.volume = 0.85;

// SFX 1: Feedback instantâneo de Acerto (Reduzido de 0.5 para 0.25 para não estourar o ouvido)
window.sfxCorrect = window.sfxCorrect || new Audio('assets/sfx/resultado-acerto.mp3');
window.sfxCorrect.loop = false;
window.sfxCorrect.volume = 0.25;

// SFX 2: Feedback instantâneo de Erro/Taxação (Reduzido de 0.5 para 0.25 para ficar confortável)
window.sfxWrong = window.sfxWrong || new Audio('assets/sfx/resultado-erro.mp3');
window.sfxWrong.loop = false;
window.sfxWrong.volume = 0.25;

// Função auxiliar reutilizável para criar a confirmação inline "Sim/Não"
function criarConfirmacaoInline(botaoOriginal, mensagem, acaoConfirmada) {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '10px';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.width = '100%';
  wrapper.style.marginTop = window.getComputedStyle(botaoOriginal).marginTop;

  wrapper.innerHTML = `
    <span style="color: var(--text); font-size: 0.85rem; font-weight: bold; white-space: nowrap;">${mensagem}</span>
    <button class="btn-danger" style="padding: 8px 16px; font-size: 0.8rem; flex: 1; margin: 0;">Sim</button>
    <button class="btn-primary" style="padding: 8px 16px; font-size: 0.8rem; flex: 1; margin: 0; background: var(--border); color: #fff; border: 1px solid #444;">Não</button>
  `;

  botaoOriginal.style.display = 'none';
  botaoOriginal.parentNode.insertBefore(wrapper, botaoOriginal);

  const botoes = wrapper.querySelectorAll('button');
  const btnSim = botoes[0];
  const btnNao = botoes[1];

  const restaurarBotao = () => {
    wrapper.remove();
    botaoOriginal.style.display = '';
  };

  btnSim.addEventListener('click', async () => {
    restaurarBotao();
    await acaoConfirmada();
  });

  btnNao.addEventListener('click', restaurarBotao);
}

// Função para listar apenas as categorias disponíveis (Mantém o total segredo das respostas)
function updateAdminDeckList() {
  const select = document.getElementById('admin-card-select');
  if (!select) return;
  select.innerHTML = '';

  const randomOpt = document.createElement('option');
  randomOpt.value = 'random';
  randomOpt.textContent = '🎲 Sortear Qualquer Charada Aleatória';
  select.appendChild(randomOpt);

  const categories = [...new Set(PRELOADED_CARDS.map((card) => card.category))].sort();

  categories.forEach((category) => {
    const opt = document.createElement('option');
    opt.value = `category_${category}`;
    opt.textContent = `Tipo: ${category}`;
    select.appendChild(opt);
  });
}

// Inicialização da Mesa pelo Dominador
const roundsOptions = document.getElementById('setup-rounds-options');
if (roundsOptions) {
  roundsOptions.addEventListener('click', (event) => {
    const option = event.target.closest('.round-option');
    if (!option) return;

    roundsOptions.querySelectorAll('.round-option').forEach((button) => button.classList.remove('active'));
    option.classList.add('active');
    document.getElementById('setup-total-rounds').value = option.dataset.rounds;
  });
}

document.getElementById('btn-enter-controller').addEventListener('click', async () => {
  try {
    const doc = await gameRef.get();
    const data = doc.exists ? doc.data() : {};

    // Se a sala já estiver ativa, apenas retoma o controle sem zerar os dados atuais
    if (data.status && data.status !== 'closed') {
      sessionStorage.setItem('gameRole', 'admin');
      document.getElementById('view-selection').classList.remove('active');
      document.getElementById('view-controller').classList.add('active');
      updateAdminDeckList();

      if (typeof window.requestScreenWakeLock === 'function') {
        await window.requestScreenWakeLock();
      }
      return;
    }

    // Se a mesa estiver fechada, inicializa uma nova sessão do zero
    const adminNameEl = document.getElementById('setup-admin-name');
    const pixKeyEl = document.getElementById('setup-admin-pix');
    const clueCostEl = document.getElementById('setup-clue-cost');
    const penaltyEl = document.getElementById('setup-penalty');
    const totalRoundsEl = document.getElementById('setup-total-rounds');

    const adminName = adminNameEl ? adminNameEl.value.trim() : 'Dominador';
    const pixValidation = window.PixPayment.normalizeKey(pixKeyEl ? pixKeyEl.value : '');
    const cCost = clueCostEl ? parseFloat(clueCostEl.value) : 2.0;
    const pPenalty = penaltyEl ? parseFloat(penaltyEl.value) : 10.0;
    const requestedRounds = totalRoundsEl ? parseInt(totalRoundsEl.value, 10) : 6;
    const totalRounds = [4, 6, 8, 10].includes(requestedRounds) ? requestedRounds : 6;

    if (!pixValidation.valid) {
      if (pixKeyEl) {
        pixKeyEl.focus();
        pixKeyEl.style.borderColor = 'var(--red)';
      }
      showToast(pixValidation.error, 'danger');
      return;
    }

    if (pixKeyEl) {
      pixKeyEl.value = pixValidation.key;
      pixKeyEl.style.borderColor = '';
    }

    await gameRef.set(
      {
        adminName: adminName,
        adminPixKey: pixValidation.key,
        adminPixType: pixValidation.type,
        clueCost: cCost,
        mistakePenalty: pPenalty,
        status: 'waiting',
        latestGuess: '',
        revealedIndexes: [],
        guessLocked: false,
        playerName: '',
        playerJoinedAt: 0,
        pixCharge: null,
        totalRounds: totalRounds,
        history: [],
      },
      { merge: true },
    );

    sessionStorage.setItem('gameRole', 'admin');
    document.getElementById('view-selection').classList.remove('active');
    document.getElementById('view-controller').classList.add('active');
    updateAdminDeckList();

    if (typeof window.requestScreenWakeLock === 'function') {
      await window.requestScreenWakeLock();
    }
  } catch (error) {
    console.error('Erro ao inicializar sessão do controlador:', error);
  }
});

// Botão de Reset de Dívida
document.getElementById('btn-reset-debt').addEventListener('click', (e) => {
  criarConfirmacaoInline(e.currentTarget, 'Zerar tudo?', async () => {
    try {
      await gameRef.update({ debt: 0 });
      showToast('Dívida acumulada zerada com sucesso.', 'gold');
    } catch (error) {
      console.error('Erro ao zerar dívida:', error);
      showToast('Erro ao zerar a dívida.', 'danger');
    }
  });
});

// Gera uma cobrança Pix com o valor total acumulado no momento do clique.
document.getElementById('btn-generate-pix').addEventListener('click', async () => {
  try {
    const doc = await gameRef.get();
    if (!doc.exists) return;

    const data = doc.data();
    const amount = Number(data.debt || 0);
    const pixValidation = window.PixPayment.normalizeKey(data.adminPixKey || '');

    if (!pixValidation.valid) {
      showToast('A chave Pix da mesa não está disponível. Reabra a mesa e informe uma chave válida.', 'danger');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Ainda não existe dívida para cobrar.', 'danger');
      return;
    }

    const roundedAmount = Number(amount.toFixed(2));
    const payload = window.PixPayment.generatePayload({
      key: pixValidation.key,
      amount: roundedAmount,
      merchantName: data.adminName || 'Perfil Tribute',
      merchantCity: 'Brasil',
    });

    await gameRef.update({
      pixCharge: {
        id: `${Date.now()}`,
        active: true,
        amount: roundedAmount,
        key: pixValidation.key,
        keyType: pixValidation.type,
        payload,
        createdAt: Date.now(),
      },
    });

    showToast(`Cobrança Pix de R$ ${roundedAmount.toFixed(2)} enviada ao dominado.`, 'success');
  } catch (error) {
    console.error('Erro ao gerar cobrança Pix:', error);
    showToast(error.message || 'Não foi possível gerar a cobrança Pix.', 'danger');
  }
});

document.getElementById('btn-cancel-pix').addEventListener('click', async () => {
  try {
    await gameRef.update({ pixCharge: null });
    showToast('Cobrança retirada da tela do dominado.', 'gold');
  } catch (error) {
    console.error('Erro ao retirar cobrança Pix:', error);
    showToast('Não foi possível retirar a cobrança.', 'danger');
  }
});

// Lança a Charada para o Jogo
document.getElementById('btn-start-round').addEventListener('click', async () => {
  const sessionSnapshot = await gameRef.get();
  const sessionData = sessionSnapshot.exists ? sessionSnapshot.data() : {};
  const completedRounds = Array.isArray(sessionData.history) ? sessionData.history.length : 0;
  const totalRounds = Number(sessionData.totalRounds) || 6;

  if (completedRounds >= totalRounds || sessionData.status === 'session_finished') {
    showToast('A partida já terminou. Encerre a sessão para abrir uma nova mesa.', 'gold');
    return;
  }

  let selectedValue = document.getElementById('admin-card-select').value;
  if (!selectedValue) return;

  let cardData;
  if (selectedValue === 'random') {
    const randomIndex = Math.floor(Math.random() * PRELOADED_CARDS.length);
    cardData = PRELOADED_CARDS[randomIndex];
  } else if (selectedValue.startsWith('category_')) {
    const targetCategory = selectedValue.replace('category_', '');
    const filteredCards = PRELOADED_CARDS.filter((c) => c.category === targetCategory);
    const randomIndex = Math.floor(Math.random() * filteredCards.length);
    cardData = filteredCards[randomIndex];
  }

  const newClueCost = Number(sessionData.clueCost) || 2;
  const newPenalty = Number(sessionData.mistakePenalty) || 10;

  await gameRef.update({
    cardId: cardData.id,
    category: cardData.category,
    answer: cardData.answer,
    clues: cardData.clues,
    clueCost: newClueCost,
    mistakePenalty: newPenalty,
    trapIndices: [],
    rouletteIndex: -1,
    inflationMultiplier: 1,
    silenceTarget: 0,
    trapsReady: false,
    revealedIndexes: [],
    roundPenalties: [],
    latestGuess: '',
    status: 'playing',
    guessLocked: false,
    roundResult: '',
    playPrepMusic: true, // <-- Liga o sinal da música globalmente no banco
  });

  showToast('Charada lançada! Prepare as armadilhas e libere a mesa.', 'gold');
});

// Libera a mesa após a Mistress definir as armadilhas (Unificado e sem duplicidade)
document.getElementById('btn-unlock-board').addEventListener('click', async () => {
  if (window.bgMusicPrep && !window.bgMusicPrep.paused) {
    window.bgMusicPrep.pause();
  }

  await gameRef.update({
    trapsReady: true,
    playPrepMusic: false,
  });
  showToast('Mesa liberada! O dominado agora pode interagir.', 'success');
});

// Botão para derrubar o jogador com travas completas de áudio
document.getElementById('btn-close-session').addEventListener('click', (e) => {
  criarConfirmacaoInline(e.currentTarget, 'Encerrar sessão?', async () => {
    sessionStorage.removeItem('gameRole');
    sessionStorage.removeItem('devtoolsView');

    if (typeof window.releaseScreenWakeLock === 'function') {
      window.releaseScreenWakeLock();
    }

    // Mata as instâncias locais instantaneamente
    if (window.bgMusicPrep && !window.bgMusicPrep.paused) {
      window.bgMusicPrep.pause();
    }
    if (window.bgMusicGameplay && !window.bgMusicGameplay.paused) {
      window.bgMusicGameplay.pause();
    }
    if (window.bgMusicRoulette && !window.bgMusicRoulette.paused) {
      window.bgMusicRoulette.pause();
    }
    if (window.bgMusicSuspense && !window.bgMusicSuspense.paused) {
      window.bgMusicSuspense.pause();
    }

    try {
      await gameRef.set(
        {
          status: 'closed',
          debt: 0,
          revealedIndexes: [],
          latestGuess: '',
          guessLocked: false,
          history: [],
          playPrepMusic: false,
          pixCharge: null,
          adminPixKey: '',
          adminPixType: '',
        },
        { merge: true },
      );
      showToast('Sessão encerrada e submisso desconectado.', 'danger');

      // Matamos o limbo forçando o navegador a recarregar a página na rota limpa.
      // Isso destrói os listeners antigos do Firestore e abre espaço para uma nova sala do zero.
      window.location.href = window.location.pathname;
    } catch (error) {
      console.error('Erro ao fechar sessão:', error);
    }
  });
});

// Botão de Copiar / Compartilhar Convite
const btnCopyInvite = document.getElementById('btn-copy-invite');
if (btnCopyInvite) {
  btnCopyInvite.addEventListener('click', async () => {
    const inviteUrl = window.location.href;
    const shareData = {
      title: 'Mesa de Tributos',
      text: 'A Mistress está te aguardando na mesa. Entre agora:',
      url: inviteUrl,
    };

    // Tenta usar a Web Share API (Mobile / Navegadores modernos)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        // Não disparamos toast de sucesso genérico aqui porque a própria UI do celular assume o controle,
        // mas você pode logar se precisar.
      } catch (err) {
        // Ignora o erro se o usuário apenas fechou a janela de compartilhamento (AbortError)
        if (err.name !== 'AbortError') {
          console.error('Erro ao abrir o menu de compartilhamento:', err);
          fallbackCopyText(inviteUrl);
        }
      }
    } else {
      // Fallback: Se o navegador não suportar (ex: Desktop antigo), copia o link
      fallbackCopyText(inviteUrl);
    }
  });

  function fallbackCopyText(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('Link da mesa copiado! Cole e envie para o dominado.', 'success');
      })
      .catch((err) => {
        console.error('Erro ao copiar:', err);
        showToast('Falha ao copiar o link.', 'danger');
      });
  }
}

// --- CÁLCULO EXATO DO HISTÓRICO (O GRANDE BUG MATEMÁTICO RESOLVIDO) ---

// Listener de Acerto
document.getElementById('btn-mark-correct').addEventListener('click', async () => {
  try {
    const doc = await gameRef.get();
    if (doc.exists) {
      const data = doc.data();
      const cluesCount = data.revealedIndexes ? data.revealedIndexes.length : 0;

      // MÁGICA AQUI: Salva no histórico a dívida REAL que o banco calculou (com inflações e roletas aplicadas)
      const finalCost = data.debt || 0;

      const logEntry = {
        answer: data.answer || 'Desconhecida',
        category: data.category || 'Geral',
        cluesUsed: cluesCount,
        cost: finalCost,
        result: 'correct',
        penalties: data.roundPenalties || [],
        timestamp: Date.now(),
      };

      const totalRounds = Number(data.totalRounds) || 6;
      const isLastRound = (Array.isArray(data.history) ? data.history.length : 0) + 1 >= totalRounds;

      await gameRef.update({
        status: isLastRound ? 'session_finished' : 'finished',
        latestGuess: '',
        guessLocked: false,
        roundResult: 'correct',
        history: firebase.firestore.FieldValue.arrayUnion(logEntry),
      });
      showToast(isLastRound ? 'Partida encerrada com acerto!' : 'Rodada encerrada com acerto!', 'success');
    }
  } catch (error) {
    console.error('Erro ao encerrar rodada com acerto:', error);
  }
});

// Listener de Erro
document.getElementById('btn-mark-wrong').addEventListener('click', async () => {
  try {
    const doc = await gameRef.get();
    if (doc.exists) {
      const sessionData = doc.data();
      const penaltyValue = sessionData && sessionData.mistakePenalty ? parseFloat(sessionData.mistakePenalty) : 10.0;
      const cluesCount = sessionData.revealedIndexes ? sessionData.revealedIndexes.length : 0;

      // MÁGICA AQUI: Pega a dívida real turbinada pela roleta e apenas soma a taxa final de erro
      const currentDebt = sessionData.debt || 0;
      const totalLoss = currentDebt + penaltyValue;

      const logEntry = {
        answer: sessionData.answer || 'Desconhecida',
        category: sessionData.category || 'Geral',
        cluesUsed: cluesCount,
        cost: totalLoss,
        result: 'wrong',
        penalties: sessionData.roundPenalties || [],
        timestamp: Date.now(),
      };

      const totalRounds = Number(sessionData.totalRounds) || 6;
      const isLastRound = (Array.isArray(sessionData.history) ? sessionData.history.length : 0) + 1 >= totalRounds;

      await gameRef.update({
        debt: firebase.firestore.FieldValue.increment(penaltyValue),
        latestGuess: '',
        status: isLastRound ? 'session_finished' : 'finished',
        guessLocked: false,
        roundResult: 'wrong',
        history: firebase.firestore.FieldValue.arrayUnion(logEntry),
      });
      showToast(isLastRound ? 'Partida encerrada com a penalidade final!' : 'Penalidade aplicada! O dominado errou.', 'danger');
    }
  } catch (error) {
    console.error('Erro crítico no processo de taxação:', error);
  }
});

// --- GARANTIR QUE A LISTA SEJA POPULADA AO CARREGAR ---
document.addEventListener('DOMContentLoaded', updateAdminDeckList);
