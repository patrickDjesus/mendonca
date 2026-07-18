/* ============================================================
   VIDEO CONTROLLER - ENEM STUDY
   Video list + embedded player + timestamped notes
   ============================================================ */

const VideoController = (() => {
  let allVideos = [];
  let currentFilter = 'todos';
  let activeVideo = null;
  let videoProgress = {};
  let notes = [];
  let userId = null;

  async function render() {
    const root = document.getElementById('app-root');
    root.innerHTML = '<div class="page-section"><div style="text-align:center;padding:var(--space-8);font-family:var(--font-body)">Carregando videos...</div></div>';

    const session = SessionManager.getSavedSession();
    if (!session?.user) return;
    userId = session.user.id;

    try {
      allVideos = await SupabaseService.getVideos();
      renderList(root);
    } catch (e) {
      console.error('[VideoController]', e);
      root.innerHTML = '<div class="page-section"><div class="empty-state"><div class="empty-state__icon">\u26A0\uFE0F</div><div class="empty-state__text">Erro ao carregar videos. Tente novamente.</div></div></div>';
    }
  }

  function renderList(root) {
    const subjects = [...new Set(allVideos.map(v => v.subject))];

    let html = '<div class="page-section">';
    html += '<div class="section-header"><div><h1 class="page-title">Aulas</h1>';
    html += '<p class="page-subtitle">Assista, anote e domine cada conteudo</p></div></div>';

    html += '<div class="filter-bar">';
    html += '<button class="filter-chip active" data-filter="todos">Todos</button>';
    subjects.forEach(s => {
      html += '<button class="filter-chip" data-filter="' + s + '">' + s + '</button>';
    });
    html += '</div>';

    const filtered = currentFilter === 'todos' ? allVideos : allVideos.filter(v => v.subject === currentFilter);

    if (filtered.length === 0) {
      html += '<div class="empty-state"><div class="empty-state__icon">\u25B6</div>';
      html += '<div class="empty-state__text">Nenhum video disponivel ainda.</div></div>';
    } else {
      html += '<div class="video-list" style="margin-top:var(--space-6)">';
      filtered.forEach(v => {
        const prog = videoProgress[v.id];
        const pct = prog ? Math.min(100, Math.round((prog.current_time_seconds / Math.max(1, v.duration_seconds)) * 100)) : 0;

        html += '<div class="video-card" data-video-id="' + v.id + '">';
        html += '<div class="video-card__thumb">';
        if (v.thumbnail_url) {
          html += '<img class="video-card__thumb-img" src="' + escapeAttr(v.thumbnail_url) + '" alt="' + escapeAttr(v.title) + '">';
        } else {
          html += '\u25B6';
        }
        html += '<span class="video-card__duration">' + formatTime(v.duration_seconds) + '</span>';
        html += '</div>';
        html += '<div class="video-card__progress-bar"><div class="video-card__progress-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="video-card__body">';
        html += '<div class="video-card__subject">' + v.subject + '</div>';
        html += '<div class="video-card__title">' + v.title + '</div>';
        html += '<div class="video-card__desc">' + (v.description || '') + '</div>';
        html += '</div></div>';
      });
      html += '</div>';
    }

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentFilter = chip.dataset.filter;
        renderList(root);
      });
    });

    root.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', () => openPlayer(card.dataset.videoId));
    });
  }

  async function openPlayer(videoId) {
    activeVideo = allVideos.find(v => v.id === videoId);
    if (!activeVideo) return;

    const [progressData, notesData] = await Promise.all([
      SupabaseService.getVideoProgress(userId, videoId),
      SupabaseService.getVideoNotes(userId, videoId)
    ]);

    videoProgress[videoId] = progressData;
    notes = notesData;

    renderPlayer();
  }

  function renderPlayer() {
    const root = document.getElementById('app-root');
    const v = activeVideo;
    if (!v) return;

    let html = '<div class="page-section">';
    html += '<button class="rpg-btn rpg-btn--sm video-back-btn" id="video-back">\u2190 Voltar</button>';

    html += '<div class="video-player-view">';
    html += '<div class="video-main">';
    html += '<div class="video-embed">';
    html += '<iframe src="' + escapeAttr(v.url) + '" allowfullscreen></iframe>';
    html += '</div>';
    html += '<div class="video-info">';
    html += '<div class="video-info__title">' + v.title + '</div>';
    html += '<div class="video-info__meta">';
    html += '<span>' + v.subject + '</span>';
    html += '<span>' + formatTime(v.duration_seconds) + '</span>';
    if (v.description) html += '<span>' + v.description + '</span>';
    html += '</div></div></div>';

    html += '<div class="video-sidebar">';
    html += '<div class="notes-panel">';
    html += '<div class="notes-panel__header">';
    html += '<div class="notes-panel__title">\u270E Anotacoes</div>';
    html += '<div class="streak-indicator" style="font-size:10px">' + notes.length + ' notas</div>';
    html += '</div>';

    html += '<div class="notes-list" id="notes-list">';
    if (notes.length === 0) {
      html += '<div style="text-align:center;padding:var(--space-4);font-family:var(--font-body);color:var(--text-muted);font-size:var(--text-sm)">Nenhuma anotacao ainda.</div>';
    } else {
      notes.forEach(n => {
        html += '<div class="note-item" data-note-id="' + n.id + '">';
        html += '<div class="note-item__time">\u23F1 ' + formatTime(n.timestamp_seconds) + '</div>';
        html += '<div class="note-item__content">' + escapeHtml(n.content) + '</div>';
        html += '<button class="note-item__delete" data-note-id="' + n.id + '">\u2715</button>';
        html += '</div>';
      });
    }
    html += '</div>';

    html += '<div class="note-input">';
    html += '<textarea class="note-input__field" id="note-text" placeholder="Escreva uma anotacao..."></textarea>';
    html += '<button class="rpg-btn rpg-btn--sm" id="note-add">Salvar</button>';
    html += '</div>';
    html += '</div>';

    html += '<div class="rpg-card" style="margin-top:var(--space-3)">';
    html += '<div class="rpg-card__title" style="font-size:var(--text-sm)">Seu Progresso</div>';
    const prog = videoProgress[v.id];
    const pct = prog ? Math.min(100, Math.round((prog.current_time_seconds / Math.max(1, v.duration_seconds)) * 100)) : 0;
    html += '<div class="xp-bar"><div class="xp-bar__fill" style="width:' + pct + '%"></div>';
    html += '<div class="xp-bar__text">' + pct + '%</div></div>';
    html += '</div>';

    html += '</div></div></div>';
    root.innerHTML = html;

    document.getElementById('video-back').addEventListener('click', () => render());

    document.getElementById('note-add').addEventListener('click', async () => {
      const text = document.getElementById('note-text').value.trim();
      if (!text) return;
      await SupabaseService.saveNote(userId, v.id, {
        timestamp: 0,
        content: text,
        html: ''
      });
      document.getElementById('note-text').value = '';
      notes = await SupabaseService.getVideoNotes(userId, v.id);
      renderPlayer();
    });

    root.querySelectorAll('.note-item__delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await SupabaseService.deleteNote(btn.dataset.noteId);
        notes = await SupabaseService.getVideoNotes(userId, v.id);
        renderPlayer();
      });
    });
  }

  function formatTime(s) {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { render };
})();
