/* ============================================================
   STATS CONTROLLER - ENEM STUDY
   Grimorio: stats, streak, accuracy, leaderboard, reviews
   ============================================================ */

const StatsController = (() => {
  let userId = null;
  let profile = null;
  let stats = null;
  let reviews = [];

  const SUBJECTS = [
    { id: 'biologia', name: 'Biologia', icon: '\uD83E\uDDEC' },
    { id: 'matematica', name: 'Matematica', icon: '\uD83D\uDD22' },
    { id: 'quimica', name: 'Quimica', icon: '\u2697\uFE0F' },
    { id: 'linguagens', name: 'Linguagens', icon: '\uD83D\uDCD6' },
    { id: 'humanas', name: 'Humanas', icon: '\uD83C\uDFDB\uFE0F' },
    { id: 'fisica', name: 'Fisica', icon: '\u26A1' }
  ];

  async function render() {
    const root = document.getElementById('app-root');
    root.innerHTML = '<div class="page-section"><div style="text-align:center;padding:var(--space-8);font-family:var(--font-comic)">Carregando grimorio...</div></div>';

    const session = SessionManager.getSavedSession();
    if (!session?.user) return;
    userId = session.user.id;

    try {
      const [profileData, statsData, reviewsData] = await Promise.all([
        SupabaseService.getProfile(userId),
        SupabaseService.getUserStats(userId),
        SupabaseService.getReviewChallenges(userId, 10)
      ]);

      profile = profileData;
      stats = statsData;
      reviews = reviewsData;

      renderPage(root);
    } catch (e) {
      console.error('[StatsController]', e);
      root.innerHTML = '<div class="page-section"><div class="empty-state"><div class="empty-state__icon">\u26A0\uFE0F</div><div class="empty-state__text">Erro ao carregar grimorio. Tente novamente.</div></div></div>';
    }
  }

  function renderPage(root) {
    const totalTime = ((stats?.total_video_time_seconds || 0) +
      (stats?.total_material_time_seconds || 0) +
      (stats?.total_challenge_time_seconds || 0) +
      (stats?.total_dungeon_time_seconds || 0));
    const totalCorrectCount = (stats?.challenges_solved || 0);
    const totalAttempts = totalCorrectCount + (stats?.challenges_failed || 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    let html = '<div class="page-section">';
    html += '<h1 class="page-title">Grimorio</h1>';
    html += '<p class="page-subtitle">Seu livro de registros e progresso</p>';

    html += '<div class="stats-grid">';
    html += statCard('\u2B50', profile?.xp_total || 0, 'XP Total');
    html += statCard('\uD83D\uDCCB', profile?.level || 1, 'Nivel');
    html += statCard('\uD83D\uDD25', profile?.streak_days || 0, 'Dias Seguidos');
    html += statCard('\u23F1', formatTimeHours(totalTime), 'Tempo Total');
    html += statCard('\u2714', totalCorrectCount, 'Acertos');
    html += statCard('\uD83C\uDFAF', accuracy + '%', 'Precisao');
    html += statCard('\uD83C\uDFF0', stats?.dungeons_completed || 0, 'Masmorras');
    html += statCard('\uD83D\uDCDA', stats?.videos_completed || 0, 'Videos Assistidos');
    html += '</div>';

    html += renderStreakCalendar();

    html += '<div class="grimorio-section">';
    html += '<div class="grimorio-section__header">\uD83D\uDCCA Precisao por Materia</div>';
    html += '<div class="grimorio-section__body">';
    html += renderAccuracyBars();
    html += '</div></div>';

    if (reviews.length > 0) {
      html += '<div class="grimorio-section">';
      html += '<div class="grimorio-section__header">\uD83D\uDD04 Revisao Espacada</div>';
      html += '<div class="grimorio-section__body">';
      html += renderReviews();
      html += '</div></div>';
    }

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('.review-item').forEach(item => {
      item.addEventListener('click', () => {
        Router.navigate('/challenges');
      });
    });
  }

  function statCard(icon, value, label) {
    return '<div class="stat-card">' +
      '<div class="stat-card__icon">' + icon + '</div>' +
      '<div class="stat-card__value">' + value + '</div>' +
      '<div class="stat-card__label">' + label + '</div></div>';
  }

  function formatTimeHours(seconds) {
    if (!seconds) return '0h';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h + 'h' + (m > 0 ? m + 'm' : '');
  }

  function renderStreakCalendar() {
    const today = new Date();
    const days = 28;
    let html = '<div class="grimorio-section" style="margin-bottom:var(--space-6)">';
    html += '<div class="grimorio-section__header">\uD83D\uDD25 Ultimos ' + days + ' Dias</div>';
    html += '<div class="grimorio-section__body">';
    html += '<div class="streak-calendar">';

    const streakDays = profile?.streak_days || 0;
    const lastActive = profile?.last_active_date ? new Date(profile.last_active_date) : null;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;
      let isActive = false;

      if (lastActive && streakDays > 0) {
        const activeEnd = new Date(today);
        const activeStart = new Date(today);
        activeStart.setDate(activeStart.getDate() - (streakDays - 1));
        isActive = d >= activeStart && d <= activeEnd;
      }

      let cls = 'streak-day';
      if (isActive) cls += ' streak-day--active';
      if (isToday) cls += ' streak-day--today';

      html += '<div class="' + cls + '" title="' + dateStr + '">' + d.getDate() + '</div>';
    }

    html += '</div></div></div>';
    return html;
  }

  function renderAccuracyBars() {
    const accuracyData = stats?.accuracy_by_subject || {};
    let html = '<div class="accuracy-bar-list">';

    let hasData = false;
    SUBJECTS.forEach(subj => {
      const count = accuracyData[subj.id] || 0;
      if (count > 0) hasData = true;
      const pct = totalCorrect() > 0 ? Math.min(100, Math.round((count / totalCorrect()) * 100)) : 0;

      html += '<div class="accuracy-row">';
      html += '<div class="accuracy-row__label">' + subj.icon + ' ' + subj.name + '</div>';
      html += '<div class="accuracy-row__bar"><div class="accuracy-row__fill" style="width:' + pct + '%"></div></div>';
      html += '<div class="accuracy-row__value">' + count + '</div>';
      html += '</div>';
    });

    if (!hasData) {
      html += '<div style="text-align:center;padding:var(--space-6);font-family:var(--font-comic);color:var(--color-gray-400)">Complete desafios para ver suas estatisticas por materia.</div>';
    }

    html += '</div>';
    return html;
  }

  function totalCorrect() {
    return stats?.challenges_solved || 0;
  }

  function renderReviews() {
    let html = '<div class="review-list">';
    reviews.forEach(r => {
      html += '<div class="review-item" data-challenge-id="' + r.challenge_id + '">';
      html += '<div class="review-item__icon">\uD83D\uDD04</div>';
      html += '<div class="review-item__info">';
      html += '<div class="review-item__title">' + r.challenge_title + '</div>';
      html += '<div class="review-item__meta">Intervalo: ' + r.interval_days + ' dias \u2022 Fator: ' + Number(r.ease_factor).toFixed(1) + '</div>';
      html += '</div>';
      html += '<div class="review-item__badge">Revisar</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  return { render };
})();
