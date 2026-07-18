/* ============================================================
   TOAST MANAGER - ENEM STUDY
   Sistema de notificações visuais estilo mangá
   ============================================================ */

const ToastManager = (() => {
  let toastContainer = null;

  function ensureContainer() {
    if (toastContainer) return;
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:12px;';
    document.body.appendChild(toastContainer);
  }

  function show(title, message, type = 'info', duration = 3000) {
    ensureContainer();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast__title">${title}</div>
      <div class="toast__message">${message}</div>
    `;

    if (type === 'error') {
      toast.style.borderColor = '#000';
      toast.style.background = '#fff';
    }

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();
