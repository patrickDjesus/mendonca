/* ============================================================
   FOCUS MODE SERVICE - ENEM STUDY
   ============================================================ */

const FocusMode = (() => {
  let active = false;

  function toggle() {
    const existing = document.getElementById('focus-overlay');
    if (existing) {
      overlay = existing;
    }
    active = !active;
    document.body.classList.toggle('focus-mode', active);
    if (active && typeof ToastManager !== 'undefined') {
      ToastManager.show('Modo Foco', 'Elementos distrativos ocultados', 'info');
    }
    return active;
  }

  function isActive() { return active; }

  return { toggle, isActive };
})();
