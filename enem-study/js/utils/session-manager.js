/* ============================================================
   SESSION MANAGER - ENEM STUDY
   ============================================================ */

const SessionManager = (() => {
  const SESSION_KEY = 'enem_persistent_session';
  const STREAK_KEY = 'enem_streak_data';

  let currentUser = null;
  let sessionCheckInterval = null;

  function saveSession(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() })); } catch (e) { /* ignore */ }
  }

  function getSavedSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.access_token === 'offline') return data;
      if (data.savedAt && (Date.now() - data.savedAt) > 30 * 24 * 60 * 60 * 1000) { clearSession(); return null; }
      return data;
    } catch { return null; }
  }

  function clearSession() { localStorage.removeItem(SESSION_KEY); currentUser = null; }

  function setCurrentUser(user) {
    currentUser = user;
    try { localStorage.setItem('enem_current_user_id', user?.id || ''); } catch (e) { /* ignore */ }
  }

  function getCurrentUser() { return currentUser; }

  function getStreakData() {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"lastDate":null,"streak":0}'); } catch { return { lastDate: null, streak: 0 }; }
  }

  function updateLocalStreak() {
    const data = getStreakData();
    const today = new Date().toISOString().split('T')[0];
    if (data.lastDate === today) return data.streak;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (data.lastDate === yesterday) { data.streak += 1; }
    else if (data.lastDate !== today) { data.streak = 1; }

    data.lastDate = today;
    try { localStorage.setItem(STREAK_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    return data.streak;
  }

  function getStreak() { return getStreakData().streak; }

  function startSessionMonitor(getUserFn) {
    sessionCheckInterval = setInterval(async () => {
      const user = getUserFn ? await getUserFn() : currentUser;
      if (user) {
        updateLocalStreak();
        try { await SupabaseService.updateStreak(user.id); } catch (e) { /* offline */ }
      }
    }, 5 * 60 * 1000);

    window.addEventListener('beforeunload', () => {
      if (currentUser) {
        try {
          const session = getSavedSession();
          if (session) {
            session.savedAt = Date.now();
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          }
        } catch (e) { /* ignore */ }
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && currentUser) updateLocalStreak();
    });

    updateLocalStreak();
  }

  function stopSessionMonitor() {
    if (sessionCheckInterval) { clearInterval(sessionCheckInterval); sessionCheckInterval = null; }
  }

  return {
    saveSession, getSavedSession, clearSession,
    setCurrentUser, getCurrentUser,
    updateLocalStreak, getStreak,
    startSessionMonitor, stopSessionMonitor
  };
})();
