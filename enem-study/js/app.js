/* ============================================================
   APP INITIALIZER - ENEM STUDY
   Ponto de entrada da aplicação
   ============================================================ */

const App = (() => {
  let initialized = false;

  async function init() {
    if (initialized) return;

    // Init offline capabilities
    OfflineService.initDB();
    OfflineService.initConnectionMonitor();

    // Check for existing session
    const session = SessionManager.getSavedSession();
    if (session && session.user) {
      SessionManager.setCurrentUser(session.user);
    }

    // Start session monitor
    SessionManager.startSessionMonitor(async () => {
      return SessionManager.getCurrentUser();
    });

    // Request notification permissions
    BreakNotifier.requestPermission();

    // Init page-specific controllers
    const path = window.location.pathname;
    if (path.includes('auth') || path.endsWith('/') || path.endsWith('index.html')) {
      AuthController.init();
    }

    initialized = true;
    console.log('[ENEM Study] App initialized');
  }

  function isInitialized() {
    return initialized;
  }

  return { init, isInitialized };
})();

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
