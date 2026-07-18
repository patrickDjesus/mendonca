/* ============================================================
   SESSION MANAGER - ENEM STUDY
   Persistência de sessão contínua (anti-perda de streak)
   ============================================================ */

const SessionManager = (() => {
  const SESSION_KEY = 'enem_persistent_session';
  const STREAK_KEY = 'enem_streak_data';

  let currentUser = null;
  let sessionCheckInterval = null;

  function saveSession(session) {
    try {
      const data = {
        ...session,
        savedAt: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save session');
    }
  }

  function getSavedSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Check if offline session
      if (data.access_token === 'offline') return data;
      // Check expiry
      if (data.savedAt && (Date.now() - data.savedAt) > 30 * 24 * 60 * 60 * 1000) {
        clearSession();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
  }

  function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('enem_current_user_id', user?.id || '');
  }

  function getCurrentUser() {
    return currentUser;
  }

  // ---- Streak Persistence ----
  function getStreakData() {
    try {
      return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"lastDate":null,"streak":0}');
    } catch {
      return { lastDate: null, streak: 0 };
    }
  }

  function updateLocalStreak() {
    const data = getStreakData();
    const today = new Date().toISOString().split('T')[0];

    if (data.lastDate === today) return data.streak;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (data.lastDate === yesterday) {
      data.streak += 1;
    } else if (data.lastDate !== today) {
      data.streak = 1;
    }

    data.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    return data.streak;
  }

  function getStreak() {
    return getStreakData().streak;
  }

  // ---- Session Lifecycle ----
  function startSessionMonitor(getUserFn) {
    // Check session every 5 minutes
    sessionCheckInterval = setInterval(async () => {
      const user = getUserFn ? await getUserFn() : currentUser;
      if (user) {
        updateLocalStreak();
        // Try to update server streak
        try {
          await SupabaseService.updateStreak(user.id);
        } catch (e) { /* offline */ }
      }
    }, 5 * 60 * 1000);

    // Save session before tab close
    window.addEventListener('beforeunload', () => {
      if (currentUser) {
        const session = getSavedSession();
        if (session) saveSession(session);
      }
    });

    // Restore on visibility change (tab focus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && currentUser) {
        updateLocalStreak();
      }
    });

    // Initial streak update
    updateLocalStreak();
  }

  function stopSessionMonitor() {
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
  }

  return {
    saveSession, getSavedSession, clearSession,
    setCurrentUser, getCurrentUser,
    updateLocalStreak, getStreak,
    startSessionMonitor, stopSessionMonitor
  };
})();
