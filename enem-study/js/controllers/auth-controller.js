/* ============================================================
   AUTH CONTROLLER - ENEM STUDY
   ============================================================ */

const AuthController = (() => {
  let registrationStep = 0;
  const totalSteps = 4;
  let registrationData = {};

  const AVATARS = [
    { id: 'knight', icon: '\u2694', name: 'Cavaleiro' },
    { id: 'archer', icon: '\uD83C\uDFF9', name: 'Arqueiro' },
    { id: 'mage', icon: '\uD83D\uDD2E', name: 'Mago' },
    { id: 'rogue', icon: '\uD83D\uDDE1', name: 'Ladino' },
    { id: 'healer', icon: '\u2727', name: 'Sacerdotisa' },
    { id: 'paladin', icon: '\u26D6', name: 'Paladino' }
  ];

  const HERO_CLASSES = [
    { id: 'guerreiro', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M15 21l6-6"/></svg>', name: 'Guerreiro', desc: 'Biologia' },
    { id: 'arqueiro', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>', name: 'Arqueiro', desc: 'Matematica' },
    { id: 'mago', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', name: 'Mago', desc: 'Quimica' },
    { id: 'ladino', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M20 16l-4 4"/></svg>', name: 'Ladino', desc: 'Linguagens' },
    { id: 'curandeiro', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/><path d="M12 8v8M8 12h8"/></svg>', name: 'Curandeiro', desc: 'Humanas' },
    { id: 'paladino', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/><circle cx="12" cy="12" r="3"/></svg>', name: 'Paladino', desc: 'Fisica' }
  ];

  function init() {
    bindLoginForm();
    bindRegisterButtons();
    bindAvatarSelection();
    bindClassSelection();
    checkExistingSession();
    testConnection();
  }

  async function testConnection() {
    try {
      const session = await SupabaseService.getSession();
      if (!session) {
        console.log('[Auth] Conexao Supabase testada — sem sessao ativa.');
      }
    } catch (e) {
      console.error('[Auth] Falha ao conectar com Supabase:', e.message);
      const loginError = document.getElementById('login-error');
      if (loginError) {
        showAuthError(loginError, 'Aviso: nao foi possivel conectar ao servidor. Verifique a chave API no console.');
      }
    }
  }

  function checkExistingSession() {
    const session = SessionManager.getSavedSession();
    if (session && session.user) navigateToApp(session.user);
  }

  // ---- Login ----
  function bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      const loadingEl = document.getElementById('login-loading');
      const submitBtn = document.getElementById('login-submit');

      if (!email || !password) { showAuthError(errorEl, 'Preencha todos os campos, aventureiro!'); return; }

      loadingEl.classList.add('visible');
      submitBtn.style.display = 'none';
      errorEl.classList.remove('visible');

      const result = await SupabaseService.signIn(email, password);

      loadingEl.classList.remove('visible');
      submitBtn.style.display = '';

      if (result.success) {
        showImpactBurst('READY');
        setTimeout(() => navigateToApp(result.user), 800);
      } else {
        showAuthError(errorEl, result.error || 'Falha ao entrar.');
      }
    });
  }

  // ---- Register Steps ----
  function bindRegisterButtons() {
    const prevBtn = document.getElementById('reg-prev');
    const nextBtn = document.getElementById('reg-next');
    const submitBtn = document.getElementById('register-submit');
    const toRegister = document.getElementById('toggle-to-register');
    const toLogin = document.getElementById('toggle-to-login');

    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (validateCurrentStep()) { registrationStep++; updateRegistrationView(); }
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (registrationStep > 0) { registrationStep--; updateRegistrationView(); }
    });

    if (submitBtn) submitBtn.addEventListener('click', async () => {
      if (!validateCurrentStep()) return;
      await completeRegistration();
    });

    if (toRegister) toRegister.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.auth-panel--login').classList.add('shifted');
      document.querySelector('.auth-panel--register').classList.add('active');
      registrationStep = 0;
      updateRegistrationView();
    });

    if (toLogin) toLogin.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.auth-panel--register').classList.remove('active');
      document.querySelector('.auth-panel--login').classList.remove('shifted');
    });
  }

  function validateCurrentStep() {
    const errorEl = document.getElementById('register-error');
    errorEl.classList.remove('visible');

    switch (registrationStep) {
      case 0: {
        const email = document.getElementById('reg-email')?.value.trim();
        const password = document.getElementById('reg-password')?.value;
        if (!email || !password) { showAuthError(errorEl, 'Preencha e-mail e senha!'); return false; }
        if (password.length < 6) { showAuthError(errorEl, 'A senha deve ter pelo menos 6 caracteres!'); return false; }
        registrationData.email = email;
        registrationData.password = password;
        return true;
      }
      case 1: {
        const name = document.getElementById('reg-name')?.value.trim();
        if (!name || name.length < 3) { showAuthError(errorEl, 'Escolha um nome com pelo menos 3 letras!'); return false; }
        registrationData.adventurerName = name;
        return true;
      }
      case 2: {
        if (!registrationData.avatar) { showAuthError(errorEl, 'Selecione um avatar!'); return false; }
        return true;
      }
      case 3: {
        if (!registrationData.heroClass) { showAuthError(errorEl, 'Escolha sua classe de heroi!'); return false; }
        return true;
      }
      default: return true;
    }
  }

  async function completeRegistration() {
    const loadingEl = document.getElementById('register-loading');
    const submitBtn = document.getElementById('register-submit');
    const errorEl = document.getElementById('register-error');

    loadingEl.classList.add('visible');
    submitBtn.style.display = 'none';
    errorEl.classList.remove('visible');

    const result = await SupabaseService.signUp(
      registrationData.email,
      registrationData.password,
      {
        adventurer_name: registrationData.adventurerName,
        avatar_url: `/assets/avatars/${registrationData.avatar}.svg`,
        hero_class: registrationData.heroClass
      }
    );

    loadingEl.classList.remove('visible');
    submitBtn.style.display = '';

    if (result.success) {
      if (result.needsConfirmation) {
        showAuthError(errorEl, 'Conta criada! Verifique seu email para confirmar o cadastro. Apos confirmar, faca login.');
      } else {
        const profileMeta = {
          adventurer_name: registrationData.adventurerName,
          avatar_url: `/assets/avatars/${registrationData.avatar}.svg`,
          hero_class: registrationData.heroClass
        };
        await SupabaseService.ensureProfile(result.user.id, profileMeta);
        showImpactBurst('QUEST\nBEGIN');
        setTimeout(() => navigateToApp(result.user), 1000);
      }
    } else {
      showAuthError(errorEl, result.error || 'Falha ao criar conta.');
    }
  }

  function updateRegistrationView() {
    document.querySelectorAll('.creation-step').forEach((el, i) => el.classList.toggle('active', i === registrationStep));
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === registrationStep);
      dot.classList.toggle('completed', i < registrationStep);
    });
    const prevBtn = document.getElementById('reg-prev');
    const nextBtn = document.getElementById('reg-next');
    const submitBtn = document.getElementById('register-submit');
    if (prevBtn) prevBtn.style.display = registrationStep > 0 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = registrationStep < totalSteps - 1 ? '' : 'none';
    if (submitBtn) submitBtn.style.display = registrationStep === totalSteps - 1 ? '' : 'none';
  }

  function bindAvatarSelection() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;
    AVATARS.forEach(av => {
      const btn = document.createElement('button');
      btn.className = 'avatar-option';
      btn.dataset.avatar = av.id;
      btn.innerHTML = `<span>${av.icon}</span>`;
      btn.title = av.name;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        registrationData.avatar = av.id;
      });
      grid.appendChild(btn);
    });
  }

  function bindClassSelection() {
    const grid = document.getElementById('class-grid');
    if (!grid) return;
    HERO_CLASSES.forEach(cls => {
      const btn = document.createElement('button');
      btn.className = 'hero-class-card';
      btn.dataset.heroClass = cls.id;
      btn.innerHTML = `
        <span class="hero-class-card__icon">${cls.icon}</span>
        <span class="hero-class-card__name">${cls.name}</span>
        <span style="font-size:11px;opacity:0.6;display:block;margin-top:2px">${cls.desc}</span>
      `;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.hero-class-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        registrationData.heroClass = cls.id;
      });
      grid.appendChild(btn);
    });
  }

  function showAuthError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    el.classList.remove('animate-shake');
    void el.offsetWidth;
    el.classList.add('animate-shake');
  }

  function showImpactBurst(text) {
    const burst = document.getElementById('impact-burst');
    if (burst) {
      burst.querySelector('.impact-burst__text').textContent = text;
      burst.classList.add('active');
      setTimeout(() => burst.classList.remove('active'), 1200);
    }
  }

  function navigateToApp(user) {
    SessionManager.setCurrentUser(user);
    window.location.href = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + '/pages/dashboard.html';
  }

  return { init };
})();
