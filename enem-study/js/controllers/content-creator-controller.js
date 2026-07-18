const ContentCreatorController = (function () {
  let journeyNodes = [];

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  function init() {
    bindFAB();
    bindModals();
    bindForms();
    bindChallengeOptions();
    bindEscape();
    fetchNodes();
  }

  function bindFAB() {
    var fab = document.getElementById('forge-fab');
    if (!fab) return;

    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      var menu = document.getElementById('fab-menu');
      if (menu) menu.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
      var menu = document.getElementById('fab-menu');
      if (menu && menu.classList.contains('active')) {
        if (!menu.contains(e.target) && e.target !== fab) {
          menu.classList.remove('active');
        }
      }
    });

    document.querySelectorAll('.fab-menu__option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var type = this.getAttribute('data-forge');
        openModal(type);
        var menu = document.getElementById('fab-menu');
        if (menu) menu.classList.remove('active');
      });
    });
  }

  function bindModals() {
    document.querySelectorAll('.forge-modal__close').forEach(function (btn) {
      btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.forge-cancel').forEach(function (btn) {
      btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.forge-modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeAllModals();
      });
    });
  }

  function openModal(type) {
    var map = { video: 'forge-modal-video', document: 'forge-modal-document', challenge: 'forge-modal-challenge' };
    var modal = document.getElementById(map[type]);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    var formMap = { video: 'form-video', document: 'form-document', challenge: 'form-challenge' };
    if (formMap[type]) clearAllErrors(formMap[type]);

    if (type === 'challenge') {
      updateCorrectRadios();
      var oe = document.getElementById('options-error');
      if (oe) oe.style.display = 'none';
      var ce = document.getElementById('correct-error');
      if (ce) ce.style.display = 'none';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.forge-modal-overlay').forEach(function (m) {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }

  function fetchNodes() {
    SupabaseService.getJourneyNodes().then(function (nodes) {
      journeyNodes = nodes || [];
      populateNodeSelects();
    }).catch(function () {});
  }

  function populateNodeSelects() {
    document.querySelectorAll('.forge-select[data-node]').forEach(function (sel) {
      sel.innerHTML = '<option value="">Nenhum (avulso)</option>';
      journeyNodes.forEach(function (node) {
        var opt = document.createElement('option');
        opt.value = node.id;
        opt.textContent = node.title || node.name || ('No ' + node.node_order);
        sel.appendChild(opt);
      });
    });
  }

  function bindForms() {
    var videoSubmit = document.querySelector('[data-form="video"]');
    if (videoSubmit) videoSubmit.addEventListener('click', submitVideo);

    var docSubmit = document.querySelector('[data-form="document"]');
    if (docSubmit) docSubmit.addEventListener('click', submitDocument);

    var chSubmit = document.querySelector('[data-form="challenge"]');
    if (chSubmit) chSubmit.addEventListener('click', submitChallenge);
  }

  function getFormData(prefix) {
    return {
      title: val(prefix + '-title'),
      subject: val(prefix + '-subject'),
      url: val(prefix + '-url'),
      description: val(prefix + '-desc'),
      node_id: val(prefix + '-node')
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setFieldError(fieldId, show) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    var parent = field.closest('.forge-field');
    if (!parent) return;
    if (show) {
      parent.classList.add('error');
    } else {
      parent.classList.remove('error');
    }
  }

  function clearAllErrors(formId) {
    var form = document.getElementById(formId);
    if (form) form.querySelectorAll('.forge-field.error').forEach(function (f) { f.classList.remove('error'); });
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // ---- VIDEO ----
  async function submitVideo() {
    var btn = document.querySelector('[data-form="video"]');
    var data = getFormData('video');

    clearAllErrors('form-video');
    var valid = true;

    if (!data.title) { setFieldError('video-title', true); valid = false; }
    if (!data.url || !isValidUrl(data.url)) { setFieldError('video-url', true); valid = false; }
    if (!data.subject) { setFieldError('video-subject', true); valid = false; }
    if (!valid) return;

    var thumbUrl = '';
    var ytId = extractYouTubeId(data.url);
    if (ytId) thumbUrl = 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg';

    setLoading(btn, true);
    try {
      var result = await SupabaseService.addVideo({
        title: data.title,
        subject: data.subject,
        url: data.url,
        description: data.description,
        node_id: data.node_id || null,
        thumbnail_url: thumbUrl,
        duration_seconds: 0
      });
      if (result.success) {
        ToastManager.show('Video Forjado', '"' + data.title + '" foi adicionado com sucesso!', 'success');
        closeAllModals();
        resetForm('video');
        triggerRerender();
      } else {
        ToastManager.show('Erro', result.error || 'Falha ao criar video.', 'error');
      }
    } catch (e) {
      ToastManager.show('Erro', 'Falha ao criar video.', 'error');
    }
    setLoading(btn, false);
  }

  // ---- DOCUMENT ----
  async function submitDocument() {
    var btn = document.querySelector('[data-form="document"]');
    var data = getFormData('doc');

    clearAllErrors('form-document');
    var valid = true;

    if (!data.title) { setFieldError('doc-title', true); valid = false; }
    if (!data.url) { setFieldError('doc-url', true); valid = false; }
    if (!data.subject) { setFieldError('doc-subject', true); valid = false; }
    if (!valid) return;

    setLoading(btn, true);
    try {
      var result = await SupabaseService.addMaterial({
        title: data.title,
        subject: data.subject,
        url: data.url,
        description: data.description,
        node_id: data.node_id || null,
        material_type: 'pdf'
      });
      if (result.success) {
        ToastManager.show('Documento Forjado', '"' + data.title + '" foi adicionado!', 'success');
        closeAllModals();
        resetForm('document');
        triggerRerender();
      } else {
        ToastManager.show('Erro', result.error || 'Falha ao criar documento.', 'error');
      }
    } catch (e) {
      ToastManager.show('Erro', 'Falha ao criar documento.', 'error');
    }
    setLoading(btn, false);
  }

  // ---- CHALLENGE ----
  function bindChallengeOptions() {
    var addBtn = document.getElementById('add-option-btn');
    if (addBtn) {
      addBtn.addEventListener('click', addOption);
    }

    var container = document.getElementById('challenge-options-container');
    if (container) {
      container.addEventListener('click', function (e) {
        if (e.target.closest('.forge-option-remove')) {
          removeOption(e.target.closest('.forge-option-remove'));
        }
      });
      container.addEventListener('input', function () {
        updateCorrectRadios();
      });
    }
  }

  function addOption() {
    var container = document.getElementById('challenge-options-container');
    if (!container) return;
    var count = container.querySelectorAll('.forge-option-item').length;
    if (count >= 8) return;

    var idx = count;
    var div = document.createElement('div');
    div.className = 'forge-option-item';
    div.innerHTML =
      '<span class="forge-option-letter">' + LETTERS[idx] + '</span>' +
      '<input class="forge-input forge-option-input" type="text" placeholder="Opcao ' + LETTERS[idx] + '" data-idx="' + idx + '">' +
      '<button type="button" class="forge-option-remove" title="Remover">&times;</button>';
    container.appendChild(div);
    updateCorrectRadios();
  }

  function removeOption(btn) {
    var container = document.getElementById('challenge-options-container');
    if (!container) return;
    var items = container.querySelectorAll('.forge-option-item');
    if (items.length <= 2) return;
    btn.closest('.forge-option-item').remove();
    reindexOptions();
    updateCorrectRadios();
  }

  function reindexOptions() {
    var container = document.getElementById('challenge-options-container');
    if (!container) return;
    container.querySelectorAll('.forge-option-item').forEach(function (item, i) {
      item.querySelector('.forge-option-letter').textContent = LETTERS[i];
      var input = item.querySelector('.forge-option-input');
      input.setAttribute('data-idx', i);
      input.placeholder = 'Opcao ' + LETTERS[i];
    });
  }

  function updateCorrectRadios() {
    var container = document.getElementById('challenge-options-container');
    var selector = document.getElementById('correct-answer-selector');
    if (!container || !selector) return;

    var items = container.querySelectorAll('.forge-option-item');
    var currentVal = selector.querySelector('input[name="correct_answer"]:checked');
    var savedVal = currentVal ? currentVal.value : '';

    selector.innerHTML = '';
    items.forEach(function (item, i) {
      var input = item.querySelector('.forge-option-input');
      var label = (input && input.value.trim()) ? input.value.trim() : 'Opcao ' + LETTERS[i];
      var checked = (String(i) === savedVal) ? ' checked' : '';
      selector.innerHTML +=
        '<label class="forge-correct-option">' +
        '<input type="radio" name="correct_answer" value="' + i + '"' + checked + '>' +
        '<span>' + LETTERS[i] + ' — ' + label + '</span>' +
        '</label>';
    });
  }

  async function submitChallenge() {
    var btn = document.querySelector('[data-form="challenge"]');

    clearAllErrors('form-challenge');
    var valid = true;

    var title = val('ch-title');
    var subject = val('ch-subject');
    var challengeType = val('ch-type');
    var questionText = val('ch-question');
    var difficulty = parseInt(val('ch-difficulty'), 10) || 3;
    var xpReward = parseInt(val('ch-xp'), 10) || 50;
    var nodeId = val('ch-node');
    var explanation = val('ch-explanation');

    if (!title) { setFieldError('ch-title', true); valid = false; }
    if (!subject) { setFieldError('ch-subject', true); valid = false; }
    if (!challengeType) { setFieldError('ch-type', true); valid = false; }
    if (!questionText) { setFieldError('ch-question', true); valid = false; }

    var container = document.getElementById('challenge-options-container');
    var optionInputs = container ? container.querySelectorAll('.forge-option-input') : [];
    var options = [];
    optionInputs.forEach(function (inp) {
      var v = inp.value.trim();
      if (v) options.push(v);
    });

    if (options.length < 2) {
      var optErr = document.getElementById('options-error');
      if (optErr) optErr.style.display = 'block';
      valid = false;
    }

    var correctRadio = document.querySelector('input[name="correct_answer"]:checked');
    if (!correctRadio) {
      var corrErr = document.getElementById('correct-error');
      if (corrErr) corrErr.style.display = 'block';
      valid = false;
    }

    if (!valid) return;

    var correctAnswer = parseInt(correctRadio.value, 10);

    setLoading(btn, true);
    try {
      var result = await SupabaseService.addChallenge({
        title: title,
        subject: subject,
        challenge_type: challengeType,
        question_text: questionText,
        options: options,
        correct_answer: correctAnswer,
        difficulty: difficulty,
        xp_reward: xpReward,
        node_id: nodeId || null,
        explanation: explanation
      });
      if (result.success) {
        ToastManager.show('Desafio Forjado', '"' + title + '" foi criado com sucesso!', 'success');
        closeAllModals();
        resetForm('challenge');
        triggerRerender();
      } else {
        ToastManager.show('Erro', result.error || 'Falha ao criar desafio.', 'error');
      }
    } catch (e) {
      ToastManager.show('Erro', 'Falha ao criar desafio.', 'error');
    }
    setLoading(btn, false);
  }

  function resetForm(type) {
    var map = { video: 'form-video', document: 'form-document', challenge: 'form-challenge' };
    var form = document.getElementById(map[type]);
    if (form) form.reset();
    clearAllErrors(map[type]);

    if (type === 'challenge') {
      var container = document.getElementById('challenge-options-container');
      if (container) {
        container.innerHTML = '';
        for (var i = 0; i < 4; i++) {
          var div = document.createElement('div');
          div.className = 'forge-option-item';
          div.innerHTML =
            '<span class="forge-option-letter">' + LETTERS[i] + '</span>' +
            '<input class="forge-input forge-option-input" type="text" placeholder="Opcao ' + LETTERS[i] + '" data-idx="' + i + '">' +
            '<button type="button" class="forge-option-remove" title="Remover">&times;</button>';
          container.appendChild(div);
        }
        updateCorrectRadios();
      }
      var oe = document.getElementById('options-error');
      if (oe) oe.style.display = 'none';
      var ce = document.getElementById('correct-error');
      if (ce) ce.style.display = 'none';
    }
  }

  function triggerRerender() {
    var hash = window.location.hash;
    if (hash === '#/videos' && typeof VideoController !== 'undefined' && VideoController.render) {
      VideoController.render();
    } else if (hash === '#/challenges' && typeof ChallengeController !== 'undefined' && ChallengeController.render) {
      ChallengeController.render();
    }
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    var m;
    m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    return null;
  }

  function isValidUrl(str) {
    try { var u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch (_) { return false; }
  }

  function bindEscape() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  return { init: init, openModal: openModal, closeAllModals: closeAllModals, resetForm: resetForm };
})();
