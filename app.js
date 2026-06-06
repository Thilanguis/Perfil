// --- FUNÇÃO GLOBAL PARA EFEITO MÁQUINA DE ESCREVER COM VOZ NEURAL DA AZURE ---
window.typewriterDivs = window.typewriterDivs || new Map();

function typeWriterEffect(element, text, speed = 65) {
  if (!element) return;
  if (element.dataset.fullText === text) return;
  element.dataset.fullText = text;

  if (window.typewriterDivs.has(element)) {
    clearInterval(window.typewriterDivs.get(element));
  }

  element.innerHTML = '';

  // Limpa tags HTML para a voz não ler elementos do DOM em voz alta
  let textToAnimate = text.includes('<span') ? new DOMParser().parseFromString(text, 'text/html').body.textContent : text;

  // --- CONFIGURAÇÃO DA MICROSOFT AZURE SPEECH API ---
  const azureApiKey = '9oRvYr2ZRtQzGEJw2PDPkoti17tPtwaelJHaIizK5Z1Jh1mBhIjzJQQJ99CFACYeBjFXJ3w3AAAYACOGz2QH'; // <- Recoloque a sua chave real aqui
  const azureRegion = 'eastus';

  // Puxa a voz escolhida pelo usuário no menu ou usa a Francisca como padrão do sistema
  const voiceName = localStorage.getItem('selectedMistressVoice') || 'pt-BR-FranciscaNeural';

  if (azureApiKey && azureRegion && azureApiKey !== 'SUA_CHAVE_AQUI') {
    // SSML: Tunado para dar um tom mais frio, pausado e irônico
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-BR'>
                <voice name='${voiceName}'>
                  <prosody rate='0.93' pitch='-2%'>
                    ${textToAnimate}
                  </prosody>
                </voice>
              </speak>`;

    fetch(`https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureApiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'TributeProfileSystem',
      },
      body: ssml,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Azure HTTP Error: ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        // Se já houver um áudio rodando, interrompe imediatamente
        if (window.currentAudio) {
          window.currentAudio.pause();
        }

        window.currentAudio = audio;

        // Monitora o fim do áudio para resetar os botões de preview da tela
        audio.addEventListener('ended', () => {
          document.querySelectorAll('.btn-voice-preview').forEach((b) => (b.innerHTML = '▶️'));
          window.currentAudio = null;
        });

        // Monitora pausas manuais para resetar o ícone visual
        audio.addEventListener('pause', () => {
          document.querySelectorAll('.btn-voice-preview').forEach((b) => (b.innerHTML = '▶️'));
        });

        audio.play().catch((e) => console.log('Bloqueio de autoplay do navegador:', e));
      })
      .catch((error) => {
        console.error('Falha na API da Azure. Rodando apenas escrita visual:', error);
      });
  }

  // --- EFEITO DE MÁQUINA DE ESCREVER (VISUAL) ---
  let i = 0;
  const timer = setInterval(() => {
    if (i < textToAnimate.length) {
      element.textContent += textToAnimate.charAt(i);
      i++;
    } else {
      clearInterval(timer);
      window.typewriterDivs.delete(element);
      if (text.includes('<span')) element.innerHTML = text;
    }
  }, speed);

  window.typewriterDivs.set(element, timer);
}

// --- SISTEMA DE WAKE LOCK (TELA SEMPRE LIGADA) ---
window.screenWakeLock = null;

window.requestScreenWakeLock = async function () {
  if ('wakeLock' in navigator) {
    try {
      window.screenWakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock ativado: A tela não vai esmaecer.');
    } catch (err) {
      console.error(`Erro ao travar tela: ${err.name}, ${err.message}`);
    }
  }
};

window.releaseScreenWakeLock = function () {
  if (window.screenWakeLock !== null) {
    window.screenWakeLock.release().then(() => {
      window.screenWakeLock = null;
    });
  }
};

// Reativa a trava caso o usuário minimize o navegador/mude de aba e volte
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && window.screenWakeLock !== null) {
    const savedRole = sessionStorage.getItem('gameRole');
    if (savedRole === 'player' || savedRole === 'admin') {
      await window.requestScreenWakeLock();
    }
  }
});

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
    const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

    if (isLocalhost) {
      splashScreen.remove();
      return;
    }

    splashVideo.playbackRate = 0.7;
    splashVideo.play().catch((e) => console.log('Autoplay bloqueado:', e));

    splashVideo.addEventListener('timeupdate', () => {
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
      registration.update();

      if (registration.waiting) {
        showUpdateModal(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                showUpdateModal(newWorker);
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

function showUpdateModal(worker) {
  const modal = document.getElementById('update-modal');
  const progressBar = document.getElementById('update-progress-bar');
  const btnApply = document.getElementById('btn-apply-update');
  const statusText = document.getElementById('update-status-text');

  if (!modal || !progressBar || !btnApply) return;

  modal.style.display = 'flex';

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      progressBar.style.width = '100%';
      statusText.textContent = 'Atualização baixada! Clique para reiniciar.';
      statusText.style.color = 'var(--green)';
      btnApply.style.display = 'block';
    } else {
      progressBar.style.width = `${progress}%`;
      statusText.textContent = `Baixando nova versão... ${progress}%`;
    }
  }, 250);

  btnApply.addEventListener('click', () => {
    btnApply.textContent = 'Reiniciando...';
    btnApply.disabled = true;
    btnApply.style.opacity = '0.5';

    worker.postMessage('skipWaiting');

    setTimeout(() => {
      window.location.reload();
    }, 800);
  });
}

// --- NAVEGAÇÃO BÁSICA ---
document.getElementById('btn-enter-player').addEventListener('click', async () => {
  const pName = document.getElementById('setup-player-name').value.trim() || 'Jogador';

  await gameRef.update({
    playerName: pName,
    playerJoinedAt: Date.now(),
  });

  sessionStorage.setItem('gameRole', 'player');
  document.getElementById('view-selection').classList.remove('active');
  document.getElementById('view-player').classList.add('active');
  generateClueButtons([], 5.0);

  await window.requestScreenWakeLock();
});

document.querySelectorAll('.btn-back').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const savedRole = sessionStorage.getItem('gameRole');
    if (savedRole === 'player') {
      try {
        await gameRef.update({
          playerName: '',
          playerJoinedAt: 0,
        });
      } catch (error) {
        console.error('Erro ao registrar saída do jogador:', error);
      }
    }
    sessionStorage.removeItem('gameRole');
    window.releaseScreenWakeLock();
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
let autoRouted = false;
let isFirstLoad = true;
let localPlayerJoinedAt = 0;

gameRef.onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    const currentDebt = data.debt || 0;

    if (!autoRouted && data.status && data.status !== 'closed') {
      const savedRole = sessionStorage.getItem('gameRole');
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

    if (data.playerJoinedAt && data.playerJoinedAt > localPlayerJoinedAt) {
      const savedRole = sessionStorage.getItem('gameRole');
      if (!isFirstLoad && savedRole === 'admin') {
        showToast(`O dominado ${data.playerName || 'Jogador'} acaba de entrou na mesa!`, 'gold');
      }
      localPlayerJoinedAt = data.playerJoinedAt;
    } else if (!data.playerJoinedAt) {
      localPlayerJoinedAt = 0;
    }

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
        const pDebt = document.getElementById('player-debt');
        const aDebt = document.getElementById('admin-current-debt');
        if (pDebt) pDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
        if (aDebt) aDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
      }

      try {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    } else {
      const pDebt = document.getElementById('player-debt');
      const aDebt = document.getElementById('admin-current-debt');
      if (pDebt) pDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
      if (aDebt) aDebt.textContent = `CAD ${currentDebt.toFixed(2)}`;
    }

    localPlayerDebt = currentDebt;
    isFirstLoad = false;

    const viewPlayerEl = document.getElementById('view-player');
    if (data.status === 'closed' || !data.status) {
      sessionStorage.removeItem('gameRole');
      autoRouted = false;
      if (viewPlayerEl && viewPlayerEl.classList.contains('active')) {
        viewPlayerEl.classList.remove('active');
        document.getElementById('view-selection').classList.add('active');
        showToast('Sessão encerrada pela Mistress. Você foi desconectado da mesa.', 'danger');
      }
    }

    const enterPlayerBtn = document.getElementById('btn-enter-player');
    const enterAdminBtn = document.getElementById('btn-enter-controller');
    const globalStatus = document.getElementById('lobby-global-status');

    if (data.status === 'closed' || !data.status) {
      // Configuração quando a mesa está fechada
      if (enterPlayerBtn) {
        enterPlayerBtn.disabled = true;
        enterPlayerBtn.innerHTML = '🔒 MESA FECHADA';
        enterPlayerBtn.style.opacity = '0.5';
        enterPlayerBtn.style.cursor = 'not-allowed';
        enterPlayerBtn.style.background = 'var(--border)';
        enterPlayerBtn.style.color = '#888';
        enterPlayerBtn.style.boxShadow = 'none';
      }

      if (enterAdminBtn) {
        enterAdminBtn.disabled = false;
        enterAdminBtn.innerHTML = '👑 Abrir Mesa';
        enterAdminBtn.style.opacity = '1';
        enterAdminBtn.style.cursor = 'pointer';
        enterAdminBtn.style.background = 'linear-gradient(135deg, var(--red) 0%, #b3101e 50%, #4a0005 100%)';
      }

      if (globalStatus) {
        globalStatus.innerHTML = '● MESA FECHADA';
        globalStatus.style.background = 'rgba(230, 34, 54, 0.05)';
        globalStatus.style.color = 'var(--red)';
        globalStatus.style.borderColor = 'rgba(230, 34, 54, 0.3)';
        globalStatus.style.boxShadow = 'none';
      }
    } else {
      // Configuração quando a mesa já está aberta/ativa
      if (enterPlayerBtn) {
        enterPlayerBtn.disabled = false;
        enterPlayerBtn.innerHTML = '🔓 ENTRAR NA MESA';
        enterPlayerBtn.style.opacity = '1';
        enterPlayerBtn.style.cursor = 'pointer';
        enterPlayerBtn.style.background = 'linear-gradient(135deg, var(--gold) 0%, #8a6d1c 100%)';
        enterPlayerBtn.style.color = 'var(--black)';
        enterPlayerBtn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
      }

      if (enterAdminBtn) {
        enterAdminBtn.disabled = false;
        enterAdminBtn.innerHTML = '👑 Retomar Controle';
        enterAdminBtn.style.opacity = '1';
        enterAdminBtn.style.cursor = 'pointer';
        enterAdminBtn.style.background = 'linear-gradient(135deg, var(--red) 0%, #b3101e 50%, #4a0005 100%)';
        enterAdminBtn.style.color = '#fff';
        enterAdminBtn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
      }

      if (globalStatus) {
        globalStatus.innerHTML = '● MESA LIBERADA';
        globalStatus.style.background = 'rgba(46, 204, 113, 0.05)';
        globalStatus.style.color = 'var(--green)';
        globalStatus.style.borderColor = 'rgba(46, 204, 113, 0.4)';
        globalStatus.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.15)';
      }
    }

    const editClue = document.getElementById('admin-edit-clue');
    const editPenalty = document.getElementById('admin-edit-penalty');
    const cardSelect = document.getElementById('admin-card-select');
    const startRoundBtn = document.getElementById('btn-start-round');

    const isPlaying = data.status === 'playing';

    if (cardSelect) cardSelect.disabled = isPlaying;
    if (startRoundBtn) startRoundBtn.disabled = isPlaying;

    if (editClue) {
      editClue.disabled = false;
      editClue.style.opacity = '1';
    }
    if (editPenalty) {
      editPenalty.disabled = false;
      editPenalty.style.opacity = '1';
    }

    if (startRoundBtn) {
      startRoundBtn.style.opacity = isPlaying ? '0.5' : '1';
    }

    const adminStatusContainer = document.getElementById('controller-status-container');
    const adminFinancesCard = document.getElementById('admin-finances-card');
    const adminDashboardCard = document.getElementById('admin-dashboard-card');

    if (data.status && data.status !== 'closed') {
      if (adminStatusContainer) adminStatusContainer.style.display = 'none';
      if (adminFinancesCard) adminFinancesCard.style.display = 'block';

      if (typeof updateAdminDeckList === 'function') {
        updateAdminDeckList();
      }

      if (data.status === 'playing') {
        if (adminDashboardCard) adminDashboardCard.style.display = 'block';

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

        const btnUnlock = document.getElementById('btn-unlock-board');
        if (btnUnlock) {
          const trapsCount = (data.trapIndices || []).length;
          const hasRoulette = data.rouletteIndex !== undefined && data.rouletteIndex !== -1;

          if (!data.trapsReady && data.status === 'playing') {
            btnUnlock.style.display = 'block';

            if (trapsCount < 3 || !hasRoulette) {
              btnUnlock.disabled = true;
              btnUnlock.style.background = 'var(--border)';
              btnUnlock.style.color = '#666';
              btnUnlock.style.cursor = 'not-allowed';
              btnUnlock.style.boxShadow = 'none';

              if (trapsCount < 3) {
                btnUnlock.textContent = `🔒 SELECIONE ${3 - trapsCount} ARMADILHAS`;
              } else {
                btnUnlock.textContent = `🎰 ADICIONE 1 ROLETA FINDOM`;
              }
            } else {
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

            const isRoulette = data.rouletteIndex === i - 1;
            const maxTrapsReached = traps.length >= 3;
            const rouletteReached = data.rouletteIndex !== -1 && data.rouletteIndex !== undefined;
            const isLocked = data.trapsReady || (maxTrapsReached && rouletteReached && !isTrap && !isRoulette);

            block.style.cursor = isRevealed || isLocked ? 'not-allowed' : 'pointer';

            if (isRevealed) {
              block.style.background = 'var(--gold-dark)';
              block.style.color = 'var(--black)';
              block.style.border = '1px solid transparent';
            } else if (isRoulette) {
              block.style.background = 'rgba(181, 56, 255, 0.2)';
              block.style.color = '#fff';
              block.style.border = '2px solid #b538ff';
            } else if (isTrap) {
              block.style.background = 'var(--red)';
              block.style.color = '#fff';
              block.style.border = '2px solid white';
            } else {
              block.style.background = 'var(--border)';
              block.style.color = '#fff';
              block.style.border = '1px solid transparent';
            }

            block.textContent = isRevealed ? `💎 ${String(i).padStart(2, '0')}` : String(i).padStart(2, '0');

            block.addEventListener('click', async () => {
              if (isRevealed) return;
              if (data.trapsReady) {
                showToast('A mesa já foi liberada! Não pode alterar as armadilhas.', 'danger');
                return;
              }

              let newTraps = [...traps];
              let newRoulette = data.rouletteIndex !== undefined ? data.rouletteIndex : -1;

              if (isTrap) {
                newTraps = newTraps.filter((t) => t !== i - 1);
                if (newRoulette === -1) {
                  newRoulette = i - 1;
                }
              } else if (isRoulette) {
                newRoulette = -1;
              } else {
                if (newTraps.length < 3) {
                  newTraps.push(i - 1);
                } else if (newRoulette === -1) {
                  newRoulette = i - 1;
                } else {
                  showToast('Limites atingidos: 3 armadilhas e 1 roleta.', 'gold');
                  return;
                }
              }

              block.style.pointerEvents = 'none';
              await gameRef.update({ trapIndices: newTraps, rouletteIndex: newRoulette });
            });

            mirrorBoard.appendChild(block);
          }
        }

        const historyBox = document.getElementById('admin-history-box');
        if (historyBox) {
          let previewContainer = document.getElementById('admin-preview-clues-box');

          if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'admin-preview-clues-box';
            previewContainer.style.marginTop = '25px';
            previewContainer.style.marginBottom = '25px';
            previewContainer.style.borderBottom = '1px dashed var(--border)';
            previewContainer.style.paddingBottom = '15px';

            historyBox.style.borderTop = 'none';
            historyBox.style.paddingTop = '0';

            historyBox.parentNode.insertBefore(previewContainer, historyBox);
          }

          if (data.trapsReady || data.status !== 'playing' || !data.clues || data.clues.length === 0) {
            previewContainer.innerHTML = '';
          } else {
            const traps = data.trapIndices || [];
            const hasRoulette = data.rouletteIndex !== undefined && data.rouletteIndex !== -1;
            const cluesList = data.clues || [];

            const trapsCount = traps.length;

            let instrucaoStyle = 'color: var(--gold); font-weight: bold;';
            let instrucaoTexto = '';

            if (trapsCount < 3) {
              instrucaoTexto = `⚠️ CLIQUE NA GRADE PARA CRIAR 3 ARMADILHAS (${trapsCount}/3) E 1 ROLETA`;
            } else if (!hasRoulette) {
              instrucaoTexto = `🎰 FALTA 1 ROLETA! CLIQUE NUMA DICA VAZIA PARA ADICIONAR.`;
              instrucaoStyle = 'color: #b538ff; font-weight: bold; text-shadow: 0 0 5px rgba(181, 56, 255, 0.4);';
            } else {
              instrucaoTexto = '✅ MESA MONTADA! LIBERE O JOGO NO BOTÃO ACIMA.';
              instrucaoStyle = 'color: var(--green);';
            }

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
              const isRouletteClue = data.rouletteIndex === index;

              let borderColor = 'var(--border)';
              let bg = 'var(--black)';
              let badgeBg = '#333';
              let extraTag = '';

              if (isTrap) {
                borderColor = 'var(--red)';
                bg = 'rgba(215, 38, 56, 0.05)';
                badgeBg = 'var(--red)';
                extraTag = '<span style="color: var(--red); font-weight: bold; font-size: 0.7rem; letter-spacing: 0.5px;">ARMADILHA</span>';
              } else if (isRouletteClue) {
                borderColor = '#b538ff';
                bg = 'rgba(181, 56, 255, 0.1)';
                badgeBg = '#b538ff';
                extraTag = '<span style="color: #b538ff; font-weight: bold; font-size: 0.7rem; letter-spacing: 0.5px;">🎰 ROLETA</span>';
              }

              previewHTML += `
                <div style="background: ${bg}; border: 1px solid ${borderColor}; padding: 10px; border-radius: 6px; margin-bottom: 6px; font-size: 0.85rem; display: flex; align-items: center;">
                  <span style="background: ${badgeBg}; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 10px;">
                    ${String(index + 1).padStart(2, '0')}
                  </span>
                  <span style="color: #fff; flex: 1;">${clueText}</span>
                  ${extraTag}
                </div>
              `;
            });

            previewHTML += `</div>`;
            previewContainer.innerHTML = previewHTML;
          }
        }

        const adminTextContainer = document.getElementById('admin-text-clues-container');
        const isActiveAdmin = document.getElementById('view-controller') && document.getElementById('view-controller').classList.contains('active');

        if (adminTextContainer && isActiveAdmin) {
          if (revealedIndexes.length > 0) {
            const emptyMsg = adminTextContainer.querySelector('p');
            if (emptyMsg) emptyMsg.remove();

            const sortedRevealed = [...revealedIndexes].sort((a, b) => b.timestamp - a.timestamp);
            const trapList = data.trapIndices || [];

            const activeAdminIds = sortedRevealed.map((item) => `admin-clue-box-${item.index}`);
            Array.from(adminTextContainer.children).forEach((child) => {
              if (child.id && !activeAdminIds.includes(child.id)) child.remove();
            });

            sortedRevealed.forEach((item) => {
              const divId = `admin-clue-box-${item.index}`;
              let div = document.getElementById(divId);

              if (!div) {
                const isTrap = trapList.includes(item.index);
                const isRoulette = data.rouletteIndex === item.index;

                let clueText = data.clues[item.index];
                if (isTrap) {
                  clueText = '<span style="color: var(--red); font-weight: bold;">ARMADILHA! Seu verme... . Acaba de perder dinheiro à toa! Pague caladinho.</span>';
                } else if (isRoulette) {
                  clueText = '<span style="color: #b538ff; font-weight: bold;">ROLETA!, seu lixo! Vamos ver o seu castigo... Gira!</span>';
                }

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
        if (adminDashboardCard) adminDashboardCard.style.display = 'none';
      }
    } else {
      if (adminDashboardCard) adminDashboardCard.style.display = 'none';
      if (adminFinancesCard) adminFinancesCard.style.display = 'none';
      if (adminStatusContainer) adminStatusContainer.style.display = 'block';

      const ctrlStatus = document.getElementById('controller-status');
      if (ctrlStatus) {
        ctrlStatus.innerHTML = '<span style="color: var(--red);">Sessão Fechada / Dominado Expulso</span>';
      }
    }

    const playerName = data.playerName || 'Jogador';
    const uiPlayerName = document.getElementById('ui-player-name');
    if (uiPlayerName) uiPlayerName.textContent = playerName;

    // --- RENDERIZAÇÃO DOS BADGES (INFLAÇÃO / SILÊNCIO) NAS DUAS TELAS ---
    const currentRevealed = data.revealedIndexes ? data.revealedIndexes.length : 0;
    const silenceTarget = data.silenceTarget || 0;
    const faltam = silenceTarget - currentRevealed;
    const isSilence = faltam > 0;
    const inflationMult = data.inflationMultiplier || 1;
    const isInflation = inflationMult > 1;

    let badgesHTML = '';
    if (isInflation)
      badgesHTML += `<span style="background: var(--red); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; margin-left: 15px; vertical-align: middle; box-shadow: 0 0 10px rgba(230,34,54,0.4); text-shadow: none; font-weight: 900;">🔥 INFLAÇÃO ${inflationMult}X</span>`;
    if (isSilence)
      badgesHTML += `<span style="background: #2ecc71; color: #111; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; margin-left: 10px; vertical-align: middle; box-shadow: 0 0 10px rgba(46,204,113,0.4); text-shadow: none; font-weight: 900;">🤫 SILÊNCIO (${faltam})</span>`;

    const pCategory = document.getElementById('player-category');
    if (pCategory) pCategory.innerHTML = (data.category || 'Aguardando...') + badgesHTML;

    const aSecretAns = document.getElementById('admin-secret-answer');
    if (aSecretAns) aSecretAns.innerHTML = (data.answer || '...') + badgesHTML;

    const uiClueCost = document.getElementById('ui-clue-cost');
    if (uiClueCost) {
      const baseCost = data.clueCost || 0;
      const actualCost = baseCost * inflationMult;
      uiClueCost.textContent = actualCost.toFixed(2);
    }

    const uiMistakePenalty = document.getElementById('ui-mistake-penalty');
    if (uiMistakePenalty) uiMistakePenalty.textContent = (data.mistakePenalty || 0).toFixed(2);

    const pGuessInput = document.getElementById('player-guess-input');
    const pSubmitBtn = document.getElementById('btn-submit-guess');

    if (pGuessInput && pSubmitBtn) {
      if (data.status === 'playing') {
        if (data.guessLocked) {
          pGuessInput.disabled = true;
          pSubmitBtn.disabled = true;
          pGuessInput.style.opacity = '0.5';
          pSubmitBtn.style.opacity = '0.5';
          pSubmitBtn.textContent = '🔒 PALPITE ENVIADO (AGUARDANDO VALIDAÇÃO)';
        } else {
          const currentRevealed = data.revealedIndexes ? data.revealedIndexes.length : 0;
          const target = data.silenceTarget || 0;

          if (target > currentRevealed) {
            const faltam = target - currentRevealed;
            pGuessInput.disabled = true;
            pSubmitBtn.disabled = true;
            pGuessInput.style.opacity = '0.5';
            pSubmitBtn.style.opacity = '0.5';
            pSubmitBtn.textContent = `🤫 SILÊNCIO: COMPRE +${faltam} DICA(S)`;
          } else {
            pGuessInput.disabled = false;
            pSubmitBtn.disabled = false;
            pGuessInput.style.opacity = '1';
            pSubmitBtn.style.opacity = '1';
            pSubmitBtn.textContent = '🔒 CRAVAR PALPITE (MULTA SE ERRAR)';
          }
        }
      } else {
        pGuessInput.disabled = false;
        pSubmitBtn.disabled = false;
        pGuessInput.style.opacity = '1';
        pSubmitBtn.style.opacity = '1';
        pSubmitBtn.textContent = '🔒 CRAVAR PALPITE';

        if (data.status === 'finished' && pGuessInput.value !== '') {
          pGuessInput.value = '';
        }
      }
    }

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

    const cluesContainer = document.getElementById('revealed-clues');
    const isActivePlayer = document.getElementById('view-player') && document.getElementById('view-player').classList.contains('active');

    if (cluesContainer && isActivePlayer) {
      if (data.revealedIndexes && data.revealedIndexes.length > 0) {
        const emptyMsg = cluesContainer.querySelector('p');
        if (emptyMsg) emptyMsg.remove();

        const sortedRevealed = [...data.revealedIndexes].sort((a, b) => b.timestamp - a.timestamp);
        const trapList = data.trapIndices || [];

        const activeIds = sortedRevealed.map((item) => `player-clue-box-${item.index}`);
        Array.from(cluesContainer.children).forEach((child) => {
          if (child.id && !activeIds.includes(child.id)) child.remove();
        });

        sortedRevealed.forEach((item) => {
          const divId = `player-clue-box-${item.index}`;
          let div = document.getElementById(divId);

          if (!div) {
            const isTrap = trapList.includes(item.index);
            const isRoulette = data.rouletteIndex === item.index;

            let clueText = data.clues[item.index];
            let borderColor = 'var(--gold-dark)';

            if (isTrap) {
              clueText = '<span style="color: var(--red); font-weight: bold;">ARMADILHA! Seu verme... . Acaba de perder dinheiro à toa! Pague caladinho.</span>';
              borderColor = 'var(--red)';
            } else if (isRoulette) {
              clueText = '<span style="color: #b538ff; font-weight: bold;">ROLETA!, seu lixo! Vamos ver o seu castigo... Gira!</span>';
              borderColor = '#b538ff';
            }

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

            cluesContainer.appendChild(div);

            const textTarget = div.querySelector('.typewriter-text');
            typeWriterEffect(textTarget, clueText, 75);
          }
        });
      } else {
        cluesContainer.innerHTML = '<p style="color: #555; text-align: center;">Nenhuma dica comprada.</p>';
      }
    }

    const playerBlocker = document.getElementById('player-blocker');
    if (playerBlocker) {
      if (data.status === 'playing' && data.trapsReady) {
        playerBlocker.style.display = 'none';
      } else {
        playerBlocker.style.display = 'flex';

        if (data.status === 'playing' && !data.trapsReady) {
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

          playerBlocker.innerHTML = `
            <div class="hourglass-spin-effect" style="font-size: 4rem; margin-bottom: 10px;">⏳</div>
            <h2 style="color: var(--gold); margin: 0; text-transform: uppercase; letter-spacing: 2px;">Preparando Mesa</h2>
            <p style="color: #888; margin-top: 8px;">A Mistress está posicionando as armadilhas...</p>
          `;
          playerBlocker.style.background = 'rgba(9, 9, 9, 0.9)';
          playerBlocker.style.borderColor = 'var(--gold-dark)';
          // CORREÇÃO AQUI: Só mostra acerto ou erro se o status do banco for 'finished'
        } else if (data.status === 'finished' && data.roundResult === 'correct') {
          playerBlocker.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 10px; filter: drop-shadow(0 0 15px var(--green));">👑</div>
            <h2 style="color: var(--green); margin: 0; text-transform: uppercase; font-size: 2rem; letter-spacing: 2px;">Você Acertou!</h2>
            <p style="color: #aaa; margin-top: 10px;">Sua mente serviu bem à Mistress. Aguarde a próxima charada.</p>
          `;
          playerBlocker.style.background = 'rgba(9, 35, 15, 0.95)';
          playerBlocker.style.borderColor = 'var(--green)';
        } else if (data.status === 'finished' && data.roundResult === 'wrong') {
          playerBlocker.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 10px; filter: drop-shadow(0 0 15px var(--red));">💸</div>
            <h2 style="color: var(--red); margin: 0; text-transform: uppercase; font-size: 2rem; letter-spacing: 2px;">Palpite Errado!</h2>
            <h3 style="color: var(--gold); margin: 5px 0 0 0;">Multa aplicada com sucesso</h3>
            <p style="color: #aaa; margin-top: 10px;">Aguarde a liberação da próxima humilhação.</p>
          `;
          playerBlocker.style.background = 'rgba(35, 9, 9, 0.95)';
          playerBlocker.style.borderColor = 'var(--red)';
        } else {
          // Se for "waiting" ou recém-criada, cai aqui e exibe Mesa Trancada
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

    const adminHistList = document.getElementById('admin-history-list');
    const playerHistList = document.getElementById('player-history-list');
    const historyData = data.history || [];

    let historyHTML = '';
    if (historyData.length === 0) {
      historyHTML = '<p style="color: #444; text-align: center; margin: 15px 0; font-size: 0.9rem;">Nenhuma charada disputada nesta sessão.</p>';
    } else {
      const sortedHistory = [...historyData].sort((a, b) => b.timestamp - a.timestamp);
      sortedHistory.forEach((item) => {
        const isCorrect = item.result === 'correct';
        const borderColor = isCorrect ? 'rgba(61, 220, 132, 0.25)' : 'rgba(215, 38, 56, 0.25)';
        const badgeColor = isCorrect ? 'var(--green)' : 'var(--red)';
        const badgeText = isCorrect ? '✅ ACERTOU' : '❌ ERROU (TAXADO)';

        // Renderiza sub-lista de punições se houver registros no log do item
        let subPenaltiesHTML = '';
        if (item.penalties && item.penalties.length > 0) {
          subPenaltiesHTML = `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px dotted #222; display: flex; flex-direction: column; gap: 3px;">`;
          item.penalties.forEach((penalty) => {
            subPenaltiesHTML += `<span style="font-size: 0.78rem; color: #8a8a9e; display: block; padding-left: 2px;">• ${penalty}</span>`;
          });
          subPenaltiesHTML += `</div>`;
        }

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
            ${subPenaltiesHTML}
          </div>
        `;
      });
    }

    if (adminHistList && document.getElementById('view-controller').classList.contains('active')) {
      adminHistList.innerHTML = historyHTML;
    }
    if (playerHistList && document.getElementById('view-player').classList.contains('active')) {
      playerHistList.innerHTML = historyHTML;
    }

    // --- GATILHO DA VOZ DE JULGAMENTO (ACERTO / ERRO) ---
    if (data.status === 'finished' && data.roundResult && !isFirstLoad) {
      const currentHistoryLen = historyData.length;
      // Garante que a voz só toque uma vez por rodada finalizada
      if (window.lastVoicedRound !== currentHistoryLen) {
        window.lastVoicedRound = currentHistoryLen;

        let fraseJulgamento = '';
        if (data.roundResult === 'correct') {
          const frasesAcerto = [
            'Até que enfim usou esse cérebro minúsculo para alguma coisa! Acertou... mas não fez mais do que a sua obrigação, seu lixo.',
            'Acertou! Parabéns por fazer o mínimo, seu verme. Mas não ache que isso te salva da próxima humilhação.',
            'Olha só... o capacho sabe pensar! Acertou. Agora cala a boca e aguarde a próxima rodada.',
          ];
          fraseJulgamento = frasesAcerto[Math.floor(Math.random() * frasesAcerto.length)];
        } else if (data.roundResult === 'wrong') {
          const frasesErro = [
            'Palpite errado! Como você é burro! Sinta o peso dessa multa afundando a sua conta... seu verme patético.',
            'Errou! Que mente fraca e inútil... Vai pagar muito caro por essa burrice, seu lixo.',
            'Errou miseravelmente! É maravilhoso ver você perdendo dinheiro... pela sua própria incompetência.',
          ];
          fraseJulgamento = frasesErro[Math.floor(Math.random() * frasesErro.length)];
        }

        const dummyVoice = document.createElement('div');
        typeWriterEffect(dummyVoice, fraseJulgamento, 0);
      }
    } else if (data.status === 'playing') {
      // Prepara o sistema para o próximo gatilho
      window.lastVoicedRound = historyData.length;
    }

    // --- SINCRONIZAÇÃO DA ROLETA ENTRE ADMIN E PLAYER ---
    const modal = document.getElementById('roulette-modal');
    const canvas = document.getElementById('roulette-wheel');
    const resultTitle = document.getElementById('roulette-result-title');
    const resultDesc = document.getElementById('roulette-result-desc');
    const btnClose = document.getElementById('btn-close-roulette');
    const isPlayerView = document.getElementById('view-player') && document.getElementById('view-player').classList.contains('active');

    if (data.rouletteData && data.rouletteData.active) {
      if (modal) modal.style.display = 'flex';

      const options = [
        { id: 'spin_2', label: '2.00 + SPIN', desc: '+ CAD 2.00 e gira de novo!', color: '#e62236' },
        { id: 'silencio_3', label: 'SILÊNCIO +3', desc: 'Compre +3 dicas antes de chutar.', color: '#2ecc71' },
        { id: 'inflacao', label: 'INFLAÇÃO + SPIN', desc: 'A inflação dobra e a roleta gira de novo!', color: '#ff8c00' },
        { id: 'spin_3', label: '3.00 + SPIN', desc: '+ CAD 3.00 e gira de novo!', color: '#8a6d1c' },
        { id: 'multa_5', label: '5.00', desc: '+ CAD 5.00 na dívida.', color: '#8a6d1c' },
        { id: 'spin_4', label: '4.00 + SPIN', desc: '+ CAD 4.00 e gira de novo!', color: '#e62236' },
        { id: 'inflacao', label: 'INFLAÇÃO + SPIN', desc: 'A inflação dobra e a roleta gira de novo!', color: '#ff8c00' },
        { id: 'silencio_2', label: 'SILÊNCIO +2', desc: 'Compre +2 dicas antes de chutar.', color: '#2ecc71' },
        { id: 'spin_5', label: '5.00 + SPIN', desc: '+ CAD 5.00 e gira de novo!', color: '#b538ff' },
        { id: 'silencio_4', label: 'SILÊNCIO +4', desc: 'Compre +4 dicas antes de chutar.', color: '#2ecc71' },
        { id: 'multa_10', label: '10.00', desc: '+ CAD 10.00 na dívida.', color: '#1a1a22' },
        { id: 'inflacao', label: 'INFLAÇÃO + SPIN', desc: 'A inflação dobra e a roleta gira de novo!', color: '#ff8c00' },
      ];

      if (data.rouletteData.step === 'waiting_click') {
        if (resultTitle) {
          resultTitle.textContent = isPlayerView ? 'CLIQUE NA RODA PARA GIRAR' : 'AGUARDANDO O VERME GIRAR...';
          resultTitle.style.color = '#fff';
        }
        if (resultDesc) resultDesc.textContent = isPlayerView ? 'A Mistress está observando sua hesitação...' : 'A tensão está no ar...';
        if (btnClose) btnClose.style.display = 'none';

        if (canvas) {
          canvas.style.transition = 'none';
          canvas.style.transform = 'rotate(0deg)';

          if (isPlayerView) {
            canvas.style.cursor = 'pointer';
            canvas.onclick = function () {
              canvas.onclick = null;
              canvas.style.cursor = 'default';

              // 1. Escolhe exatamente quem ganhou primeiro
              const winningIndex = Math.floor(Math.random() * options.length);

              // 2. Calcula o centro exato da fatia na matemática do canvas
              const sliceCenter = winningIndex * 30 + 15;

              // 3. Descobre quantos graus girar para bater exatamente em 270 (Topo)
              let targetRotation = 270 - sliceCenter;
              if (targetRotation < 0) targetRotation += 360;

              // 4. Adiciona o suspense das 6 voltas completas
              const totalDegrees = 360 * 6 + targetRotation;

              gameRef.update({
                'rouletteData.step': 'spinning',
                'rouletteData.degrees': totalDegrees,
                'rouletteData.selectedOption': options[winningIndex],
                latestGuess: '🎰 Girando a Roleta...',
              });
            };
          } else {
            canvas.style.cursor = 'default';
            canvas.onclick = null;
          }
        }
      } else if (data.rouletteData.step === 'spinning') {
        if (resultTitle) {
          resultTitle.textContent = 'GIRANDO...';
          resultTitle.style.color = '#fff';
        }
        if (resultDesc) resultDesc.textContent = '';
        if (btnClose) btnClose.style.display = 'none';

        if (canvas && !window.isSpinningAnimActive) {
          window.isSpinningAnimActive = true;
          canvas.style.transition = 'none';
          canvas.style.transform = 'rotate(0deg)';
          void canvas.offsetWidth;
          canvas.style.transition = 'transform 4.5s cubic-bezier(0.25, 1, 0.25, 1)';
          canvas.style.transform = `rotate(${data.rouletteData.degrees}deg)`;

          if (isPlayerView) {
            setTimeout(() => {
              window.isSpinningAnimActive = false;
              gameRef.update({
                'rouletteData.step': 'finished',
                latestGuess: `🎰 Caiu em: ${data.rouletteData.selectedOption.label} (Aguardando aceite)`,
              });
            }, 4600);
          } else {
            setTimeout(() => {
              window.isSpinningAnimActive = false;
            }, 4600);
          }
        }
      } else if (data.rouletteData.step === 'finished') {
        const opt = data.rouletteData.selectedOption;
        if (canvas) {
          canvas.style.transition = 'none';
          canvas.style.transform = `rotate(${data.rouletteData.degrees}deg)`;
        }
        if (resultTitle) {
          resultTitle.textContent = opt.label;
          resultTitle.style.color = opt.id === 'multa_10' ? '#f8d26a' : opt.color;
        }
        if (resultDesc) resultDesc.textContent = opt.desc;

        if (btnClose) {
          btnClose.style.display = 'block';
          if (isPlayerView) {
            btnClose.textContent = 'ACEITAR PUNIÇÃO';
            btnClose.disabled = false;
            btnClose.style.opacity = '1';
            btnClose.onclick = async () => {
              btnClose.textContent = 'PROCESSANDO...';
              btnClose.disabled = true;

              const currentPending = data.rouletteData.pendingPenalties || [];
              currentPending.push(opt.id);

              if (opt.id.startsWith('spin_') || opt.id === 'inflacao') {
                await gameRef.update({
                  'rouletteData.step': 'waiting_click',
                  'rouletteData.pendingPenalties': currentPending,
                  latestGuess: '🎰 Dominado na Roleta (Aguardando giro...)',
                });
              } else {
                // É O GIRO FINAL: Fecha o modal e começa o "Efeito Tortura"
                if (modal) modal.style.display = 'none';

                await gameRef.update({
                  'rouletteData.step': 'applying',
                  'rouletteData.pendingPenalties': currentPending,
                  latestGuess: '🎭 Aplicando os castigos em sequência...',
                });

                // LOOP DRAMÁTICO COM NARRAÇÃO DA MISTRESS (2.5 segundos de intervalo por suspense)
                for (const penaltyId of currentPending) {
                  let updates = {};
                  const freshDoc = await gameRef.get();
                  const freshData = freshDoc.data();
                  let fraseCastigo = '';

                  if (penaltyId.startsWith('silencio_')) {
                    const currentRevealed = freshData.revealedIndexes ? freshData.revealedIndexes.length : 0;
                    const currentSilence = freshData.silenceTarget || 0;
                    const base = Math.max(currentRevealed, currentSilence);
                    const qteDicas = parseInt(penaltyId.split('_')[1]);

                    updates.silenceTarget = base + qteDicas;
                    fraseCastigo = `Mais ${qteDicas} dicas de silêncio! Cala a boca e gaste mais otário!`;
                    updates.roundPenalties = firebase.firestore.FieldValue.arrayUnion(`🤫 Punição: Silêncio +${qteDicas}`);
                  } else if (penaltyId === 'inflacao') {
                    const currentMult = freshData.inflationMultiplier || 1;
                    updates.inflationMultiplier = currentMult * 2;
                    fraseCastigo = `A inflação acabou de dobrar! Tudo o que você comprar agora vai custar uma fortuna!`;
                    updates.roundPenalties = firebase.firestore.FieldValue.arrayUnion(`🔥 Punição: Inflação Multiplicada para ${currentMult * 2}X`);
                  } else if (penaltyId === 'multa_5') {
                    updates.debt = firebase.firestore.FieldValue.increment(5);
                    fraseCastigo = 'Mais cinco dólares confiscados da sua carteira! Pague agora!';
                    updates.roundPenalties = firebase.firestore.FieldValue.arrayUnion(`💸 Punição: Taxa de CAD 5.00`);
                  } else if (penaltyId === 'multa_10') {
                    updates.debt = firebase.firestore.FieldValue.increment(10);
                    fraseCastigo = 'Mais dez dólares direto para a minha conta! Que porquinho patético!';
                    updates.roundPenalties = firebase.firestore.FieldValue.arrayUnion(`💸 Punição: Taxa de CAD 10.00`);
                  } else if (penaltyId.startsWith('spin_')) {
                    const valorGiro = parseInt(penaltyId.split('_')[1]);
                    updates.debt = firebase.firestore.FieldValue.increment(valorGiro);
                    fraseCastigo = `Mais ${valorGiro} dólares de prejuízo... e a roleta rodou de novo!`;
                    updates.roundPenalties = firebase.firestore.FieldValue.arrayUnion(`🔄 Punição: Giro Extra + Taxa de CAD ${valorGiro.toFixed(2)}`);
                  }

                  // Atualiza a tela da Mistress para ela ler o espetáculo
                  updates.latestGuess = `🎭 ${fraseCastigo}`;

                  // Dispara a chamada da Azure de forma assíncrona usando o elemento invisível do sistema
                  const dummyVoiceElement = document.createElement('div');
                  typeWriterEffect(dummyVoiceElement, fraseCastigo, 0);

                  // Atualiza o Firestore para rodar o floating money e o ticker na tela
                  await gameRef.update(updates);

                  // Aguarda 2.5 segundos para a frase terminar e criar o clima de desespero
                  await new Promise((resolve) => setTimeout(resolve, 2500));
                }

                await gameRef.update({
                  rouletteData: firebase.firestore.FieldValue.delete(),
                  latestGuess: '',
                });
              }
            };
          } else {
            btnClose.textContent = 'AGUARDANDO O VERME ACEITAR...';
            btnClose.disabled = true;
            btnClose.style.opacity = '0.5';
            btnClose.onclick = null;
          }
        }
      } else if (data.rouletteData.step === 'applying') {
        if (modal) modal.style.display = 'none';
        window.isSpinningAnimActive = false;
      }
    } else {
      if (modal) modal.style.display = 'none';
      window.isSpinningAnimActive = false;
    }
  }
});

// --- LISTENERS PARA OS BOTÕES DE PREVIEW DE VOZ E SELEÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  const previewBtns = document.querySelectorAll('.btn-voice-preview');
  const voiceSelects = document.querySelectorAll('.mistress-voice-select');

  const savedVoice = localStorage.getItem('selectedMistressVoice') || 'pt-BR-FranciscaNeural';

  voiceSelects.forEach((select) => {
    select.value = savedVoice;

    select.addEventListener('change', (e) => {
      const newVoice = e.target.value;
      localStorage.setItem('selectedMistressVoice', newVoice);

      voiceSelects.forEach((s) => (s.value = newVoice));

      showToast('Voz da Mistress alterada com sucesso.', 'success');
    });
  });

  const insultosFindom = [
    'Olha bem para mim, seu verme asqueroso! Você é só um lixo insignificante debaixo do meu salto. Sinta a sola do meu pé... na sua cara. E quando o cheiro dele entrar no seu nariz você sente dar um pio! Vou cuspir na sua cara imunda... Você não passa de um porco escravo feito para pagar os meus luxos e das minhas amigas. Não fala porra nenhuma... e só pague até quando eu decidir! Seu... merda do caralho',
  ];

  previewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (window.currentAudio && !window.currentAudio.paused) {
        window.currentAudio.pause();
        window.currentAudio = null;
        return;
      }

      previewBtns.forEach((b) => (b.innerHTML = '⏹️'));

      const randomInsult = insultosFindom[Math.floor(Math.random() * insultosFindom.length)];
      const dummyElement = document.createElement('div');

      showToast('🔊 Executando humilhação neural...', 'gold');

      typeWriterEffect(dummyElement, randomInsult, 0);
    });
  });
});
