const CACHE = 'darkis-suite-v29-revision3';
const LOCAL = ['./employee-returns.js?v=29r3','./route-orders.js?v=29r3','./inventory-model.js?v=29r3','./inventory.js?v=29r3','./inventory.css?v=29r3','./number-entry.js?v=29r3','./route-insights.js?v=29r3','./route-tools.js?v=29r3','./payroll-model.js?v=29r3','./activity-model.js?v=29r3','./clock-payroll.js?v=29r3','./admin-payroll.js?v=29r3','./client-directory.js?v=29r3','./clock-recovery.js?v=29r3','./shop-photos.js?v=29r3','./route-schedule.js?v=29r3','./client-aliases.js?v=29r3','./client-policy.js?v=29r3','./route-motion.js?v=29r3','./route-motion.css?v=29r3','./launch-darkisistema-750x1334.png?v=29r3','./launch-darkisistema-1125x2436.png?v=29r3','./launch-darkisistema-1170x2532.png?v=29r3','./launch-darkisistema-1179x2556.png?v=29r3','./launch-darkisistema-1242x2208.png?v=29r3','./launch-darkisistema-828x1792.png?v=29r3','./launch-darkisistema-1242x2688.png?v=29r3','./launch-darkisistema-1284x2778.png?v=29r3','./launch-darkisistema-1290x2796.png?v=29r3','./launch-darkisistema-1206x2622.png?v=29r3','./launch-darkisistema-1320x2868.png?v=29r3','./launch-darkisistema-1080x2340.png?v=29r3','./history-data.js?v=29r3','./history.js?v=29r3','./production.js?v=29r3','./production.css?v=29r3','./darkisistema.svg','./','./index.html','./startup.css?v=29r3','./startup.js?v=29r3','./cat-icon.png?v=29r3','./reloj-checador.html','./clock-location.js?v=29r3','./clock-ledger.js?v=29r3','./clock-report.js?v=29r3','./clock-report-fonts.js?v=29r3','./app-update.js?v=29r3','./darkisocio.html','./administrador.html','./admin-auth.js?v=29r3','./repartidor.html','./shared-sync.js','./shared-sync.js?v=29r3','./firebase-errors.js?v=29r3','./clock-sync.js?v=29r3','./suite-experience.js','./suite-experience.js?v=29r3','./google-access.js','./google-access.js?v=29r3','./manifest.webmanifest','./manifest.webmanifest?v=29r3','./sistema-darkis-logo-v17.png','./logo.png','./icon.svg','./icon-darkis-original-v15.png','./icon-192.png','./icon-512.png','./role-production.webp','./role-repartidor.webp','./role-administrador.webp','./avatar-tania.jpg','./avatar-sofia.jpg','./avatar-juan-pablo.jpg','./avatar-alejandro.jpg'];
const scoped = url => url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname);
const usable = response => response && response.ok && !response.redirected && response.type !== 'opaqueredirect';
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // Una redirección nunca se conserva como pantalla de inicio.
  for (const path of LOCAL) {
    const request = new Request(new URL(path, self.registration.scope), {cache:'reload', redirect:'error'});
    const response = await fetch(request);
    if (!usable(response)) throw new Error('No fue posible preparar la actualización: ' + path);
    await cache.put(request, response);
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => /^darkis-suite-v/.test(name) && name !== CACHE).map(name => caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !scoped(url)) return;
  const documentRequest = event.request.mode === 'navigate';
  const codeRequest = /\.(?:html|js|css|webmanifest)$/.test(url.pathname);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if (!documentRequest && !codeRequest && cached) return cached;
    try {
      const response = await fetch(event.request, {cache:'no-store', redirect:'error'});
      if (usable(response)) { try { await cache.put(event.request, response.clone()); } catch {} return response; }
      if (cached) return cached;
      return response;
    } catch (error) {
      if (cached) return cached;
      // No sirve el inicio en lugar de un archivo JS ni de una página desconocida.
      return new Response(documentRequest ? 'Sin conexión. Abre de nuevo cuando tengas internet.' : '', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(async windows => {
    for (const client of windows) if (client.url.startsWith(self.registration.scope)) { await client.focus(); return; }
    await self.clients.openWindow(new URL('./index.html?v=29r3', self.registration.scope).href);
  }));
});
