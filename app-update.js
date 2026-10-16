/* Registro independiente de Firebase. No borra sesiones ni registros. */
(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (wasControlled && !reloading && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) {
      reloading = true;
      location.reload();
    }
  });
  const start = async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'});
      await registration.update();
    } catch (error) { console.info('Actualización pendiente; se reintentará con conexión.'); }
  };
  if (document.readyState === 'complete') start(); else addEventListener('load', start, {once:true});
  addEventListener('online', start);
})();
