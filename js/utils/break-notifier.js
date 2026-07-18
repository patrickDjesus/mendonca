/* ============================================================
   BREAK NOTIFIER SERVICE - ENEM STUDY
   Sugere pausas para evitar esgotamento mental
   ============================================================ */

const BreakNotifier = (() => {
  const BREAK_INTERVAL = 25 * 60 * 1000; // 25 minutos
  const LONG_BREAK_INTERVAL = 4 * 60 * 60 * 1000; // 4 horas
  let timerId = null;
  let startTime = null;
  let userId = null;

  function start(uid) {
    userId = uid;
    startTime = Date.now();
    scheduleBreak();
  }

  function stop() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function scheduleBreak() {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= LONG_BREAK_INTERVAL) {
        showBreakNotification('Pausa Longa', 'Você já estuda há bastante tempo. Que tal uma pausa de 15-20 minutos?');
      } else {
        showBreakNotification('Pausa Curta', 'Respire fundo, estique o corpo. Volte em 5 minutos!');
      }
      scheduleBreak();
    }, BREAK_INTERVAL);
  }

  function showBreakNotification(title, message) {
    // Visual notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`ENEM Study - ${title}`, { body: message });
    }

    // In-app toast
    ToastManager.show(title, message, 'info', 8000);

    // Save to DB
    if (userId) {
      try {
        const supabase = window.supabase?.createClient(
          'https://pymtagngzrzupbvbarrl.supabase.co',
          'sb_publishable_zapw9ov_DxM2BnJU5wG58A_Y8eVZphO'
        );
        if (supabase) {
          supabase.from('user_notifications').insert({
            user_id: userId,
            type: 'break_reminder',
            title,
            message
          });
        }
      } catch (e) { /* offline */ }
    }
  }

  function requestPermission() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  return { start, stop, requestPermission };
})();
