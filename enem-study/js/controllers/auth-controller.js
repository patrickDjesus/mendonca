/* ============================================================
   AUTH CONTROLLER - ENEM STUDY
   Controlador da tela de autenticação
   ============================================================ */

const AuthController = (() => {
  let currentView = 'login'; // login | register
  let registrationStep = 0;
  let registrationData = {};

  const AVATARS = [
    { id: 'knight', icon: '⚔', name: 'Cavaleiro' },
    { id: 'archer', icon: '🏹', name: 'Arqueiro' },
    { id: 'mage', icon: '🔮', name: 'Mago' },
    { id: 'rogue', icon: '🗡', name: 'Ladino' },
    { id: 'healer', icon: '✧', name: 'Sacerdotisa' },
    { id: 'paladin', icon: '⛊', name: 'Paladino' }
  ];

  const HERO_CLASSES = [
    { id: 'guerreiro', icon: '⚔', name: 'Guerreiro', desc: 'Biologia' },
    { id: 'arqueiro', icon: '🏹', name: 'Arqueiro', desc: 'Matemática' },
    { id: 'mago', icon: '🔮', name: 'Mago', desc: 'Química' },
    { id: 'ladino', icon: '🗡', name: 'Ladino', desc: 'Linguagens' },
    { id: 'curandeiro', icon: '✧', name: 'Curandeiro', desc: 'Humanas' },
    { id: 'paladino', icon: '⛊', name: 'Paladino', desc: 'Física' }
  ];

  function init() {
    bindLoginForm();
    bindRegisterForm();
    bindNavigation();
    bindAvatarSelection();
    bindClassSelection();
    checkExistingSession();
  }

  function checkExistingSession() {
    const session = SessionManager.getSavedSession();
    if (session && session.user) {
      navigateToApp(session.user);
    }
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

      if (!email || !password) {
        showAuthError(errorEl, 'Preencha todos os campos, aventureiro!');
        return;
      }

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
        showAuthError(errorEl, result.error || 'Falha ao entrar. Tente novamente.');
      }
    });
  }

  // ---- Register ----
  function bindRegisterForm() {
    const nextBtns = document.querySelectorAll('[data-register-next]');
    const prevBtns = document.querySelectorAll('[data-register-prev]');
    const submitBtn = document.getElementById('register-submit');

    nextBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (validateCurrentStep()) {
          registrationStep++;
          updateRegistrationView();
        }
      });
    });

    prevBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        registrationStep--;
        updateRegistrationView();
      });
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (!validateCurrentStep()) return;
        await completeRegistration();
      });
    }
  }

  function validateCurrentStep() {
    const errorEl = document.getElementById('register-error');

    switch (registrationStep) {
      case 0: {
        const email = document.getElementById('reg-email')?.value.trim();
        const password = document.getElementById('reg-password')?.value;
        if (!email || !password) {
          showAuthError(errorEl, 'Preencha e-mail e senha!');
          return false;
        }
        if (password.length < 6) {
          showAuthError(errorEl, 'A senha deve ter pelo menos 6 caracteres!');
          return false;
        }
        registrationData.email = email;
        registrationData.password = password;
        return true;
      }
      case 1: {
        const name = document.getElementById('reg-name')?.value.trim();
        if (!name || name.length < 3) {
          showAuthError(errorEl, 'Escolha um nome com pelo menos 3 letras!');
          return false;
        }
        registrationData.adventurerName = name;
        return true;
      }
      case 2: {
        if (!registrationData.avatar) {
          showAuthError(errorEl, 'Selecione um avatar!');
          return false;
        }
        return true;
      }
      case 3: {
        if (!registrationData.heroClass) {
          showAuthError(errorEl, 'Escolha sua classe de herói!');
          return false;
        }
        return true;
      }
      default:
        return true;
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
      showImpactBurst('QUEST\nBEGIN');
      setTimeout(() => navigateToApp(result.user), 1000);
    } else {
      showAuthError(errorEl, result.error || 'Falha ao criar conta.');
    }
  }

  function updateRegistrationView() {
    document.querySelectorAll('.creation-step').forEach((el, i) => {
      el.classList.toggle('active', i === registrationStep);
    });

    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === registrationStep);
      dot.classList.toggle('completed', i < registrationStep);
    });
  }

  // ---- Avatar Selection ----
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

  // ---- Class Selection ----
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

  // ---- Navigation ----
  function bindNavigation() {
    const toRegister = document.getElementById('toggle-to-register');
    const toLogin = document.getElementById('toggle-to-login');
    const loginPanel = document.querySelector('.auth-panel--login');
    const registerPanel = document.querySelector('.auth-panel--register');

    if (toRegister) {
      toRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginPanel.classList.add('shifted');
        registerPanel.classList.add('active');
        registrationStep = 0;
        updateRegistrationView();
      });
    }

    if (toLogin) {
      toLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerPanel.classList.remove('active');
        loginPanel.classList.remove('shifted');
      });
    }
  }

  // ---- Helpers ----
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
    window.location.href = 'pages/dashboard.html';
  }

  return { init };
})();
