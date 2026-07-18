/* ============================================================
   OFFLINE SERVICE - ENEM STUDY
   IndexedDB + localStorage fallback
   ============================================================ */

const OfflineService = (() => {
  const DB_NAME = 'enem_study_offline';
  const DB_VERSION = 1;
  const STORE_NAME = 'app_data';
  const QUEUE_KEY = 'offline_action_queue';

  let db = null;

  // ---- IndexedDB Init ----
  async function initDB() {
    if (db) return db;
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, using localStorage');
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  // ---- Generic Cache ----
  async function cacheData(key, data) {
    const record = { key, data, timestamp: Date.now() };

    // Try IndexedDB
    const database = await initDB();
    if (database) {
      try {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        return true;
      } catch (e) { /* fall through */ }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(`enem_${key}`, JSON.stringify(record));
      return true;
    } catch (e) {
      console.warn('localStorage not available');
      return false;
    }
  }

  async function getCachedData(key, maxAgeMs = 3600000) {
    // Try IndexedDB
    const database = await initDB();
    if (database) {
      try {
        const result = await new Promise((resolve) => {
          const tx = database.transaction(STORE_NAME, 'readonly');
          const request = tx.objectStore(STORE_NAME).get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });
        if (result && (Date.now() - result.timestamp) < maxAgeMs) {
          return result.data;
        }
      } catch (e) { /* fall through */ }
    }

    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(`enem_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if ((Date.now() - parsed.timestamp) < maxAgeMs) {
          return parsed.data;
        }
      }
    } catch (e) { /* ignore */ }

    return null;
  }

  async function removeCachedData(key) {
    const database = await initDB();
    if (database) {
      try {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
      } catch (e) { /* ignore */ }
    }
    localStorage.removeItem(`enem_${key}`);
  }

  // ---- Offline Queue ----
  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Could not save offline queue');
    }
  }

  function queueOfflineAction(action) {
    const queue = getQueue();
    queue.push({
      ...action,
      queuedAt: Date.now(),
      id: crypto.randomUUID()
    });
    saveQueue(queue);
  }

  async function processOfflineQueue() {
    const queue = getQueue();
    if (queue.length === 0) return;

    const remaining = [];
    for (const action of queue) {
      try {
        switch (action.type) {
          case 'UPDATE_PROFILE':
            await SupabaseService.updateProfile(action.userId, action.updates);
            break;
          case 'SAVE_NOTE':
            await SupabaseService.saveNote(
              action.payload.user_id,
              action.payload.video_id,
              { timestamp: action.payload.timestamp_seconds, content: action.payload.content, html: action.payload.content_html }
            );
            break;
          case 'SUBMIT_CHALLENGE':
            await SupabaseService.submitChallengeResult(
              action.userId, action.challengeId, action.answer, action.timeSpent
            );
            break;
          default:
            break;
        }
      } catch (e) {
        remaining.push(action);
      }
    }
    saveQueue(remaining);
  }

  // ---- Auth Offline ----
  function signUpOffline(email, password, metadata) {
    const users = JSON.parse(localStorage.getItem('enem_offline_users') || '[]');
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Usuário já existe localmente' };
    }
    const user = {
      id: crypto.randomUUID(),
      email,
      password: btoa(password),
      metadata,
      created_at: new Date().toISOString()
    };
    users.push(user);
    localStorage.setItem('enem_offline_users', JSON.stringify(users));

    const session = { user: { id: user.id, email: user.email, user_metadata: metadata }, access_token: 'offline' };
    localStorage.setItem('enem_offline_session', JSON.stringify(session));
    return { success: true, user: { id: user.id, email, user_metadata: metadata } };
  }

  function signInOffline(email, password) {
    const users = JSON.parse(localStorage.getItem('enem_offline_users') || '[]');
    const user = users.find(u => u.email === email && u.password === btoa(password));
    if (!user) {
      return { success: false, error: 'Credenciais inválidas' };
    }
    const session = { user: { id: user.id, email: user.email, user_metadata: user.metadata }, access_token: 'offline' };
    localStorage.setItem('enem_offline_session', JSON.stringify(session));
    return { success: true, user: { id: user.id, email, user_metadata: user.metadata }, session };
  }

  function clearOfflineSession() {
    localStorage.removeItem('enem_offline_session');
  }

  function getOfflineSession() {
    try {
      const raw = localStorage.getItem('enem_offline_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // ---- Connection Monitor ----
  function initConnectionMonitor() {
    window.addEventListener('online', () => {
      document.body.classList.remove('offline');
      processOfflineQueue();
      if (typeof ToastManager !== 'undefined') {
        ToastManager.show('Conexão Restaurada', 'Sincronizando dados...', 'success');
      }
    });
    window.addEventListener('offline', () => {
      document.body.classList.add('offline');
      if (typeof ToastManager !== 'undefined') {
        ToastManager.show('Sem Conexão', 'Modo offline ativado', 'warning');
      }
    });
  }

  return {
    initDB, cacheData, getCachedData, removeCachedData,
    queueOfflineAction, processOfflineQueue,
    signUpOffline, signInOffline, clearOfflineSession, getOfflineSession,
    initConnectionMonitor
  };
})();
