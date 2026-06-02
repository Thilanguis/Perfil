// --- FUNÇÃO GLOBAL PARA EFEITO MÁQUINA DE ESCREVER (CORRIGIDA PARA TRAPS) ---
window.typewriterDivs = window.typewriterDivs || new Map();

function typeWriterEffect(element, text, speed = 75) {
  if (!element) return;

  if (element.dataset.fullText === text) return;
  element.dataset.fullText = text;

  if (window.typewriterDivs.has(element)) {
    clearInterval(window.typewriterDivs.get(element));
  }

  element.innerHTML = '';

  // Se for uma armadilha com HTML, extrai apenas o texto puro para fazer a animação de escrita
  let textToAnimate = text;
  let isHtml = text.includes('<span');

  if (isHtml) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    textToAnimate = tempDiv.textContent || tempDiv.innerText;
  }

  let i = 0;
  const timer = setInterval(() => {
    if (i < textToAnimate.length) {
      element.textContent += textToAnimate.charAt(i);
      i++;
    } else {
      clearInterval(timer);
      window.typewriterDivs.delete(element);
      // Quando termina de digitar a armadilha, aplica o HTML com a cor vermelha estilizada
      if (isHtml) {
        element.innerHTML = text;
      }
    }
  }, speed);

  window.typewriterDivs.set(element, timer);
}

// --- FUNÇÃO GLOBAL DE TOAST NOTIFICATION ---
function showToast(message, type = 'gold') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// --- TRANSIÇÃO FLUIDA DO VÍDEO DE ABERTURA ---
document.addEventListener('DOMContentLoaded', () => {
  const splashScreen = document.getElementById('splash-screen');
  const splashVideo = document.getElementById('splash-video');

  if (splashScreen && splashVideo) {
    // Define a velocidade do vídeo (1.0 é o normal, 0.7 é 70% da velocidade, 0.5 é metade)
    splashVideo.playbackRate = 0.7;

    splashVideo.play().catch((e) => console.log('Autoplay bloqueado:', e));

    splashVideo.addEventListener('timeupdate', () => {
      // O tempo de 3.8s continua valendo para o frame do vídeo, mesmo em câmera lenta
      if (splashVideo.currentTime >= 3.8 && !splashScreen.classList.contains('fade-out')) {
        splashScreen.classList.add('fade-out');

        setTimeout(() => {
          splashScreen.remove();
        }, 1000);
      }
    });
  }
});

// --- SISTEMA DE ATUALIZAÇÃO VIA SERVICE WORKER COM MODAL INTERATIVO ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');

      // 1. Detecta se já tem uma atualização aguardando para ser aplicada
      if (registration.waiting) {
        showUpdateModal(registration.waiting);
      }

      // 2. Detecta quando uma nova atualização é encontrada e começa a instalar em background
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            // Quando terminar de baixar, mostra o modal
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateModal(newWorker);
            }
          });
        }
      });
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }

    // 3. Garante que a tela recarregue automaticamente apenas 1x quando o novo SW assumir o controle
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Função auxiliar para exibir o modal e controlar a barra de progresso visual
function showUpdateModal(worker) {
  const modal = document.getElementById('update-modal');
  const progressBar = document.getElementById('update-progress-bar');
  const btnApply = document.getElementById('btn-apply-update');
  const statusText = document.getElementById('update-status-text');

  if (!modal || !progressBar || !btnApply) return;

  // Trava a tela exibindo o modal
  modal.style.display = 'flex';

  // Animação de carregamento (feedback visual premium)
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      progressBar.style.width = '100%';
      statusText.textContent = 'Atualização baixada! Clique para reiniciar.';
      statusText.style.color = 'var(--green)';
      btnApply.style.display = 'block'; // Mostra o botão apenas quando chega em 100%
    } else {
      progressBar.style.width = `${progress}%`;
      statusText.textContent = `Baixando nova versão... ${progress}%`;
    }
  }, 250);

  // Ação do botão: manda o comando pro Service Worker se ativar e reiniciar tudo
  btnApply.addEventListener('click', () => {
    btnApply.textContent = 'Reiniciando...';
    btnApply.disabled = true;
    btnApply.style.opacity = '0.5';
    worker.postMessage('skipWaiting');
  });
}

// --- NAVEGAÇÃO BÁSICA ---
document.getElementById('btn-enter-player').addEventListener('click', async () => {
  const pName = document.getElementById('setup-player-name').value.trim() || 'Jogador';

  // Atualiza o nome do dominado no Firebase e registra a hora da entrada
  await gameRef.update({
    playerName: pName,
    playerJoinedAt: Date.now(),
  });

  sessionStorage.setItem('gameRole', 'player'); // SALVA O PAPEL DE JOGADOR ISOLADO NESTA ABA
  document.getElementById('view-selection').classList.remove('active');
  document.getElementById('view-player').classList.add('active');
  generateClueButtons([], 5.0);
});

document.querySelectorAll('.btn-back').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const savedRole = sessionStorage.getItem('gameRole');
    if (savedRole === 'player') {
      try {
        // Remove os dados de presença do submisso no Firebase ao sair da mesa
        await gameRef.update({
          playerName: '',
          playerJoinedAt: 0,
        });
      } catch (error) {
        console.error('Erro ao registrar saída do jogador:', error);
      }
    }
    sessionStorage.removeItem('gameRole'); // LIMPA O PAPEL DESTA ABA SE RETROCEDER MANUALMENTE
    autoRouted = false;
    document.getElementById('view-player').classList.remove('active');
    document.getElementById('view-controller').classList.remove('active');
    document.getElementById('view-selection').classList.add('active');
  });
});

// --- FUNÇÃO GLOBAL PARA CONTAGEM DE CENTAVOS (TICKER EFFECT) ---
function animateValue(element, start, end, duration) {
  if (!element) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = start + progress * (end - start);
    element.textContent = `CAD ${current.toFixed(2)}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = `CAD ${end.toFixed(2)}`;
    }
  };
  window.requestAnimationFrame(step);
}

// --- LISTENER EM TEMPO REAL (O CORAÇÃO DO JOGO) ---
let localPlayerDebt = 0;
let autoRouted = false; // Flag para controlar o roteamento automático do F5
let isFirstLoad = true; // Evita o falso alarme de subida de valor e bloqueio de vibração no F5
let localPlayerJoinedAt = 0; // Controla a notificação de entrada do jogador

gameRef.onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    const currentDebt = data.debt || 0;

    // --- ROTEAMENTO DINÂMICO AUTOMÁTICO NO REFRESH (F5) ---
    if (!autoRouted && data.status && data.status !== 'closed') {
      const savedRole = sessionStorage.getItem('gameRole'); // LÊ O PAPEL ESPECÍFICO DESTA ABA
      if (savedRole === 'player') {
        document.getElementById('view-selection').classList.remove('active');
        document.getElementById('view-player').classList.add('active');
        autoRouted = true;
      } else if (savedRole === 'admin') {
        document.getElementById('view-selection').classList.remove('active');
        document.getElementById('view-controller').classList.add('active');
        autoRouted = true;
      }
    }

    // --- NOTIFICAÇÃO DE ENTRADA DO DOMINADO ---
    if (data.playerJoinedAt && data.playerJoinedAt > localPlayerJoinedAt) {
      const savedRole = sessionStorage.getItem('gameRole');
      // Avisa apenas a Mistress e garante que não seja apenas um F5 de página
      if (!isFirstLoad && savedRole === 'admin') {
        showToast(`O dominado ${data.playerName || 'Jogador'} acaba de entrar na mesa!`, 'gold');
      }
      localPlayerJoinedAt = data.playerJoinedAt;
    } else if (!data.playerJoinedAt) {
      localPlayerJoinedAt = 0; // Reseta o controle local caso o sub tenha deslogado
    }

    // Só processa efeitos visuais e sonoros se NÃO for a carga inicial da página
    if (currentDebt > localPlayerDebt && !isFirstLoad) {
      const diff = currentDebt - localPlayerDebt;
      const previousDebt = localPlayerDebt;

      let targetEl = null;
      const viewPlayer = document.getElementById('view-player');
      const viewAdmin = document.getElementById('view-controller');

      if (viewPlayer && viewPlayer.classList.contains('active')) {
        targetEl = document.getElementById('player-debt');
      } else if (viewAdmin && viewAdmin.classList.contains('active')) {
        targetEl = document.getElementById('admin-current-debt');
      }

      const floatContainer = document.getElementById('floating-money-container');

      // SOLUÇÃO: Qualquer subida de valor na mesa agora recebe o voo magnético e os centavos correndo
      if (floatContainer && targetEl) {
        const targetRect = targetEl.getBoundingClientRect();
        let targetX = targetRect.left + targetRect.width / 2;
        let targetY = targetRect.top + targetRect.height / 2;

        if (targetX === 0 && targetY === 0) {
          targetX = window.innerWidth / 2;
          targetY = window.innerHeight / 2;
        }

        const floatText = document.createElement('div');
        floatText.className = 'floating-money';
        floatText.textContent = `+ CAD ${diff.toFixed(2)}`;
        floatText.style.left = '50%';
        floatText.style.top = '50%';
        floatContainer.appendChild(floatText);

        void floatText.offsetWidth;
        floatText.classList.add('spawn');

        setTimeout(() => {
          floatText.style.left = `${targetX}px`;
          floatText.style.top = `${targetY}px`;
          floatText.classList.add('collided');

          setTimeout(() => {
            const pDebt = document.getElementById('player-debt');
            const aDebt = document.getElementById('admin-current-debt');

            // Ambas as ações disparam a contagem cadenciada de 1.2s e pulsam em verde
            if (pDebt && viewPlayer && viewPlayer.classList.contains('active')) {
              animateValue(pDebt, previousDebt, currentDebt, 1200);
              pDebt.classList.remove('debt-pop');
              void pDebt.offsetWidth;
              pDebt.classList.add('debt-pop');
            }
            if (aDebt && viewAdmin && viewAdmin.classList.contains('active')) {
              animateValue(aDebt, previousDebt, currentDebt, 1200);
              aDebt.classList.remove('debt-pop');
              void aDebt.offsetWidth;
              aDebt.classList.add('debt-pop');
            }
            floatText.remove();
          }, 800);
        }, 600);
      } else {
        // Fallback de segurança caso os elementos sumam da tela por perda de sincronia
        const pDebt = document.getElementById('player-debt');
        const aDebt = document.getElementById('admin-current-debt');
        if (pDebt) pDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
        if (aDebt) aDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
      }

      try {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    } else {
      // Se a dívida não subiu (ex: início de jogo ou reset completo), limpa o contador instantaneamente
      const pDebt = document.getElementById('player-debt');
      const aDebt = document.getElementById('admin-current-debt');
      if (pDebt) pDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
      if (aDebt) aDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
    }

    localPlayerDebt = currentDebt;
    isFirstLoad = false; // CORREÇÃO: Desativa o primeiro load para liberar os Toasts e vibrações nas ações seguintes

    // Expulsa o jogador e limpa as rotas locais se a sessão fechar ou sumir do banco
    const viewPlayerEl = document.getElementById('view-player');
    if (data.status === 'closed' || !data.status) {
      sessionStorage.removeItem('gameRole'); // LIMPA A MEMÓRIA DESTA ABA
      autoRouted = false;
      if (viewPlayerEl && viewPlayerEl.classList.contains('active')) {
        viewPlayerEl.classList.remove('active');
        document.getElementById('view-selection').classList.add('active');
        showToast('Sessão encerrada pela Mistress. Você foi desconectado da mesa.', 'danger');
      }
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

    // 2. Controle da Mistress: Trava a edição de taxas e envio da charada se a rodada estiver em andamento
    const editClue = document.getElementById('admin-edit-clue');
    const editPenalty = document.getElementById('admin-edit-penalty');
    const cardSelect = document.getElementById('admin-card-select');
    const startRoundBtn = document.getElementById('btn-start-round');

    const isPlaying = data.status === 'playing';

    // Bloqueia apenas o seletor de cartas e o botão de iniciar
    if (cardSelect) cardSelect.disabled = isPlaying;
    if (startRoundBtn) startRoundBtn.disabled = isPlaying;

    // Garante que os inputs de taxa fiquem SEMPRE liberados (sem travas)
    if (editClue) {
      editClue.disabled = false;
      editClue.style.opacity = '1';
    }
    if (editPenalty) {
      editPenalty.disabled = false;
      editPenalty.style.opacity = '1';
    }

    // Feedback visual para o botão que ainda trava
    if (startRoundBtn) {
      startRoundBtn.style.opacity = isPlaying ? '0.5' : '1';
    }

    // 2. Atualiza Admin Dashboard
    const adminStatusContainer = document.getElementById('controller-status-container');
    const adminDashboardCard = document.getElementById('admin-dashboard-card');

    if (adminStatusContainer && adminDashboardCard) {
      // CORREÇÃO: O painel financeiro da direita fica VISÍVEL se a mesa estiver aberta,
      // independente se a rodada atual está rolando, aguardando ou finalizada.
      if (data.status && data.status !== 'closed') {
        adminStatusContainer.style.display = 'none';
        adminDashboardCard.style.display = 'block'; // PROTEGE A DÍVIDA NA TELA

        if (typeof updateAdminDeckList === 'function') {
          updateAdminDeckList();
        }

        const secretAns = document.getElementById('admin-secret-answer');
        if (secretAns) secretAns.textContent = data.answer;

        const latestG = document.getElementById('controller-latest-guess');
        const btnCorrect = document.getElementById('btn-mark-correct');
        const btnWrong = document.getElementById('btn-mark-wrong');
        const guessContainer = document.getElementById('admin-guess-container');

        if (!data.latestGuess || data.status !== 'playing') {
          if (latestG) latestG.innerHTML = '<span style="color: #444;">Aguardando ação...</span>';
          if (btnCorrect) btnCorrect.disabled = true;
          if (btnWrong) btnWrong.disabled = true;
          if (btnCorrect) btnCorrect.style.opacity = '0.4';
          if (btnWrong) btnWrong.style.opacity = '0.4';
          if (guessContainer) {
            guessContainer.style.borderColor = 'var(--gold-dark)';
            guessContainer.style.background = 'var(--black)';
          }
        } else if (data.guessLocked) {
          const isTrap = data.decoyAnswers && data.decoyAnswers.includes(data.latestGuess);
          const guessStyle = isTrap ? 'color: var(--red); font-size: 1.6rem; font-weight: 900; text-shadow: 0 0 10px rgba(215, 38, 56, 0.8);' : 'color: #fff; font-size: 1.6rem; text-shadow: 0 0 10px rgba(255,255,255,0.2);';

          if (latestG) latestG.innerHTML = `<span style="color: var(--red); font-weight: 900;">${isTrap ? '⚠️ PEGADINHA:' : '🔒 CRAVADO:'}</span> <span style="${guessStyle}">${data.latestGuess}</span>`;
          if (btnCorrect) btnCorrect.disabled = false;
          if (btnWrong) btnWrong.disabled = false;
          if (btnCorrect) btnCorrect.style.opacity = '1';
          if (btnWrong) btnWrong.style.opacity = '1';
          if (guessContainer) {
            guessContainer.style.borderColor = 'var(--red)';
            guessContainer.style.background = 'rgba(215, 38, 56, 0.05)';
          }
        } else {
          if (latestG) latestG.innerHTML = `<span style="color: #8a6d1c; font-weight: bold;">✍️ Digitando:</span> <span style="color: var(--text); font-size: 1.3rem;">${data.latestGuess}</span>`;
          if (btnCorrect) btnCorrect.disabled = true;
          if (btnWrong) btnWrong.disabled = true;
          if (btnCorrect) btnCorrect.style.opacity = '0.4';
          if (btnWrong) btnWrong.style.opacity = '0.4';
          if (guessContainer) {
            guessContainer.style.borderColor = 'var(--gold)';
            guessContainer.style.background = 'rgba(248, 210, 106, 0.02)';
          }
        }

        // --- CONTROLE DO BOTÃO DE LIBERAR MESA ---
        const btnUnlock = document.getElementById('btn-unlock-board');
        if (btnUnlock) {
          const trapsCount = (data.trapIndices || []).length;

          // Exibe o botão apenas se o jogo está rolando e as armadilhas ainda não foram liberadas
          if (!data.trapsReady && data.status === 'playing') {
            btnUnlock.style.display = 'block';

            if (trapsCount < 3) {
              // Bloqueia e avisa quantas faltam
              btnUnlock.disabled = true;
              btnUnlock.style.background = 'var(--border)';
              btnUnlock.style.color = '#666';
              btnUnlock.style.cursor = 'not-allowed';
              btnUnlock.style.boxShadow = 'none';
              btnUnlock.textContent = `🔒 SELECIONE ${3 - trapsCount} ARMADILHAS`;
            } else {
              // Libera o botão com o visual premium dourado original
              btnUnlock.disabled = false;
              btnUnlock.style.background = 'linear-gradient(135deg, var(--gold) 0%, #8a6d1c 100%)';
              btnUnlock.style.color = 'var(--black)';
              btnUnlock.style.cursor = 'pointer';
              btnUnlock.textContent = '🔓 LIBERAR MESA';
            }
          } else {
            btnUnlock.style.display = 'none';
          }
        }

        const mirrorBoard = document.getElementById('admin-mirror-board');
        const revealedIndexes = data.revealedIndexes || [];
        const revealedIds = revealedIndexes.map((x) => (typeof x === 'object' ? x.index : x));

        if (mirrorBoard) {
          mirrorBoard.innerHTML = '';
          // Restaura o grid original de 5 colunas idêntico ao do jogador
          mirrorBoard.style.display = 'grid';
          mirrorBoard.style.gridTemplateColumns = 'repeat(5, 1fr)';
          mirrorBoard.style.gap = '6px';
          mirrorBoard.style.maxHeight = 'none';
          mirrorBoard.style.overflowY = 'visible';

          const traps = data.trapIndices || [];

          for (let i = 1; i <= 20; i++) {
            const block = document.createElement('div');
            const isTrap = traps.includes(i - 1);
            const isRevealed = revealedIds.includes(i - 1);

            block.style.padding = '8px 0';
            block.style.textAlign = 'center';
            block.style.borderRadius = '4px';
            block.style.fontSize = '0.8rem';
            block.style.fontWeight = 'bold';
            block.style.transition = 'all 0.2s';

            // Se já bateu as 3 traps OU a mesa já foi liberada, tranca a edição bloqueando o ponteiro
            const isLocked = traps.length >= 3 || data.trapsReady;
            block.style.cursor = isRevealed || (isLocked && !isTrap) ? 'not-allowed' : 'pointer';

            block.style.background = isRevealed ? 'var(--gold-dark)' : isTrap ? 'var(--red)' : 'var(--border)';
            block.style.color = isRevealed ? 'var(--black)' : '#fff';
            block.style.border = isTrap ? '2px solid white' : '1px solid transparent';
            block.textContent = isRevealed ? `💎 ${String(i).padStart(2, '0')}` : String(i).padStart(2, '0');

            block.addEventListener('click', async () => {
              if (isRevealed) return;
              if (data.trapsReady) {
                showToast('A mesa já foi liberada! Não pode alterar as armadilhas.', 'danger');
                return;
              }

              let newTraps = [...traps];
              if (isTrap) {
                newTraps = newTraps.filter((t) => t !== i - 1);
              } else {
                if (newTraps.length >= 3) {
                  showToast('Limite máximo de 3 armadilhas atingido! Libere a mesa ou desmarque uma.', 'gold');
                  return;
                }
                newTraps.push(i - 1);
              }

              block.style.pointerEvents = 'none';
              await gameRef.update({ trapIndices: newTraps });
            });

            mirrorBoard.appendChild(block);
          }
        }

        // --- SISTEMA DE PRÉVIA OCULTA DAS DICAS ACIMA DO HISTÓRICO ---
        const historyBox = document.getElementById('admin-history-box');
        if (historyBox) {
          let previewContainer = document.getElementById('admin-preview-clues-box');

          // Altera a inserção para injetar o bloco ANTES do histórico de danos com as correções de layout
          if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'admin-preview-clues-box';
            previewContainer.style.marginTop = '25px'; // Afasta o título da prévia do botão "Lançar Charada"
            previewContainer.style.marginBottom = '25px'; // Espaço controlado entre a prévia e o histórico
            previewContainer.style.borderBottom = '1px dashed var(--border)'; // Mantém apenas a linha divisória inferior
            previewContainer.style.paddingBottom = '15px';

            // Força o bloco de histórico original a remover a borda superior dele para não duplicar as linhas
            historyBox.style.borderTop = 'none';
            historyBox.style.paddingTop = '0';

            historyBox.parentNode.insertBefore(previewContainer, historyBox);
          }

          // CORREÇÃO: Quando a rodada reseta ou termina, limpamos APENAS a prévia das dicas textuais,
          // protegendo a estrutura do histórico e mantendo a Dívida Acumulada intacta na tela.
          if (data.trapsReady || data.status !== 'playing' || !data.clues || data.clues.length === 0) {
            // Limpa apenas o HTML interno gerado pelas dicas da rodada anterior
            previewContainer.innerHTML = '';
          } else {
            const traps = data.trapIndices || [];
            const cluesList = data.clues || [];

            const trapsCount = (data.trapIndices || []).length;
            const instrucaoStyle = trapsCount < 3 ? 'color: var(--gold); font-weight: bold;' : 'color: var(--green);';
            const instrucaoTexto = trapsCount < 3 ? `⚠️ CLIQUE EM 3 DICAS NA GRADE DA DIREITA PARA TRANSFORMAR EM ARMADILHA (${trapsCount}/3)` : '✅ 3 ARMADILHAS CONFIGURADAS! LIBERE A MESA NO BOTÃO ACIMA.';

            let previewHTML = `
              <h4 style="margin: 0 0 5px 0; color: var(--gold); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">
                🕵️ Prévias das Dicas (Fase de Preparação)
              </h4>
              <p style="margin: 0 0 15px 0; font-size: 0.75rem; text-transform: uppercase; ${instrucaoStyle}">
                ${instrucaoTexto}
              </p>
              <div style="max-height: 250px; overflow-y: auto; padding-right: 4px;">
            `;

            cluesList.forEach((clueText, index) => {
              const isTrap = traps.includes(index);
              const borderColor = isTrap ? 'var(--red)' : 'var(--border)';
              const bg = isTrap ? 'rgba(215, 38, 56, 0.05)' : 'var(--black)';
              const badgeBg = isTrap ? 'var(--red)' : '#333';

              previewHTML += `
                <div style="background: ${bg}; border: 1px solid ${borderColor}; padding: 10px; border-radius: 6px; margin-bottom: 6px; font-size: 0.85rem; display: flex; align-items: center;">
                  <span style="background: ${badgeBg}; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 10px;">
                    ${String(index + 1).padStart(2, '0')}
                  </span>
                  <span style="color: #fff; flex: 1;">${clueText}</span>
                  ${isTrap ? '<span style="color: var(--red); font-weight: bold; font-size: 0.7rem; letter-spacing: 0.5px;">ARMADILHA</span>' : ''}
                </div>
              `;
            });

            previewHTML += `</div>`;
            previewContainer.innerHTML = previewHTML;
          }
        }

        const adminTextContainer = document.getElementById('admin-text-clues-container');
        if (adminTextContainer) {
          if (revealedIndexes.length > 0) {
            const emptyMsg = adminTextContainer.querySelector('p');
            if (emptyMsg) emptyMsg.remove();

            const sortedRevealed = [...revealedIndexes].sort((a, b) => b.timestamp - a.timestamp);
            const trapList = data.trapIndices || [];

            // Limpeza se trocar de rodada
            const activeAdminIds = sortedRevealed.map((item) => `admin-clue-box-${item.index}`);
            Array.from(adminTextContainer.children).forEach((child) => {
              if (child.id && !activeAdminIds.includes(child.id)) child.remove();
            });

            sortedRevealed.forEach((item) => {
              const divId = `admin-clue-box-${item.index}`;
              let div = document.getElementById(divId);

              // SÓ CRIA E DEIXA ESCREVER SE AINDA NÃO EXISTIR NO PAINEL
              if (!div) {
                const isTrap = trapList.includes(item.index);
                const clueText = isTrap ? '<span style="color: var(--red); font-weight: bold;">⚠️ PERDEU A VEZ (ARMADILHA)</span>' : data.clues[item.index];

                div = document.createElement('div');
                div.id = divId;
                div.className = 'admin-clue-box';

                div.innerHTML = `
                  <span style="color: var(--gold); font-weight: bold;">DICA #${String(item.index + 1).padStart(2, '0')}:</span> 
                  <span class="admin-typewriter-target" style="color: #a6a6c0;"></span>
                `;
                adminTextContainer.appendChild(div);

                const adminTextTarget = div.querySelector('.admin-typewriter-target');
                typeWriterEffect(adminTextTarget, clueText, 75);
              }
            });
          } else {
            adminTextContainer.innerHTML = '<p style="color: #555; text-align: center; font-size: 0.9rem;">Nenhuma dica comprada ainda.</p>';
          }
        }

        if (guessContainer) {
          if (data.latestGuess && data.guessLocked && data.status === 'playing') {
            guessContainer.classList.add('guess-alert');
          } else {
            guessContainer.classList.remove('guess-alert');
          }
        }
      } else {
        adminDashboardCard.style.display = 'none';
        adminStatusContainer.style.display = 'block';
        const ctrlStatus = document.getElementById('controller-status');
        if (ctrlStatus) {
          if (data.status === 'closed') {
            ctrlStatus.innerHTML = '<span style="color: var(--red);">Sessão Fechada / Dominado Expulso</span>';
          } else {
            // Status é 'waiting' (Mesa criada, aguardando o sub entrar ou iniciar)
            if (data.playerName) {
              ctrlStatus.innerHTML = `<span style="color: var(--green); font-weight: 900; letter-spacing: 1px;">🟢 CONECTADO: ${data.playerName.toUpperCase()} ESTÁ NA SALA!</span>`;
            } else {
              ctrlStatus.innerHTML = '<span style="color: var(--gold);">Mesa VIP Ativa. Aguardando a entrada do sub...</span>';
            }
          }
        }
      }
    }

    // 3. Atualiza Tela do Jogador
    const playerName = data.playerName || 'Jogador';
    const uiPlayerName = document.getElementById('ui-player-name');
    if (uiPlayerName) uiPlayerName.textContent = playerName;

    const pCategory = document.getElementById('player-category');
    if (pCategory) pCategory.textContent = data.category || 'Aguardando...';

    const uiClueCost = document.getElementById('ui-clue-cost');
    if (uiClueCost) uiClueCost.textContent = (data.clueCost || 0).toFixed(2);

    const uiMistakePenalty = document.getElementById('ui-mistake-penalty');
    if (uiMistakePenalty) uiMistakePenalty.textContent = (data.mistakePenalty || 0).toFixed(2);

    // --- TRAVA DE SEGURANÇA DO PALPITE DO JOGADOR (CORRIGIDA) ---
    const pGuessInput = document.getElementById('player-guess-input');
    const pSubmitBtn = document.getElementById('btn-submit-guess');

    if (pGuessInput && pSubmitBtn) {
      if (data.status === 'playing') {
        if (data.guessLocked) {
          // Tranca APENAS se o dominado já clicou em enviar nesta rodada
          pGuessInput.disabled = true;
          pSubmitBtn.disabled = true;
          pGuessInput.style.opacity = '0.5';
          pSubmitBtn.style.opacity = '0.5';
          pSubmitBtn.textContent = '🔒 PALPITE ENVIADO (AGUARDANDO VALIDAÇÃO)';
        } else {
          // Libera para digitação normal e monitoramento ao vivo enquanto joga
          pGuessInput.disabled = false;
          pSubmitBtn.disabled = false;
          pGuessInput.style.opacity = '1';
          pSubmitBtn.style.opacity = '1';
          pSubmitBtn.textContent = '🔒 CRAVAR PALPITE (MULTA SE ERRAR)';
        }
      } else {
        // Se o status for 'finished', 'waiting' ou qualquer outro (fim de rodada),
        // limpa o texto antigo e deixa o campo pronto e liberado para a próxima carta.
        pGuessInput.disabled = false;
        pSubmitBtn.disabled = false;
        pGuessInput.style.opacity = '1';
        pSubmitBtn.style.opacity = '1';
        pSubmitBtn.textContent = '🔒 CRAVAR PALPITE (MULTA SE ERRAR)';

        // Limpa o valor físico do input na tela do jogador para não herdar o lixo do chute anterior
        if (data.status === 'finished' && pGuessInput.value !== '') {
          pGuessInput.value = '';
        }
      }
    }

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
      if (data.revealedIndexes && data.revealedIndexes.length > 0) {
        // Remove a mensagem de "Vazio" se ela ainda estiver lá
        const emptyMsg = cluesContainer.querySelector('p');
        if (emptyMsg) emptyMsg.remove();

        const sortedRevealed = [...data.revealedIndexes].sort((a, b) => b.timestamp - a.timestamp);
        const trapList = data.trapIndices || [];

        // Remove do DOM as dicas que não estão mais nos dados do Firebase (caso mude de rodada)
        const activeIds = sortedRevealed.map((item) => `player-clue-box-${item.index}`);
        Array.from(cluesContainer.children).forEach((child) => {
          if (child.id && !activeIds.includes(child.id)) child.remove();
        });

        sortedRevealed.forEach((item) => {
          const divId = `player-clue-box-${item.index}`;
          let div = document.getElementById(divId);

          // SÓ CRIA E ANIMA SE O QUADRO NÃO EXISTIR NA TELA
          if (!div) {
            const isTrap = trapList.includes(item.index);
            // Mantemos a string com a tag, o novo motor do typewriter cuida do resto
            const clueText = isTrap ? '<span style="color: var(--red); font-weight: bold;">⚠️ PERDEU A VEZ (ARMADILHA)</span>' : data.clues[item.index];
            const borderColor = isTrap ? 'var(--red)' : 'var(--gold-dark)';

            div = document.createElement('div');
            div.id = divId;
            div.style.background = 'var(--black)';
            div.style.border = `1px solid ${borderColor}`;
            div.style.padding = '12px';
            div.style.borderRadius = '6px';
            div.style.marginBottom = '10px';

            div.innerHTML = `
              <div style="color: var(--gold); font-size: 0.8rem; font-weight: bold; margin-bottom: 5px;">DICA #${String(item.index + 1).padStart(2, '0')}</div>
              <div class="typewriter-text" style="color: var(--text); min-height: 20px;"></div>
            `;

            // Adiciona no topo ou na ordem correta
            cluesContainer.appendChild(div);

            const textTarget = div.querySelector('.typewriter-text');
            typeWriterEffect(textTarget, clueText, 75);
          }
        });
      } else {
        cluesContainer.innerHTML = '<p style="color: #555; text-align: center;">Nenhuma dica comprada.</p>';
      }
    }

    // 6. Bloqueador e Botões com Feedback de Acerto/Erro
    const playerBlocker = document.getElementById('player-blocker');
    if (playerBlocker) {
      // Libera a tela APENAS se o jogo está rolando E a Mistress já marcou as traps (trapsReady === true)
      if (data.status === 'playing' && data.trapsReady) {
        playerBlocker.style.display = 'none';
      } else {
        playerBlocker.style.display = 'flex';

        // Customiza o feedback visual baseado na validação do Dominador
        if (data.status === 'playing' && !data.trapsReady) {
          // Injeta a animação de rotação contínua caso ela ainda não exista no head do documento
          if (!document.getElementById('hourglass-animation-style')) {
            const style = document.createElement('style');
            style.id = 'hourglass-animation-style';
            style.innerHTML = `
              @keyframes premiumHourglassSpin {
                0% { transform: rotate(0deg); }
                40% { transform: rotate(0deg); }
                50% { transform: rotate(180deg); }
                90% { transform: rotate(180deg); }
                100% { transform: rotate(360deg); }
              }
              .hourglass-spin-effect {
                display: inline-block;
                animation: premiumHourglassSpin 3s infinite cubic-bezier(0.77, 0, 0.175, 1);
              }
            `;
            document.head.appendChild(style);
          }

          // Fase 1: Jogo iniciou, mas a Mistress está armando as pegadinhas (Com ampulheta animada)
          playerBlocker.innerHTML = `
            <div class="hourglass-spin-effect" style="font-size: 4rem; margin-bottom: 10px;">⏳</div>
            <h2 style="color: var(--gold); margin: 0; text-transform: uppercase; letter-spacing: 2px;">Preparando Mesa</h2>
            <p style="color: #888; margin-top: 8px;">A Mistress está posicionando as armadilhas...</p>
          `;
          playerBlocker.style.background = 'rgba(9, 9, 9, 0.9)';
          playerBlocker.style.borderColor = 'var(--gold-dark)';
        } else if (data.roundResult === 'correct') {
          playerBlocker.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 10px; filter: drop-shadow(0 0 15px var(--green));">👑</div>
            <h2 style="color: var(--green); margin: 0; text-transform: uppercase; font-size: 2rem; letter-spacing: 2px;">Você Acertou!</h2>
            <p style="color: #aaa; margin-top: 10px;">Sua mente serviu bem à Mistress. Aguarde a próxima charada.</p>
          `;
          playerBlocker.style.background = 'rgba(9, 35, 15, 0.95)';
          playerBlocker.style.borderColor = 'var(--green)';
        } else if (data.roundResult === 'wrong') {
          playerBlocker.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 10px; filter: drop-shadow(0 0 15px var(--red));">💸</div>
            <h2 style="color: var(--red); margin: 0; text-transform: uppercase; font-size: 2rem; letter-spacing: 2px;">Palpite Errado!</h2>
            <h3 style="color: var(--gold); margin: 5px 0 0 0;">Multa aplicada com sucesso</h3>
            <p style="color: #aaa; margin-top: 10px;">Aguarde a liberação da próxima humilhação.</p>
          `;
          playerBlocker.style.background = 'rgba(35, 9, 9, 0.95)';
          playerBlocker.style.borderColor = 'var(--red)';
        } else {
          // Fallback padrão (Lobby inicial ou reset de mesa)
          playerBlocker.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 10px;">🔒</div>
            <h2 style="color: var(--gold); margin: 0; text-transform: uppercase;">Mesa Trancada</h2>
            <p style="color: #888;">Aguardando a liberação da Mistress.</p>
          `;
          playerBlocker.style.background = 'rgba(9, 9, 9, 0.9)';
          playerBlocker.style.borderColor = 'var(--gold-dark)';
        }
      }
    }

    const viewPlayer = document.getElementById('view-player');
    if (viewPlayer && viewPlayer.classList.contains('active') && data.status === 'playing') {
      generateClueButtons(data.revealedIndexes || [], data.clueCost || 5.0);
    }

    // --- 7. RENDERIZADOR DO HISTÓRICO DE CHARADAS (PRESSÃO PSICOLÓGICA) ---
    const adminHistList = document.getElementById('admin-history-list');
    const playerHistList = document.getElementById('player-history-list');
    const historyData = data.history || [];

    let historyHTML = '';
    if (historyData.length === 0) {
      historyHTML = '<p style="color: #444; text-align: center; margin: 15px 0; font-size: 0.9rem;">Nenhuma charada disputada nesta sessão.</p>';
    } else {
      // Ordena para exibir as mais recentes no topo da lista
      const sortedHistory = [...historyData].sort((a, b) => b.timestamp - a.timestamp);
      sortedHistory.forEach((item) => {
        const isCorrect = item.result === 'correct';
        const borderColor = isCorrect ? 'rgba(61, 220, 132, 0.25)' : 'rgba(215, 38, 56, 0.25)';
        const badgeColor = isCorrect ? 'var(--green)' : 'var(--red)';
        const badgeText = isCorrect ? '✅ ACERTOU' : '❌ ERROU (TAXADO)';

        historyHTML += `
          <div style="background: var(--black); border: 1px solid ${borderColor}; padding: 12px; border-radius: 6px; margin-bottom: 8px; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="color: var(--gold); font-weight: bold; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">${item.category}</span>
              <span style="color: ${badgeColor}; font-weight: 900; font-size: 0.75rem; letter-spacing: 0.5px;">${badgeText}</span>
            </div>
            <div style="color: #fff; font-weight: bold; font-size: 1rem; margin-bottom: 6px;">${item.answer}</div>
            <div style="display: flex; justify-content: space-between; color: #888; font-size: 0.8rem; border-top: 1px dashed #222; padding-top: 6px;">
              <span>Dicas Compradas: <strong style="color: var(--text);">${item.cluesUsed}</strong></span>
              <span>Dano: <strong style="color: ${isCorrect ? 'var(--text)' : 'var(--red)'};">CAD ${item.cost.toFixed(2)}</strong></span>
            </div>
          </div>
        `;
      });
    }

    // Alimenta o container da tela que estiver ativa no momento
    if (adminHistList && document.getElementById('view-controller').classList.contains('active')) {
      adminHistList.innerHTML = historyHTML;
    }
    if (playerHistList && document.getElementById('view-player').classList.contains('active')) {
      playerHistList.innerHTML = historyHTML;
    }
  }
});
