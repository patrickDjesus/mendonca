/* ============================================================
   DUNGEON CONTROLLER - ENEM STUDY
   Masmorra rooms with HP, battles, boss fights
   ============================================================ */

const DungeonController = (() => {
  let dungeons = [];
  let activeDungeon = null;
  let activeSession = null;
  let rooms = [];
  let currentRoomIndex = 0;
  let userId = null;
  let selectedAnswer = null;
  let answered = false;
  let startTime = 0;

  const ENEMIES = [
    '\uD83D\uDC79', '\uD83D\uDC7D', '\uD83E\uDDDF', '\uD83D\uDC32',
    '\uD83D\uDC0D', '\uD83D\uDD25', '\u2620\uFE0F', '\uD83E\uDD85',
    '\uD83D\uDC7E', '\uD83D\uDCA0'
  ];

  const BOSS_ENEMIES = [
    '\uD83D\uDC09', '\uD83C\uDF19', '\u2B50', '\uD83D\uDD31'
  ];

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  async function render() {
    const root = document.getElementById('app-root');
    root.innerHTML = '<div class="page-section"><div style="text-align:center;padding:var(--space-8);font-family:var(--font-body)">Carregando masmorras...</div></div>';

    const session = SessionManager.getSavedSession();
    if (!session?.user) return;
    userId = session.user.id;

    try {
      dungeons = await SupabaseService.getDungeons();
      renderList(root);
    } catch (e) {
      console.error('[DungeonController]', e);
      root.innerHTML = '<div class="page-section"><div class="empty-state"><div class="empty-state__icon">\u26A0\uFE0F</div><div class="empty-state__text">Erro ao carregar masmorras. Tente novamente.</div></div></div>';
    }
  }

  function renderList(root) {
    let html = '<div class="page-section">';
    html += '<div class="section-header"><div><h1 class="page-title">Masmorras</h1>';
    html += '<p class="page-subtitle">Enfrente desafios em salas e derrote o boss final</p></div></div>';

    if (dungeons.length === 0) {
      html += '<div class="empty-state"><div class="empty-state__icon">\uD83C\uDFF0</div>';
      html += '<div class="empty-state__text">Nenhuma masmorra disponivel ainda.</div></div>';
    } else {
      html += '<div class="dungeon-grid">';
      dungeons.forEach(d => {
        const enemy = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
        html += '<div class="dungeon-card" data-dungeon-id="' + d.id + '">';
        html += '<div class="dungeon-card__banner">';
        html += enemy;
        html += '<span class="dungeon-card__rooms">' + d.total_rooms + ' salas</span>';
        html += '</div>';
        html += '<div class="dungeon-card__body">';
        html += '<div class="dungeon-card__subject">' + d.subject + '</div>';
        html += '<div class="dungeon-card__title">' + d.title + '</div>';
        html += '<div class="dungeon-card__desc">' + (d.description || 'Uma masmorra perigosa aguarda...') + '</div>';
        html += '<div class="dungeon-card__meta">';
        html += '<span>x' + d.xp_multiplier + ' XP</span>';
        html += '<span>' + Math.floor(d.time_limit_seconds / 60) + ' min</span>';
        html += '<span>Boss: sala ' + d.boss_room_number + '</span>';
        html += '</div></div></div>';
      });
      html += '</div>';
    }

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('.dungeon-card').forEach(card => {
      card.addEventListener('click', () => enterDungeon(card.dataset.dungeonId));
    });
  }

  async function enterDungeon(dungeonId) {
    activeDungeon = dungeons.find(d => d.id === dungeonId);
    if (!activeDungeon) return;

    const session = await SupabaseService.createDungeonSession(userId, dungeonId);
    if (!session) {
      if (typeof ToastManager !== 'undefined') ToastManager.show('Erro', 'Nao foi possível iniciar a masmorra', 'error');
      return;
    }

    activeSession = session;
    rooms = await SupabaseService.getDungeonRooms(dungeonId);
    currentRoomIndex = 0;

    if (rooms.length === 0) {
      if (typeof ToastManager !== 'undefined') ToastManager.show('Erro', 'Esta masmorra nao tem salas configuradas.', 'error');
      return;
    }

    if (typeof BreakNotifier !== 'undefined') BreakNotifier.start(userId);

    renderDungeonView();
  }

  function renderDungeonView() {
    if (currentRoomIndex >= rooms.length || !activeSession) {
      finishDungeon(true);
      return;
    }

    const root = document.getElementById('app-root');
    const room = rooms[currentRoomIndex];
    const challenge = room.challenges;
    const hp = activeSession.hp || 100;
    const maxHp = activeSession.max_hp || 100;
    const hpPct = Math.max(0, (hp / maxHp) * 100);
    const isBoss = room.is_boss_room;
    const enemy = isBoss ? BOSS_ENEMIES[Math.floor(Math.random() * BOSS_ENEMIES.length)] : ENEMIES[currentRoomIndex % ENEMIES.length];

    selectedAnswer = null;
    answered = false;
    startTime = Date.now();

    let html = '<div class="page-section dungeon-active">';
    html += '<button class="rpg-btn rpg-btn--sm video-back-btn" id="dungeon-flee">\u2190 Fugir</button>';

    html += '<div class="dungeon-hud">';
    html += '<div class="dungeon-hp">';
    html += '<div class="dungeon-hp__label">HP</div>';
    html += '<div class="dungeon-hp__bar">';
    html += '<div class="dungeon-hp__fill" id="dungeon-hp-fill" style="width:' + hpPct + '%"></div>';
    html += '<div class="dungeon-hp__text">' + hp + ' / ' + maxHp + '</div>';
    html += '</div></div>';
    html += '<div class="dungeon-room-indicator">Sala ' + (currentRoomIndex + 1) + ' / ' + rooms.length + '</div>';
    html += '<div class="dungeon-score">Pontos: ' + (activeSession.score || 0) + '</div>';
    html += '</div>';

    html += '<div class="dungeon-room-map">';
    rooms.forEach((r, i) => {
      const cls = 'dungeon-room-dot' +
        (i < currentRoomIndex ? ' dungeon-room-dot--completed' : '') +
        (i === currentRoomIndex ? ' dungeon-room-dot--current' : '') +
        (r.is_boss_room ? ' dungeon-room-dot--boss' : '');
      html += '<div class="' + cls + '">' + (r.is_boss_room ? '\u265A' : (i + 1)) + '</div>';
    });
    html += '</div>';

    html += '<div class="dungeon-battle">';
    html += '<div class="dungeon-battle__enemy">' + enemy + '</div>';
    html += '<div class="dungeon-battle__title">' + (isBoss ? '\u265A BOSS: ' : '') + challenge.title + '</div>';

    html += '<div class="challenge-question" style="margin-top:var(--space-4)">';
    html += '<div class="challenge-question__number">' + challenge.subject + ' \u2022 Dificuldade ' + challenge.difficulty + '</div>';
    html += '<div class="challenge-question__text">' + challenge.question_text + '</div>';
    html += '<div class="challenge-options" id="dungeon-options">';

    if (challenge.challenge_type === 'multipla_escolha' || challenge.challenge_type === 'verdadeiro_falso') {
      const opts = Array.isArray(challenge.options) ? challenge.options : [];
      opts.forEach((opt, i) => {
        const text = typeof opt === 'string' ? opt : (opt.text || opt);
        html += '<button class="challenge-option" data-answer="' + escapeAttr(text) + '">';
        html += '<span class="challenge-option__letter">' + LETTERS[i] + '</span>';
        html += '<span>' + text + '</span>';
        html += '</button>';
      });
    } else {
      html += '<textarea class="note-input__field" id="dungeon-text-answer" placeholder="Sua resposta..." style="width:100%;min-height:80px;border:var(--border-medium);padding:var(--space-3);font-family:var(--font-body)"></textarea>';
    }

    html += '</div></div>';
    html += '<div style="text-align:center;margin-top:var(--space-4)">';
    html += '<button class="rpg-btn rpg-btn--dark" id="dungeon-attack" style="font-size:var(--text-base);padding:var(--space-3) var(--space-8)">Atacar!</button>';
    html += '</div>';
    html += '<div id="dungeon-result-container"></div>';
    html += '</div></div>';

    root.innerHTML = html;

    document.getElementById('dungeon-flee').addEventListener('click', () => {
      if (typeof BreakNotifier !== 'undefined') BreakNotifier.stop();
      finishDungeon(false);
    });

    document.getElementById('dungeon-attack').addEventListener('click', submitDungeonAnswer);

    root.querySelectorAll('.challenge-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (answered) return;
        root.querySelectorAll('.challenge-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedAnswer = opt.dataset.answer;
      });
    });
  }

  async function submitDungeonAnswer() {
    if (answered) return;

    const room = rooms[currentRoomIndex];
    const challenge = room.challenges;
    let answer;

    if (challenge.challenge_type === 'multipla_escolha' || challenge.challenge_type === 'verdadeiro_falso') {
      answer = selectedAnswer;
      if (!answer) {
        if (typeof ToastManager !== 'undefined') ToastManager.show('Atencao', 'Selecione uma resposta!', 'warning');
        return;
      }
    } else {
      const textEl = document.getElementById('dungeon-text-answer');
      answer = textEl ? textEl.value.trim() : '';
      if (!answer) {
        if (typeof ToastManager !== 'undefined') ToastManager.show('Atencao', 'Escreva sua resposta!', 'warning');
        return;
      }
    }

    answered = true;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    const result = await SupabaseService.submitChallengeResult(userId, challenge.id, answer, timeSpent);
    const isCorrect = (result?.[0]?.is_correct) ?? (JSON.stringify(answer) === JSON.stringify(challenge.correct_answer));

    const options = document.querySelectorAll('.challenge-option');
    options.forEach(opt => {
      opt.style.pointerEvents = 'none';
      const correctVal = typeof challenge.correct_answer === 'string' ? challenge.correct_answer : '';
      if (opt.dataset.answer === correctVal) opt.classList.add('correct');
      else if (opt.dataset.answer === answer && !isCorrect) opt.classList.add('incorrect');
    });

    const damage = isCorrect ? 0 : (room.is_boss_room ? 30 : 15);
    const newHp = Math.max(0, (activeSession.hp || 100) - damage);
    const scoreGain = isCorrect ? (room.is_boss_room ? 50 : 20) : 0;
    const newScore = (activeSession.score || 0) + scoreGain;

    activeSession.hp = newHp;
    activeSession.score = newScore;

    await SupabaseService.updateDungeonSession(activeSession.id, {
      hp: newHp,
      score: newScore,
      current_room: currentRoomIndex + 1
    });

    const resultContainer = document.getElementById('dungeon-result-container');
    if (resultContainer) {
      let rHtml = '<div class="challenge-result" style="margin-top:var(--space-4)">';
      rHtml += '<div class="challenge-result__icon" style="font-size:3rem">' + (isCorrect ? '\u2694' : '\uD83D\uDCA5') + '</div>';
      rHtml += '<div class="challenge-result__title">' + (isCorrect ? 'Golpe Certeiro!' : 'Dano Recebido!') + '</div>';
      if (!isCorrect) rHtml += '<div style="font-family:var(--font-body);color:var(--color-gray-500)">-' + damage + ' HP</div>';
      if (scoreGain > 0) rHtml += '<div class="challenge-result__xp">+' + scoreGain + ' pontos</div>';
      rHtml += '<button class="rpg-btn" id="dungeon-next" style="margin-top:var(--space-4)">' +
        (currentRoomIndex < rooms.length - 1 ? 'Proxima Sala \u2192' : 'Ver Resultado') + '</button>';
      rHtml += '</div>';
      resultContainer.innerHTML = rHtml;

      document.getElementById('dungeon-next').addEventListener('click', () => {
        if (newHp <= 0) {
          finishDungeon(false);
          return;
        }
        currentRoomIndex++;
        renderDungeonView();
      });
    }
  }

  async function finishDungeon(completed) {
    if (typeof BreakNotifier !== 'undefined') BreakNotifier.stop();

    const root = document.getElementById('app-root');
    const status = completed ? 'concluida' : 'abandonada';
    const titleEarned = completed ? (activeDungeon.title + ' \u2014 Aventureiro') : null;

    await SupabaseService.updateDungeonSession(activeSession.id, {
      status: status,
      finished_at: new Date().toISOString(),
      title_earned: titleEarned
    });

    let html = '<div class="page-section" style="max-width:500px;margin:var(--space-16) auto;text-align:center">';
    html += '<div class="challenge-result animate-stamp">';
    html += '<div class="challenge-result__icon">' + (completed ? '\uD83C\uDFC6' : '\uD83D\uDCA8') + '</div>';
    html += '<div class="challenge-result__title">' + (completed ? 'Masmorra Conquistada!' : 'Fugiu da Masmorra...') + '</div>';
    html += '<div style="font-family:var(--font-body);color:var(--color-gray-500);margin:var(--space-3) 0">';
    html += 'Pontuacao: ' + (activeSession.score || 0) + ' \u2022 HP Restante: ' + (activeSession.hp || 0) + '</div>';
    if (titleEarned) {
      html += '<div style="font-family:var(--font-display);font-size:var(--text-lg);margin:var(--space-4) 0">Titulo Conquistado: ' + titleEarned + '</div>';
    }
    html += '<div style="display:flex;gap:var(--space-3);justify-content:center;margin-top:var(--space-6)">';
    html += '<button class="rpg-btn" id="dungeon-retry">Tentar Novamente</button>';
    html += '<button class="rpg-btn rpg-btn--dark" id="dungeon-back">Voltar</button>';
    html += '</div></div></div>';

    root.innerHTML = html;
    activeDungeon = null;
    activeSession = null;
    rooms = [];

    document.getElementById('dungeon-retry').addEventListener('click', () => render());
    document.getElementById('dungeon-back').addEventListener('click', () => render());
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { render };
})();
