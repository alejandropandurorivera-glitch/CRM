const CACHE='darkis-suite-v12';
const LOCAL=['./','./index.html','./reloj-checador.html','./darkisocio.html','./administrador.html','./shared-sync.js','./manifest.webmanifest','./logo.png','./icon.svg','./icon-192.png','./icon-512.png','./cat-tania.webp','./cat-sofis.webp','./cat-juan-pablo.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(LOCAL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(cached=>{const fresh=fetch(event.request).then(response=>{if(response?.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response}).catch(()=>cached);return cached||fresh}))});
