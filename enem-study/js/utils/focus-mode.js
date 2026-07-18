/* ============================================================
   FOCUS MODE SERVICE - ENEM STUDY
   Modo Foco: escurece bordas, oculta distrativos
   ============================================================ */

const FocusMode = (() => {
  let active = false;
  let overlay = null;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'focus-overlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
  }

  function toggle() {
    if (!overlay) createOverlay();
    active = !active;

    if (active) {
      overlay.style.display = 'block';
      document.body.classList.add('focus-mode');
      // Hide sidebar and widgets on mobile
      document.querySelectorAll('.sidebar, .widget-trigger, .widget-panel').forEach(el => {
        el.dataset.focusHidden = 'true';
        el.style.opacity = '0.15';
        el.style.pointerEvents = 'none';
      });
      ToastManager.show('Modo Foco', 'Elementos distrativos ocultados', 'info');
    } else {
      overlay.style.display = 'none';
      document.body.classList.remove('focus-mode');
      document.querySelectorAll('[data-focus-hidden]').forEach(el => {
        el.style.opacity = '';
        el.style.pointerEvents = '';
        delete el.dataset.focusHidden;
      });
    }
    return active;
  }

  function isActive() {
    return active;
  }

  return { toggle, isActive };
})();
