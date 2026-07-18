/* ============================================================
   BREAK NOTIFIER - ENEM STUDY
   ============================================================ */

const BreakNotifier = (() => {
  const BREAK_INTERVAL = 25 * 60 * 1000;
  const LONG_BREAK_INTERVAL = 4 * 60 * 60 * 1000;
  let timerId = null;
  let startTime = null;
  let userId = null;

  function start(uid) {
    userId = uid;
    startTime = Date.now();
    scheduleBreak();
  }

  function stop() {
    if (timerId) { clearTimeout(timerId); timerId = null; }
  }

  function scheduleBreak() {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= LONG_BREAK_INTERVAL) {
        showBreakNotification('Pausa Longa', 'Voce ja estuda ha bastante tempo. Que tal uma pausa de 15-20 minutos?');
      } else {
        showBreakNotification('Pausa Curta', 'Respire fundo, estique o corpo. Volte em 5 minutos!');
      }
      scheduleBreak();
    }, BREAK_INTERVAL);
  }

  function showBreakNotification(title, message) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`ENEM Study - ${title}`, { body: message });
    }
    if (typeof ToastManager !== 'undefined') ToastManager.show(title, message, 'info', 8000);
  }

  function requestPermission() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
  }

  return { start, stop, requestPermission };
})();
