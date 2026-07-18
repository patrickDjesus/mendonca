/* ============================================================
   CHALLENGE CONTROLLER - ENEM STUDY
   Quiz system with multiple types and scoring
   ============================================================ */

const ChallengeController = (() => {
  let allChallenges = [];
  let currentFilter = 'todos';
  let activeChallenge = null;
  let activeIndex = 0;
  let selectedAnswer = null;
  let answered = false;
  let score = 0;
  let startTime = 0;
  let challengeSet = [];
  let userId = null;

  const TYPE_LABELS = {
    multipla_escolha: 'Multipla Escolha',
    resposta_escrita: 'Resposta Escrita',
    verdadeiro_falso: 'Verdadeiro ou Falso',
    preencher_lacuna: 'Preencher Lacuna',
    ordenacao_logica: 'Ordenacao Logica',
    associacao_pares: 'Associacao de Pares'
  };

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  async function render() {
    const root = document.getElementById('app-root');
    root.innerHTML = '<div class="page-section"><div style="text-align:center;padding:var(--space-8);font-family:var(--font-body)">Carregando desafios...</div></div>';

    const session = SessionManager.getSavedSession();
    if (!session?.user) return;
    userId = session.user.id;

    try {
      allChallenges = await SupabaseService.getChallenges();
      renderList(root);
    } catch (e) {
      console.error('[ChallengeController]', e);
      root.innerHTML = '<div class="page-section"><div class="empty-state"><div class="empty-state__icon">\u26A0\uFE0F</div><div class="empty-state__text">Erro ao carregar desafios. Tente novamente.</div></div></div>';
    }
  }

  function renderList(root) {
    const subjects = [...new Set(allChallenges.map(c => c.subject))];

    let html = '<div class="page-section">';
    html += '<div class="section-header"><div><h1 class="page-title">Desafios</h1>';
    html += '<p class="page-subtitle">Teste seus conhecimentos e ganhe XP</p></div></div>';

    html += '<div class="filter-bar">';
    html += '<button class="filter-chip active" data-filter="todos">Todos</button>';
    subjects.forEach(s => {
      html += '<button class="filter-chip" data-filter="' + s + '">' + s + '</button>';
    });
    html += '</div>';

    const filtered = currentFilter === 'todos' ? allChallenges : allChallenges.filter(c => c.subject === currentFilter);

    if (filtered.length === 0) {
      html += '<div class="empty-state"><div class="empty-state__icon">\u2694</div>';
      html += '<div class="empty-state__text">Nenhum desafio disponivel ainda.</div></div>';
    } else {
      html += '<div class="challenge-grid" style="margin-top:var(--space-6)">';
      filtered.forEach(c => {
        html += '<div class="challenge-card" data-challenge-id="' + c.id + '">';
        html += '<div class="challenge-card__difficulty">';
        for (let i = 1; i <= 5; i++) {
          html += '<span class="challenge-card__star' + (i <= c.difficulty ? ' challenge-card__star--filled' : '') + '"></span>';
        }
        html += '</div>';
        html += '<div class="challenge-card__type">' + (TYPE_LABELS[c.challenge_type] || c.challenge_type) + '</div>';
        html += '<div class="challenge-card__title">' + c.title + '</div>';
        html += '<div class="challenge-card__subject">' + c.subject + '</div>';
        html += '<div class="challenge-card__xp">' + c.xp_reward + ' XP</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '<div style="margin-top:var(--space-8);text-align:center">';
    html += '<button class="rpg-btn rpg-btn--dark" id="challenge-start-random" style="font-size:var(--text-base);padding:var(--space-3) var(--space-8)">Sorteio Aleatorio x5</button>';
    html += '</div>';

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentFilter = chip.dataset.filter;
        renderList(root);
      });
    });

    root.querySelectorAll('.challenge-card').forEach(card => {
      card.addEventListener('click', () => startChallengeSet([allChallenges.find(c => c.id === card.dataset.challengeId)].filter(Boolean)));
    });

    document.getElementById('challenge-start-random').addEventListener('click', () => {
      const shuffled = [...allChallenges].sort(() => Math.random() - 0.5);
      startChallengeSet(shuffled.slice(0, Math.min(5, shuffled.length)));
    });
  }

  function startChallengeSet(set) {
    challengeSet = set;
    activeIndex = 0;
    score = 0;
    renderActiveChallenge();
  }

  function renderActiveChallenge() {
    if (activeIndex >= challengeSet.length) {
      renderResults();
      return;
    }

    activeChallenge = challengeSet[activeIndex];
    selectedAnswer = null;
    answered = false;
    startTime = Date.now();

    const root = document.getElementById('app-root');
    const c = activeChallenge;

    let html = '<div class="page-section challenge-active">';
    html += '<button class="rpg-btn rpg-btn--sm video-back-btn" id="challenge-abort">\u2190 Sair</button>';

    html += '<div class="challenge-active__header">';
    html += '<div class="challenge-active__progress">Desafio ' + (activeIndex + 1) + ' / ' + challengeSet.length + '</div>';
    html += '<div class="challenge-active__timer" id="challenge-timer">0:00</div>';
    html += '</div>';

    html += '<div class="challenge-question">';
    html += '<div class="challenge-question__number">' + c.subject + ' \u2022 ' + (TYPE_LABELS[c.challenge_type] || c.challenge_type) + '</div>';
    html += '<div class="challenge-question__text">' + c.question_text + '</div>';
    html += '<div class="challenge-options" id="challenge-options">';

    if (c.challenge_type === 'multipla_escolha' || c.challenge_type === 'verdadeiro_falso') {
      const opts = Array.isArray(c.options) ? c.options : [];
      opts.forEach((opt, i) => {
        html += '<button class="challenge-option" data-answer="' + escapeAttr(typeof opt === 'string' ? opt : opt.text || opt) + '">';
        html += '<span class="challenge-option__letter">' + LETTERS[i] + '</span>';
        html += '<span>' + (typeof opt === 'string' ? opt : opt.text || opt) + '</span>';
        html += '</button>';
      });
    } else {
      html += '<textarea class="note-input__field" id="challenge-text-answer" placeholder="Sua resposta..." style="width:100%;min-height:80px;border:var(--border-medium);padding:var(--space-3);font-family:var(--font-body)"></textarea>';
    }

    html += '</div></div>';

    html += '<div style="text-align:center">';
    html += '<button class="rpg-btn rpg-btn--dark" id="challenge-submit" style="font-size:var(--text-base);padding:var(--space-3) var(--space-8)">Responder</button>';
    html += '</div>';

    html += '<div id="challenge-result-container"></div>';
    html += '</div>';

    root.innerHTML = html;

    document.getElementById('challenge-abort').addEventListener('click', () => {
      const timerEl = document.getElementById('challenge-timer');
      if (timerEl && timerEl._interval) clearInterval(timerEl._interval);
      render();
    });
    document.getElementById('challenge-submit').addEventListener('click', submitAnswer);

    root.querySelectorAll('.challenge-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (answered) return;
        root.querySelectorAll('.challenge-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedAnswer = opt.dataset.answer;
      });
    });

    startTimer();
  }

  function startTimer() {
    const timerEl = document.getElementById('challenge-timer');
    if (!timerEl) return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    };
    update();
    const iv = setInterval(update, 1000);
    timerEl._interval = iv;
  }

  async function submitAnswer() {
    if (answered) return;

    const c = activeChallenge;
    let answer;

    if (c.challenge_type === 'multipla_escolha' || c.challenge_type === 'verdadeiro_falso') {
      answer = selectedAnswer;
      if (!answer) {
        if (typeof ToastManager !== 'undefined') ToastManager.show('Atencao', 'Selecione uma resposta!', 'warning');
        return;
      }
    } else {
      const textEl = document.getElementById('challenge-text-answer');
      answer = textEl ? textEl.value.trim() : '';
      if (!answer) {
        if (typeof ToastManager !== 'undefined') ToastManager.show('Atencao', 'Escreva sua resposta!', 'warning');
        return;
      }
    }

    answered = true;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const timerEl = document.getElementById('challenge-timer');
    if (timerEl && timerEl._interval) clearInterval(timerEl._interval);

    const result = await SupabaseService.submitChallengeResult(userId, c.id, answer, timeSpent);

    const isCorrect = (result?.[0]?.is_correct) ?? (JSON.stringify(answer) === JSON.stringify(c.correct_answer));
    const xpEarned = isCorrect ? c.xp_reward : 0;
    if (isCorrect) score += xpEarned;

    const options = document.querySelectorAll('.challenge-option');
    options.forEach(opt => {
      opt.style.pointerEvents = 'none';
      const correctVal = typeof c.correct_answer === 'string' ? c.correct_answer : (Array.isArray(c.correct_answer) ? c.correct_answer[0] : '');
      if (opt.dataset.answer === correctVal) opt.classList.add('correct');
      else if (opt.dataset.answer === answer && !isCorrect) opt.classList.add('incorrect');
    });

    const resultContainer = document.getElementById('challenge-result-container');
    if (resultContainer) {
      let rHtml = '<div class="challenge-result" style="margin-top:var(--space-6)">';
      rHtml += '<div class="challenge-result__icon">' + (isCorrect ? '\u2714' : '\u2718') + '</div>';
      rHtml += '<div class="challenge-result__title">' + (isCorrect ? 'Acertou!' : 'Errou!') + '</div>';
      rHtml += '<div class="challenge-result__xp">' + (xpEarned > 0 ? '+' + xpEarned + ' XP' : 'Sem XP') + '</div>';
      if (c.explanation) {
        rHtml += '<div class="challenge-result__explanation">';
        rHtml += '<div class="challenge-result__explanation-title">Explicacao</div>';
        rHtml += c.explanation;
        rHtml += '</div>';
      }
      rHtml += '<button class="rpg-btn" id="challenge-next">' + (activeIndex < challengeSet.length - 1 ? 'Proximo \u2192' : 'Ver Resultado') + '</button>';
      rHtml += '</div>';
      resultContainer.innerHTML = rHtml;

      document.getElementById('challenge-next').addEventListener('click', () => {
        activeIndex++;
        renderActiveChallenge();
      });
    }

    if (typeof ToastManager !== 'undefined') {
      ToastManager.show(isCorrect ? 'ACERTOU!' : 'ERROU', isCorrect ? '+' + xpEarned + ' XP' : 'Tente novamente!', isCorrect ? 'success' : 'error');
    }
  }

  function renderResults() {
    const root = document.getElementById('app-root');
    const total = challengeSet.length;
    const maxPossibleXp = challengeSet.reduce((sum, c) => sum + (c.xp_reward || 15), 0);
    const pct = maxPossibleXp > 0 ? Math.round((score / maxPossibleXp) * 100) : 0;

    let html = '<div class="page-section" style="max-width:500px;margin:var(--space-16) auto;text-align:center">';
    html += '<div class="challenge-result animate-stamp">';
    html += '<div class="challenge-result__icon">\uD83C\uDFC6</div>';
    html += '<div class="challenge-result__title">Batalha Concluida!</div>';
    html += '<div class="challenge-result__xp">+ ' + score + ' XP Total</div>';
    html += '<div style="font-family:var(--font-body);margin:var(--space-4) 0;color:var(--color-gray-500)">' + total + ' desafios concluidos</div>';
    html += '<div class="xp-bar" style="margin:var(--space-6) 0"><div class="xp-bar__fill" style="width:' + Math.min(100, pct) + '%"></div>';
    html += '<div class="xp-bar__text">' + Math.min(100, pct) + '%</div></div>';
    html += '<div style="display:flex;gap:var(--space-3);justify-content:center">';
    html += '<button class="rpg-btn" id="results-retry">Jogar Novamente</button>';
    html += '<button class="rpg-btn rpg-btn--dark" id="results-back">Voltar</button>';
    html += '</div></div></div>';

    root.innerHTML = html;

    document.getElementById('results-retry').addEventListener('click', () => render());
    document.getElementById('results-back').addEventListener('click', () => render());
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { render };
})();
