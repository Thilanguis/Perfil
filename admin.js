// --- AÇÕES DO CONTROLADOR (ADMIN) ---

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

// Função com agrupamento por categoria
function updateAdminDeckList() {
  const select = document.getElementById('admin-card-select');
  if (!select) return;
  select.innerHTML = '';

  const randomOpt = document.createElement('option');
  randomOpt.value = 'random';
  randomOpt.textContent = '🎲 Sortear Charada Aleatória';
  select.appendChild(randomOpt);

  const groups = {};
  PRELOADED_CARDS.forEach((card) => {
    if (!groups[card.category]) groups[card.category] = [];
    groups[card.category].push(card);
  });

  Object.keys(groups)
    .sort()
    .forEach((category) => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = category;
      groups[category].forEach((card) => {
        const opt = document.createElement('option');
        opt.value = card.id;
        opt.textContent = card.answer;
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
    });
}

// Listeners de Sincronização Instantânea
const editClue = document.getElementById('admin-edit-clue');
const editPenalty = document.getElementById('admin-edit-penalty');

if (editClue) {
  editClue.addEventListener('input', async (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) await gameRef.update({ clueCost: val }).catch(console.error);
  });
}

if (editPenalty) {
  editPenalty.addEventListener('input', async (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) await gameRef.update({ mistakePenalty: val }).catch(console.error);
  });
}

// Listener de Sincronização Instantânea (sem debounce)
document.getElementById('admin-edit-clue').addEventListener('input', async (e) => {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    try {
      await gameRef.update({ clueCost: val });
    } catch (error) {
      console.error('Erro ao atualizar Custo Dica:', error);
    }
  }
});

document.getElementById('admin-edit-penalty').addEventListener('input', async (e) => {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    try {
      await gameRef.update({ mistakePenalty: val });
    } catch (error) {
      console.error('Erro ao atualizar Multa Erro:', error);
    }
  }
});

// Inicialização da Mesa VIP pelo Dominador
document.getElementById('btn-enter-controller').addEventListener('click', async () => {
  const adminNameEl = document.getElementById('setup-admin-name');
  const clueCostEl = document.getElementById('setup-clue-cost');
  const penaltyEl = document.getElementById('setup-penalty');

  const adminName = adminNameEl ? adminNameEl.value.trim() : 'Dominador';
  const cCost = clueCostEl ? parseFloat(clueCostEl.value) : 2.0;
  const pPenalty = penaltyEl ? parseFloat(penaltyEl.value) : 10.0;

  try {
    await gameRef.set(
      {
        adminName: adminName,
        clueCost: cCost,
        mistakePenalty: pPenalty,
        status: 'waiting',
        latestGuess: '',
        revealedIndexes: [],
        guessLocked: false,
        playerName: '', // Limpa o fantasma da sessão anterior
        playerJoinedAt: 0, // Reseta o cronômetro de entrada
      },
      { merge: true },
    );

    sessionStorage.setItem('gameRole', 'admin'); // MEMORIZA PAPEL DO ADMIN ISOLADO NESTA ABA
    document.getElementById('view-selection').classList.remove('active');
    document.getElementById('view-controller').classList.add('active');
    updateAdminDeckList();
  } catch (error) {
    console.error('Erro ao inicializar sessão do controlador:', error);
  }
});

// Botão de Reset de Dívida com confirmação explícita inline (Substituído com segurança)
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

  // CORREÇÃO: Verifica se os inputs existem antes de tentar ler o .value
  const clueInput = document.getElementById('admin-edit-clue');
  const penaltyInput = document.getElementById('admin-edit-penalty');

  const newClueCost = clueInput ? parseFloat(clueInput.value) : 2;
  const newPenalty = penaltyInput ? parseFloat(penaltyInput.value) : 10;

  await gameRef.update({
    cardId: cardData.id,
    category: cardData.category,
    answer: cardData.answer,
    clues: cardData.clues,
    clueCost: newClueCost,
    mistakePenalty: newPenalty,
    trapIndices: [],
    trapsReady: false, // TRAVA A MESA DO JOGADOR
    revealedIndexes: [],
    latestGuess: '',
    status: 'playing',
    guessLocked: false,
    roundResult: '',
  });

  showToast('Charada lançada! Prepare as armadilhas e libere a mesa.', 'gold');
});

// Libera a mesa após a Mistress definir as armadilhas
document.getElementById('btn-unlock-board').addEventListener('click', async () => {
  await gameRef.update({ trapsReady: true });
  showToast('Mesa liberada! O dominado agora pode interagir.', 'success');
});

// Botão para derrubar o jogador e resetar a mesa com confirmação explícita inline (Substituído com segurança)
document.getElementById('btn-close-session').addEventListener('click', (e) => {
  criarConfirmacaoInline(e.currentTarget, 'Encerrar sessão?', async () => {
    sessionStorage.removeItem('gameRole'); // LIMPA O PAPEL DESTA ABA NO LOGOUT
    try {
      await gameRef.update({
        status: 'closed',
        debt: 0,
        revealedIndexes: [],
        latestGuess: '',
        guessLocked: false,
        history: [], // Reseta o histórico ao fechar a mesa completamente
      });
      showToast('Sessão encerrada e submisso desconectado.', 'danger');
      document.getElementById('view-controller').classList.remove('active');
      document.getElementById('view-selection').classList.add('active');
    } catch (error) {
      console.error('Erro ao fechar sessão:', error);
    }
  });
});

// Listener de Acerto reseta a flag de trava e computa histórico
document.getElementById('btn-mark-correct').addEventListener('click', async () => {
  try {
    const doc = await gameRef.get();
    if (doc.exists) {
      const data = doc.data();
      const cluesCount = data.revealedIndexes ? data.revealedIndexes.length : 0;
      const cluesCostTotal = cluesCount * (data.clueCost || 0);

      const logEntry = {
        answer: data.answer || 'Desconhecida',
        category: data.category || 'Geral',
        cluesUsed: cluesCount,
        cost: cluesCostTotal,
        result: 'correct',
        timestamp: Date.now(),
      };

      await gameRef.update({
        status: 'finished',
        latestGuess: '',
        guessLocked: false,
        roundResult: 'correct',
        history: firebase.firestore.FieldValue.arrayUnion(logEntry),
      });
      showToast('Rodada encerrada com acerto!', 'success');
    }
  } catch (error) {
    console.error('Erro ao encerrar rodada com acerto:', error);
  }
});

// Listener de Erro reseta a flag de trava, aplica a multa e computa histórico
document.getElementById('btn-mark-wrong').addEventListener('click', async () => {
  try {
    const doc = await gameRef.get();
    if (doc.exists) {
      const sessionData = doc.data();
      const penaltyValue = sessionData && sessionData.mistakePenalty ? parseFloat(sessionData.mistakePenalty) : 10.0;
      const cluesCount = sessionData.revealedIndexes ? sessionData.revealedIndexes.length : 0;
      const cluesCostTotal = cluesCount * (sessionData.clueCost || 0);
      const totalLoss = cluesCostTotal + penaltyValue;

      const logEntry = {
        answer: sessionData.answer || 'Desconhecida',
        category: sessionData.category || 'Geral',
        cluesUsed: cluesCount,
        cost: totalLoss,
        result: 'wrong',
        timestamp: Date.now(),
      };

      await gameRef.update({
        debt: firebase.firestore.FieldValue.increment(penaltyValue),
        latestGuess: '',
        status: 'finished',
        guessLocked: false,
        roundResult: 'wrong',
        history: firebase.firestore.FieldValue.arrayUnion(logEntry),
      });
      showToast('Penalidade aplicada! O dominado errou.', 'danger');
    } else {
      console.error('Sessão não encontrada no Firestore para aplicar a multa.');
    }
  } catch (error) {
    console.error('Erro crítico no processo de taxação:', error);
  }
});

// --- SINCRONIZAÇÃO INSTANTÂNEA (SEM ESPERA) ---
document.getElementById('admin-edit-clue').addEventListener('input', async (e) => {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    try {
      await gameRef.update({ clueCost: val });
    } catch (error) {
      console.error('Erro ao atualizar Custo Dica:', error);
    }
  }
});

document.getElementById('admin-edit-penalty').addEventListener('input', async (e) => {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    try {
      await gameRef.update({ mistakePenalty: val });
    } catch (error) {
      console.error('Erro ao atualizar Multa Erro:', error);
    }
  }
});

// --- GARANTIR QUE A LISTA SEJA POPULADA AO CARREGAR ---
document.addEventListener('DOMContentLoaded', updateAdminDeckList);

// Log para monitoramento
console.log('Cartas carregadas:', typeof PRELOADED_CARDS !== 'undefined' ? PRELOADED_CARDS.length : 'ERRO: PRELOADED_CARDS NÃO ENCONTRADO');
