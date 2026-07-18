/* ============================================================
   JOURNEY CONTROLLER - ENEM STUDY
   Interactive map with node progression
   ============================================================ */

const JourneyController = (() => {
  const SUBJECTS = {
    biologia: { icon: '\uD83E\uDDEC', name: 'Biologia' },
    matematica: { icon: '\uD83D\uDD22', name: 'Matematica' },
    quimica: { icon: '\u2697\uFE0F', name: 'Quimica' },
    linguagens: { icon: '\uD83D\uDCD6', name: 'Linguagens' },
    humanas: { icon: '\uD83C\uDFDB\uFE0F', name: 'Humanas' },
    fisica: { icon: '\u26A1', name: 'Fisica' }
  };

  const MATERIAL_ICONS = {
    video: '\u25B6',
    pdf: '\uD83D\uDCC4',
    desafio: '\u2694',
    simulado: '\uD83C\uDFAF'
  };

  let nodes = [];
  let progress = [];
  let profile = null;

  async function render() {
    const root = document.getElementById('app-root');
    root.innerHTML = '<div class="page-section" id="journey-page"><div style="text-align:center;padding:var(--space-8);font-family:var(--font-body)">Carregando jornada...</div></div>';

    const session = SessionManager.getSavedSession();
    if (!session?.user) return;

    try {
      const [nodesData, progressData, profileData] = await Promise.all([
        SupabaseService.getJourneyNodes(),
        SupabaseService.getUserJourneyProgress(session.user.id),
        SupabaseService.getProfile(session.user.id)
      ]);

      nodes = nodesData;
      progress = progressData;
      profile = profileData;

      renderPage(root);
    } catch (e) {
      console.error('[JourneyController]', e);
      root.innerHTML = '<div class="page-section"><div class="empty-state"><div class="empty-state__icon">\u26A0\uFE0F</div><div class="empty-state__text">Erro ao carregar jornada. Tente novamente.</div></div></div>';
    }
  }

  function renderPage(root) {
    const completedIds = new Set(progress.filter(p => p.completed).map(p => p.node_id));
    const sortedNodes = [...nodes].sort((a, b) => a.node_order - b.node_order);

    let html = '<div class="page-section" id="journey-page">';
    html += '<div class="section-header"><div><h1 class="page-title">Mapa da Jornada</h1>';
    html += '<p class="page-subtitle">Sua trilha de estudo rumo ao ENEM</p></div>';
    html += '<div class="streak-indicator">\u2605 <span id="streak-count">' + (profile?.streak_days || 0) + '</span> dias</div></div>';

    if (sortedNodes.length === 0) {
      html += '<div class="empty-state"><div class="empty-state__icon">\uD83D\uDDFA\uFE0F</div>';
      html += '<div class="empty-state__text">Nenhum ponto encontrado na jornada. Aguarde novos conteudos!</div></div>';
    } else {
      html += '<div class="journey-map"><div class="journey-map__bg"></div>';
      html += '<div class="journey-map__title">\uD83D\uDDFA\uFE0F Sua Trilha</div>';
      html += '<div class="journey-path">';

      sortedNodes.forEach((node, i) => {
        const isCompleted = completedIds.has(node.id);
        const isLocked = !isCompleted && node.required_level > (profile?.level || 1);
        const isCurrent = !isCompleted && !isLocked && (i === 0 || completedIds.has(sortedNodes[i - 1]?.id));

        const subj = SUBJECTS[node.subject] || { icon: '\u2753', name: node.subject };
        const matIcon = MATERIAL_ICONS[node.material_type] || '\u25CF';

        html += '<div class="journey-row">';

        if (i > 0) {
          html += '<div class="journey-connector' + (isCompleted || isCurrent ? ' journey-connector--completed' : '') + '"></div>';
        }

        const nodeClass = 'journey-node' +
          (isCompleted ? ' journey-node--completed' : '') +
          (isLocked ? ' journey-node--locked' : '') +
          (isCurrent ? ' journey-node--current' : '');

        html += '<div class="' + nodeClass + '" data-node-id="' + node.id + '">';
        html += '<div class="journey-node__icon">' + (isLocked ? '\uD83D\uDD12' : matIcon) + '</div>';
        html += '<div class="journey-node__label">' + (node.title.length > 12 ? node.title.substring(0, 12) + '...' : node.title) + '</div>';
        html += '<div class="journey-node__xp">' + node.xp_reward + ' XP</div>';
        html += '</div>';

        html += '<div class="journey-info">';
        html += '<div class="journey-info__title">' + subj.icon + ' ' + node.title + '</div>';
        html += '<div class="journey-info__desc">' + (node.description || 'Complete este desafio para avancar.') + '</div>';
        html += '<div class="journey-info__meta">';
        html += '<span>' + subj.name + '</span>';
        html += '<span>Nivel ' + node.required_level + '</span>';
        html += '<span>' + node.xp_reward + ' XP</span>';
        html += '<span>' + node.material_type + '</span>';
        html += '</div></div>';

        html += '</div>';
      });

      html += '</div></div>';
    }

    html += '</div>';
    root.innerHTML = html;

    root.querySelectorAll('.journey-node:not(.journey-node--locked)').forEach(el => {
      el.addEventListener('click', () => openNodeModal(el.dataset.nodeId));
    });
  }

  function openNodeModal(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const subj = SUBJECTS[node.subject] || { icon: '\u2753', name: node.subject };
    const isCompleted = progress.some(p => p.node_id === nodeId && p.completed);
    const progressData = progress.find(p => p.node_id === nodeId);

    const overlay = document.createElement('div');
    overlay.className = 'node-modal-overlay';

    let html = '<div class="node-modal" style="position:relative">';
    html += '<button class="node-modal__close" id="node-modal-close">\u2715</button>';
    html += '<div class="node-modal__header">';
    html += '<div class="node-modal__title">' + subj.icon + ' ' + node.title + '</div>';
    html += '<div class="node-modal__subject">' + subj.name + ' \u2022 ' + node.material_type + '</div>';
    html += '</div>';
    html += '<div class="node-modal__body">';
    html += '<div class="node-modal__desc">' + (node.description || 'Um novo desafio aguarda por voce.') + '</div>';
    html += '<div class="node-modal__meta">';
    html += '<div class="node-modal__stat"><div class="node-modal__stat-label">Recompensa</div><div class="node-modal__stat-value">' + node.xp_reward + ' XP</div></div>';
    html += '<div class="node-modal__stat"><div class="node-modal__stat-label">Nivel Minimo</div><div class="node-modal__stat-value">' + node.required_level + '</div></div>';
    html += '<div class="node-modal__stat"><div class="node-modal__stat-label">Status</div><div class="node-modal__stat-value">' + (isCompleted ? 'COMPLETO' : 'PENDENTE') + '</div></div>';
    html += '<div class="node-modal__stat"><div class="node-modal__stat-label">Tipo</div><div class="node-modal__stat-value">' + node.material_type.toUpperCase() + '</div></div>';
    html += '</div>';
    html += '<div class="node-modal__actions">';

    if (node.material_type === 'video') {
      html += '<button class="rpg-btn" id="node-action-videos">Assistir Videos</button>';
    } else if (node.material_type === 'desafio') {
      html += '<button class="rpg-btn" id="node-action-challenges">Enfrentar Desafios</button>';
    } else if (node.material_type === 'simulado') {
      html += '<button class="rpg-btn" id="node-action-dungeon">Entrar na Masmorra</button>';
    } else {
      html += '<button class="rpg-btn" id="node-action-materials">Ver Materiais</button>';
    }

    html += '</div></div></div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    overlay.querySelector('#node-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const videoBtn = overlay.querySelector('#node-action-videos');
    if (videoBtn) videoBtn.addEventListener('click', () => { overlay.remove(); Router.navigate('/videos'); });

    const challengeBtn = overlay.querySelector('#node-action-challenges');
    if (challengeBtn) challengeBtn.addEventListener('click', () => { overlay.remove(); Router.navigate('/challenges'); });

    const dungeonBtn = overlay.querySelector('#node-action-dungeon');
    if (dungeonBtn) dungeonBtn.addEventListener('click', () => { overlay.remove(); Router.navigate('/dungeons'); });

    const materialBtn = overlay.querySelector('#node-action-materials');
    if (materialBtn) materialBtn.addEventListener('click', () => { overlay.remove(); Router.navigate('/materials'); });
  }

  return { render };
})();
