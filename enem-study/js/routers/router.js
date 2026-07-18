/* ============================================================
   ROUTER - ENEM STUDY
   Roteamento SPA simples baseado em hash
   ============================================================ */

const Router = (() => {
  const routes = {};
  let currentRoute = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const route = routes[hash];

    if (route) {
      currentRoute = hash;
      route();
    } else if (routes['*']) {
      routes['*']();
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function getCurrentRoute() {
    return currentRoute;
  }

  return { register, navigate, init, getCurrentRoute };
})();
