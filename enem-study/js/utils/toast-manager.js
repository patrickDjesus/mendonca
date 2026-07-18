/* ============================================================
   TOAST MANAGER - ENEM STUDY
   ============================================================ */

const ToastManager = (() => {
  let container = null;

  function ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:12px;';
    document.body.appendChild(container);
  }

  function show(title, message, type = 'info', duration = 3000) {
    ensureContainer();
    const toast = document.createElement('div');
    toast.className = 'toast';
    const titleEl = document.createElement('div');
    titleEl.className = 'toast__title';
    titleEl.textContent = title;
    const msgEl = document.createElement('div');
    msgEl.className = 'toast__message';
    msgEl.textContent = message;
    toast.appendChild(titleEl);
    toast.appendChild(msgEl);
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();
