/* ============================================================
   FOCUS MODE SERVICE - ENEM STUDY
   ============================================================ */

const FocusMode = (() => {
  let active = false;
  let overlay = null;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'focus-overlay';
    document.body.appendChild(overlay);
  }

  function toggle() {
    if (!overlay) createOverlay();
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
