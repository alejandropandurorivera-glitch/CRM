/* Controles comunes de instalación, conexión y alertas de Sistema Darkis. */
(() => {
  'use strict';
  const MODE_KEY = 'darkis_notification_mode_v01';
  const INSTALL_KEY = 'darkis_install_shows_v13';
  const SEEN_KEY = 'darkis_install_seen_session_v13';
  const SENT_KEY = 'darkis_alert_sent_v13';
  const page = document.body.dataset.darkisPage || 'repartidor';
  const colors = {online: '#19a773', connecting: '#f5b83f', offline: '#e44e49'};
  let connection = 'connecting';
  let deferredPrompt = null;
  let lastAlert = {};
  try { lastAlert = JSON.parse(localStorage.getItem(SENT_KEY) || '{}') || {}; } catch {}

  const css = document.createElement('style');
  css.textContent = `
    .dx-controls{display:inline-flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap;max-width:100%}
    .dx-status,.dx-prefs{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:34px;padding:6px 10px;border:1px solid rgba(255,255,255,.4);border-radius:999px;background:rgba(8,53,70,.12);color:inherit;font:700 11px/1.2 system-ui,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:none}
    .dx-status i{display:block;width:10px;height:10px;flex:none;border-radius:50%;background:${colors.connecting};box-shadow:0 0 0 3px rgba(245,184,63,.18)}
    .dx-status[data-state=online] i{background:${colors.online};box-shadow:0 0 0 3px rgba(25,167,115,.2)}
    .dx-status[data-state=offline] i{background:${colors.offline};box-shadow:0 0 0 3px rgba(228,78,73,.2)}
    .dx-status[data-state=connecting] i{animation:dx-pulse 1.2s ease-in-out infinite}
    .dx-prefs{font-size:17px;width:35px;padding:5px}
    .dx-controls--light .dx-status,.dx-controls--light .dx-prefs{color:#12506a;background:#e9f5f9;border-color:#cfe5ed}
    .dx-controls--light .dx-status[data-state=offline]{color:#a4332e;background:#fff0ec}
    .dx-modal{position:fixed;inset:0;z-index:1100;background:rgba(9,38,53,.6);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:18px}
    .dx-modal.open{display:flex}.dx-panel{width:min(420px,100%);max-height:min(88dvh,780px);overflow:auto;padding:22px;border:1px solid #d9e8ed;border-radius:25px;background:#fffdfa;color:#173244;box-shadow:0 28px 70px rgba(0,28,45,.3);font:14px/1.5 system-ui,sans-serif;animation:dx-rise .32s ease}
    .dx-panel h2{color:#713b28;margin:5px 0 7px;font-size:23px}.dx-panel p{color:#55707f;margin:0 0 16px}.dx-panel img{display:block;width:150px;max-height:65px;object-fit:contain;object-position:left center;margin-bottom:13px}.dx-panel label{display:block;margin:11px 0 6px;font-size:12px;font-weight:800}.dx-panel select{width:100%;min-height:45px;padding:9px 12px;border:1px solid #c9dce2;border-radius:12px;color:#173244;background:#fff;font:inherit}
    .dx-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:17px}.dx-actions button{flex:1;min-height:43px;padding:9px 12px;border:0;border-radius:12px;background:#087eae;color:white;font:800 13px system-ui,sans-serif;cursor:pointer}.dx-actions .secondary{background:#e6f2f7;color:#174c66}.dx-actions .orange{background:#f35a28;color:#fff}.dx-note{margin-top:12px;padding:10px 11px;border-radius:11px;background:#eaf7fb;color:#315e72;font-size:11px}.dx-close{float:right;width:34px;height:34px;border:0;border-radius:10px;background:#eaf3f5;color:#315369;font-size:22px;cursor:pointer}
    .dx-alert{position:fixed;z-index:1050;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));width:min(370px,calc(100vw - 32px));padding:15px 17px;border-radius:16px;background:#fffdfa;color:#173244;border:1px solid #e8d4bd;box-shadow:0 18px 46px rgba(0,42,65,.24);font:13px/1.4 system-ui,sans-serif;animation:dx-rise .3s ease}.dx-alert strong{display:block;color:#b6452e;margin-bottom:4px}.dx-alert button{float:right;border:0;background:transparent;font-size:18px;cursor:pointer}
    .dx-role-icon{display:block;width:100%;height:100%;object-fit:contain}.dx-role-art{display:block;width:84px;height:84px;object-fit:contain;flex:none;filter:drop-shadow(0 5px 9px rgba(0,39,54,.12))}
    @keyframes dx-rise{from{opacity:0;transform:translateY(13px) scale(.97)}to{opacity:1;transform:none}}@keyframes dx-pulse{50%{opacity:.4;transform:scale(.7)}}
    @media(max-width:600px){.dx-status span{font-size:10px}.dx-panel{padding:19px}}
    @media(prefers-reduced-motion:reduce){.dx-panel,.dx-alert{animation:none}.dx-status i{animation:none!important}}
  `;
  document.head.append(css);

  function mount(selector, light = false) {
    const target = document.querySelector(selector);
    if (!target) return;
    const node = document.createElement('span');
    node.className = 'dx-controls' + (light ? ' dx-controls--light' : '');
    node.innerHTML = '<button type="button" class="dx-status" data-state="connecting" title="Comprobando Firebase"><i aria-hidden="true"></i><span>Conectando…</span></button><button type="button" class="dx-prefs" aria-label="Ajustes de avisos e instalación" title="Ajustes">⚙</button>';
    target.append(node);
    node.querySelector('.dx-status').addEventListener('click', () => open('dxSettings'));
    node.querySelector('.dx-prefs').addEventListener('click', () => open('dxSettings'));
  }
  if (page === 'repartidor') {
    mount('.suite-card', true);
    mount('.route-pin-card', true);
    mount('.topbar .header-actions', true);
  } else if (page === 'darkita') mount('.top');
  else if (page === 'administrador') {
    mount('.top-actions', true);
    mount('.admin-gate-card', true);
  }
  else if (page === 'darkisocio') {
    mount('#profileScreen .entry-card', true);
    mount('#pinScreen .entry-card', true);
    mount('.app-header .header-actions');
  }
  function setConnection(state, message) {
    connection = state;
    const label = state === 'online' ? 'Firebase conectado' : state === 'connecting' ? 'Conectando…' : state === 'waiting' ? 'Acceso pendiente' : 'Sin Firebase';
    document.querySelectorAll('.dx-status').forEach(el => {
      el.dataset.state = state;
      el.title = message || label;
      el.querySelector('span').textContent = label;
      el.setAttribute('aria-label', `${label}. ${message || ''}`);
    });
    const detail = document.querySelector('#dxConnectionDetail');
    if (detail) detail.textContent = `${label}${message ? ' · ' + message : ''}`;
  }
  addEventListener('darkis-sync-status', e => {
    const s = e.detail?.state;
    setConnection(s === 'online' ? 'online' : ['connecting', 'syncing'].includes(s) ? 'connecting' : s === 'waiting' ? 'waiting' : 'offline', e.detail?.detail);
  });
  if (window.darkisClockStatus || window.darkisSyncStatus) {
    const {state, detail} = window.darkisClockStatus || window.darkisSyncStatus;
    setConnection(state, detail);
  }
  addEventListener('offline', () => setConnection('offline', 'Sin internet'));
  addEventListener('online', () => { if (connection !== 'online') setConnection('connecting', 'Reintentando conexión'); });
  setTimeout(() => { if (connection === 'connecting' && !navigator.onLine) setConnection('offline', 'Sin internet'); }, 5000);

  function modal(id, contents) {
    const el = document.createElement('div');
    el.className = 'dx-modal'; el.id = id; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="dx-panel"><button type="button" class="dx-close" aria-label="Cerrar">×</button>${contents}</div>`;
    document.body.append(el);
    el.querySelector('.dx-close').onclick = () => close(id);
    el.addEventListener('click', e => { if (e.target === el) close(id); });
    return el;
  }
  function open(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
  function close(id) { document.getElementById(id)?.classList.remove('open'); }
  addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.dx-modal.open').forEach(el => el.classList.remove('open')); });
  const settings = modal('dxSettings', `<img src="logo.png" alt="Darkis Brownies"><h2>Avisos e instalación</h2><p style="font-size:11px">Darkisistema · v22</p><p id="dxConnectionDetail">Comprobando Firebase…</p><label for="dxMode">¿Cómo quieres recibir alertas?</label><select id="dxMode"><option value="all">Todo encendido · avisos del dispositivo</option><option value="daily">Sólo una al día</option><option value="window">Sólo ventana dentro de la app</option><option value="off">Apagadas</option></select><div class="dx-actions"><button type="button" id="dxPermission">Validar permiso</button><button type="button" id="dxTest" class="secondary">Probar aviso</button></div><div class="dx-actions"><button type="button" id="dxInstallFromSettings" class="orange">Instalar app</button></div><div class="dx-note" id="dxPermissionNote">Los avisos de esta versión se revisan mientras la app está abierta. Para recibirlos con la app cerrada hace falta activar el envío push desde Firebase.</div>`);
  const retryRow=document.createElement('div');retryRow.className='dx-actions';const retryButton=document.createElement('button');retryButton.type='button';retryButton.className='secondary';retryButton.textContent='Reintentar conexión';retryButton.onclick=async()=>{retryButton.disabled=true;try{if(window.clockCloud)await window.clockCloud.sync();else await window.darkisSharedSync?.refreshAccess()}finally{retryButton.disabled=false}};retryRow.append(retryButton);settings.querySelector('.dx-panel').append(retryRow);
  const install = modal('dxInstall', `<img src="logo.png" alt="Darkis Brownies"><h2>Darkis en tu celular</h2><p>Instala la app para abrirla desde tu pantalla de inicio y conservar las pantallas disponibles sin conexión.</p><div class="dx-actions"><button type="button" class="orange" id="dxInstallNow">Instalar aplicación</button><button type="button" class="secondary" id="dxMaybeLater">Ahora no</button></div><div class="dx-note" id="dxInstallHelp">Este aviso aparece hasta tres veces en este dispositivo. Siempre puedes instalar desde Ajustes.</div>`);
  install.querySelector('#dxMaybeLater').onclick = () => close('dxInstall');
  const mode = settings.querySelector('#dxMode');
  mode.value = ['all', 'daily', 'window', 'off'].includes(localStorage.getItem(MODE_KEY)) ? localStorage.getItem(MODE_KEY) : 'all';
  mode.addEventListener('change', () => { localStorage.setItem(MODE_KEY, mode.value); settings.querySelector('#dxPermissionNote').textContent = `Preferencia guardada: ${mode.options[mode.selectedIndex].textContent}.`; });
  settings.querySelector('#dxPermission').onclick = async () => {
    const note = settings.querySelector('#dxPermissionNote');
    if (!('Notification' in window) || !isSecureContext) return void (note.textContent = 'Este dispositivo necesita HTTPS y soporte de notificaciones.');
    try {
      const result = await Notification.requestPermission();
      note.textContent = result === 'granted' ? 'Permiso autorizado. Se avisará mientras esta app esté abierta; los avisos con la app cerrada necesitan Firebase Cloud Messaging.' : `Permiso del dispositivo: ${result}. Puedes usar «Sólo ventana» sin ese permiso.`;
    } catch { note.textContent = 'El navegador no permitió solicitar notificaciones.'; }
  };
  settings.querySelector('#dxTest').onclick = () => notify('test-' + Date.now(), 'Prueba de Darkis', 'Así recibirás los avisos en este dispositivo.', true);
  settings.querySelector('#dxInstallFromSettings').onclick = () => { close('dxSettings'); open('dxInstall'); };

  function windowAlert(title, body) {
    document.querySelector('.dx-alert')?.remove();
    const box = document.createElement('div'); box.className = 'dx-alert'; box.setAttribute('role', 'alert');
    const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.textContent = '×'; closeButton.setAttribute('aria-label', 'Cerrar aviso'); closeButton.onclick = () => box.remove();
    const head = document.createElement('strong'); head.textContent = title;
    const detail = document.createElement('span'); detail.textContent = body;
    box.append(closeButton, head, detail); document.body.append(box);
    setTimeout(() => box.remove(), 9000);
  }
  async function notify(key, title, body, test = false) {
    const preference = localStorage.getItem(MODE_KEY) || 'all';
    if (preference === 'off') { if (test) windowAlert('Avisos apagados', 'Activa una opción en Ajustes para probarla.'); return false; }
    const now = Date.now(), day = todayMX();
    if (!test) {
      if (preference === 'daily' && lastAlert.daily === day) return false;
      if (lastAlert[key] && now - lastAlert[key] < (key.startsWith('urgent') ? 60 : 180) * 60_000) return false;
      lastAlert[key] = now; if (preference === 'daily') lastAlert.daily = day;
      lastAlert = Object.fromEntries(Object.entries(lastAlert).filter(([, stamp]) => typeof stamp === 'string' || now - stamp < 8 * 86_400_000));
      localStorage.setItem(SENT_KEY, JSON.stringify(lastAlert));
    }
    if (preference === 'window' || !('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) {
      windowAlert(title, body); return true;
    }
    try { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(Error('worker-timeout')), 5000))]); await reg.showNotification(title, {body, icon:'icon-darkis-original-v15.png', badge:'icon-darkis-original-v15.png', tag:key, renotify:false}); }
    catch { windowAlert(title, body); }
    return true;
  }
  function todayMX() {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Mexico_City', year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part = x => parts.find(p => p.type === x).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function scanAlerts() {
    if (document.visibilityState !== 'visible') return;
    const today = todayMX();
    if (page === 'repartidor' && !document.body.classList.contains('route-locked')) {
      let clients = []; try { clients = JSON.parse(localStorage.getItem('darkis_clientes_v01') || '[]'); } catch {}
      if (!Array.isArray(clients)) return;
      const active = clients.filter(c => c.status !== 'retirado' && c.status !== 'pausado');
      const expired = active.filter(c => c.stockExpiry && c.stockExpiry < today);
      if (expired.length) notify('urgent-expiry-' + today, 'Vuelta urgente · Darkis', `${expired.length} tienda(s) tienen producto caducado: ${expired.slice(0, 3).map(c => c.name).join(', ')}.`);
      else {
        const old = active.filter(c => c.lastAttention && Math.round((new Date(today + 'T12:00:00') - new Date(c.lastAttention + 'T12:00:00')) / 86400000) >= 15);
        if (old.length) notify('attention-' + today, 'Clientes por visitar', `${old.length} tienda(s) llevan al menos 15 días sin atención.`);
      }
    }
    if (page === 'administrador' && !document.body.classList.contains('admin-locked')) {
      const hour = Number(new Intl.DateTimeFormat('en-US', {timeZone:'America/Mexico_City',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
      if (hour < 22) return;
      let sales = []; try { sales = JSON.parse(localStorage.getItem('darkis_v12_contributions') || '[]'); } catch {}
      if (!Array.isArray(sales)) return;
      const paid = sales.filter(s => s.date === today).reduce((sum,s) => sum + Math.max(0, Number(s.paid) || 0), 0);
      if (paid) notify('cut-' + today, 'Corte de rutas · Darkis', `${paid} brownies pagados. A entregar a Darkis: $${(paid * 19).toLocaleString('es-MX')} MXN.`);
    }
    if (page === 'darkita' && document.querySelector('#dashboard.show')) {
      let data; try { data = JSON.parse(localStorage.getItem('darkis_timeclock_v02') || '{}'); } catch {}
      const entries = (data?.records || []).filter(r => r.employeeId && r.timestamp).sort((a,b) => a.timestamp - b.timestamp);
      const name = document.querySelector('#greeting')?.textContent?.replace(/^Bienvenid[oa],\s*/, '');
      const person = (data?.profiles || []).find(p => p.name === name);
      const latest = entries.filter(r => r.employeeId === person?.id).at(-1);
      if (latest?.type === 'entry' && Date.now() - latest.timestamp >= 8 * 3600000)
        notify('shift-' + person.id + '-' + today, 'Turno abierto · Darkita', `${person.name}, tu entrada lleva más de ocho horas abierta. Revisa si necesitas registrar la salida.`);
    }
  }
  addEventListener('storage', e => { if (e.key === MODE_KEY) mode.value = localStorage.getItem(MODE_KEY) || 'all'; if (e.key === 'darkis_clientes_v01' || e.key === 'darkis_v12_contributions') scanAlerts(); });
  addEventListener('darkis-data-updated', scanAlerts);
  document.addEventListener('visibilitychange', scanAlerts);
  setTimeout(scanAlerts, 4000);
  setInterval(scanAlerts, 60_000);

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
  addEventListener('appinstalled', () => { localStorage.setItem(INSTALL_KEY, '3'); close('dxInstall'); });
  async function installNow() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') close('dxInstall');
      deferredPrompt = null;
    } else {
      install.querySelector('#dxInstallHelp').textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'En Safari: toca Compartir y elige «Agregar a pantalla de inicio».' : 'En el menú de tu navegador, elige «Instalar app» o «Agregar a pantalla de inicio». Necesitas abrirla desde HTTPS.';
    }
  }
  install.querySelector('#dxInstallNow').onclick = installNow;
  async function maybeShowInstall() {
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone || sessionStorage.getItem(SEEN_KEY)) return;
    sessionStorage.setItem(SEEN_KEY, '1');
    const count = Math.max(0, Number(localStorage.getItem(INSTALL_KEY)) || 0);
    if (count >= 3) return;
    localStorage.setItem(INSTALL_KEY, String(count + 1));
    open('dxInstall');
  }
  setTimeout(maybeShowInstall, 1800);
  window.DarkisExperience = {notify, setConnection, scanAlerts, openSettings:() => open('dxSettings')};
})();
