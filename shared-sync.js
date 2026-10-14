/* Sincronización de las áreas Darkis. Funciona sólo después de desplegar
   la función darkisPinLogin y las reglas incluidas en este paquete. */
(() => {
  'use strict';
  const CONFIG = {
    apiKey: 'AIzaSyAzpjktTdrIBt-I89ZX98icGEMmhluXlo8',
    authDomain: 'darkis-brownies.firebaseapp.com',
    projectId: 'darkis-brownies',
    storageBucket: 'darkis-brownies.firebasestorage.app',
    messagingSenderId: '66959378357',
    appId: '1:66959378357:web:a059509bea57560a243bfc'
  };
  const PREFIX = 'https://www.gstatic.com/firebasejs/12.19.0/';
  const QUEUE = 'darkis_v12_sync_queue';
  const CONTRIBUTIONS = 'darkis_v12_contributions';
  let role = sessionStorage.getItem('darkis_suite_role_v12') || '';
  let profileId = sessionStorage.getItem('darkis_socio_profile_v12') || '';
  let auth, db, functions, sdk, currentUser, syncing = false, flushTimer;
  let unsubscribers = [];
  let pending = null;

  function announce(state, detail) {
    dispatchEvent(new CustomEvent('darkis-sync-status', {detail: {state, detail}}));
    const node = document.querySelector('[data-darkis-cloud-status]');
    if (node) node.textContent = detail;
  }
  function safeArray(key) {
    try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; }
    catch { return []; }
  }
  function saveQueue(queue) { localStorage.setItem(QUEUE, JSON.stringify(queue)); }
  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 180);
  }
  function operationId() { return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now(); }
  function pathKey(parts) { return parts.join('/'); }
  function queueSet(parts, data, targetRole = role, targetProfile = profileId) {
    if (!parts.every(x => typeof x === 'string' && x.length && x.length < 240)) return;
    const key = pathKey(parts);
    const queue = safeArray(QUEUE).filter(x => x.key !== key);
    queue.push({key, opId: operationId(), parts, data: JSON.parse(JSON.stringify(data)), operation: 'set', role: targetRole, profileId: targetProfile});
    saveQueue(queue);
    scheduleFlush();
  }
  function queueDelete(parts, targetRole = role, targetProfile = profileId) {
    const key = pathKey(parts);
    const queue = safeArray(QUEUE).filter(x => x.key !== key);
    queue.push({key, opId: operationId(), parts, operation: 'delete', role: targetRole, profileId: targetProfile});
    saveQueue(queue);
    scheduleFlush();
  }
  function profileOf(item) { return String(item.actorProfileId || item.profileId || profileId || ''); }
  function asContribution(sale) {
    const saved = safeArray(CONTRIBUTIONS).find(x => x.id === sale.id);
    if (saved) return saved;
    const items = Array.isArray(sale.items) ? sale.items : [];
    return {
      id: sale.id, actorProfileId: profileOf(sale), actorName: sale.actorName || sale.sellerName || '',
      customerName: sale.customerName || '', date: sale.date || '',
      paid: Number(sale.paid) || items.reduce((sum, x) => sum + (Number(x.qty) || 0), 0),
      removed: [], delivered: [], unitPrice: Number(sale.unitPrice) || 23,
      total: Number(sale.total) || 0, source: 'Darkisocio', items,
      createdAt: sale.createdAt || new Date().toISOString()
    };
  }
  function mergeContributions(remote) {
    const map = new Map(safeArray(CONTRIBUTIONS).map(x => [x.id, x]));
    for (const item of remote) if (item?.id) map.set(item.id, item);
    const merged = [...map.values()];
    localStorage.setItem(CONTRIBUTIONS, JSON.stringify(merged));
    dispatchEvent(new Event('darkis-data-updated'));
  }
  function listen(path, handler, ownOnly = false) {
    const base = sdk.collection(db, ...path);
    const source = ownOnly ? sdk.query(base, sdk.where('ownerUid', '==', currentUser.uid)) : base;
    unsubscribers.push(sdk.onSnapshot(source, snapshot => {
      handler(snapshot.docs.map(d => d.data()?.data).filter(Boolean));
    }, error => announce('error', 'No se pudieron leer los datos en Firebase: ' + error.code)));
  }
  function subscribe() {
    unsubscribers.forEach(fn => fn());
    unsubscribers = [];
    if (!currentUser) return;
    if (role === 'admin') {
      listen(['routeContributions'], mergeContributions);
      listen(['timeclockEmployees'], devices => {
        dispatchEvent(new CustomEvent('darkis-clock-data', {detail: devices}));
      });
      return;
    }
    if (role === 'route') {
      listen(['routeClients'], clients => window.darkisRouteCloudApply?.({clients}), true);
      return;
    }
    if (role === 'socio' && profileId) {
      let clients = [], sales = [];
      const update = () => window.darkisSocioCloudApply?.({clients, sales});
      listen(['socioProfiles', profileId, 'clients'], values => {clients = values; update()}, true);
      listen(['socioProfiles', profileId, 'sales'], values => {sales = values; update()}, true);
    }
  }
  async function flush() {
    if (syncing || !currentUser || !db || !navigator.onLine) return;
    syncing = true;
    let failed = false;
    try {
      for (const item of safeArray(QUEUE)) {
        if (item.role !== role || (role === 'socio' && item.profileId !== profileId)) continue;
        const target = sdk.doc(db, ...item.parts);
        try {
          if (item.operation === 'delete') await sdk.deleteDoc(target);
          else await sdk.setDoc(target, {
            ownerUid: currentUser.uid, data: item.data, updatedAt: sdk.serverTimestamp()
          });
          saveQueue(safeArray(QUEUE).filter(x => x.opId !== item.opId));
        } catch (error) {
          failed = true;
          announce('error', 'Hay cambios pendientes de sincronizar.');
          break;
        }
      }
      if (!safeArray(QUEUE).some(x => x.role === role)) announce('online', 'Sincronizado');
    } finally {
      syncing = false;
      if (!failed && safeArray(QUEUE).some(x => x.role === role && (role !== 'socio' || x.profileId === profileId))) scheduleFlush();
    }
  }
  const api = {
    saveRouteClient(client) {
      if (!client?.id) return;
      queueSet(['routeClients', client.id], client, 'route', '');
    },
    deleteRouteClient(id) {
      if (id) queueDelete(['routeClients', id], 'route', '');
    },
    saveRouteContribution(item) {
      if (!item?.id) return;
      queueSet(['routeContributions', item.id], item, 'route', '');
    },
    saveSocioClient(client) {
      const id = profileOf(client);
      if (id && client?.id) queueSet(['socioProfiles', id, 'clients', client.id], client, 'socio', id);
    },
    saveSocioSale(sale) {
      const id = profileOf(sale);
      if (!id || !sale?.id) return;
      queueSet(['socioProfiles', id, 'sales', sale.id], sale, 'socio', id);
      queueSet(['routeContributions', sale.id], asContribution(sale), 'socio', id);
    },
    async login(roleValue, pin, selectedProfile = '') {
      if (!functions || !auth) throw Error('Firebase todavía no está disponible.');
      const request = sdk.httpsCallable(functions, 'darkisPinLogin');
      const result = await request({role: roleValue === 'socio' ? 'route' : roleValue, pin, profileId: selectedProfile});
      await sdk.signInWithCustomToken(auth, result.data.token);
      return true;
    },
    async activate(roleValue, pin, selectedProfile = '') {
      role = roleValue;
      profileId = selectedProfile || '';
      sessionStorage.setItem('darkis_suite_role_v12', roleValue);
      if (roleValue === 'socio') sessionStorage.setItem('darkis_socio_profile_v12', profileId);
      pending = {role: roleValue, pin, profileId};
      sessionStorage.setItem('darkis_pin_pending_v12', JSON.stringify(pending));
      if (!functions || !auth) return false;
      sessionStorage.removeItem('darkis_pin_pending_v12');
      try {
        await api.login(roleValue, pin, profileId);
        pending = null;
        return true;
      } catch {
        announce('local', 'Guardado localmente; conexión Firebase pendiente.');
        return false;
      }
    },
    async deactivate() {
      role = '';
      profileId = '';
      pending = null;
      unsubscribers.forEach(fn => fn());
      unsubscribers = [];
      sessionStorage.removeItem('darkis_pin_pending_v12');
      sessionStorage.removeItem('darkis_suite_role_v12');
      sessionStorage.removeItem('darkis_socio_profile_v12');
      if (auth) await sdk.signOut(auth);
      currentUser = null;
      announce('local', 'Perfil cerrado en este dispositivo.');
    },
    syncNow: flush,
    get status() { return currentUser ? 'online' : 'local'; }
  };
  window.darkisSharedSync = api;
  async function init() {
    try {
      const [appLib, authLib, firestoreLib, functionsLib] = await Promise.all([
        import(PREFIX + 'firebase-app.js'),
        import(PREFIX + 'firebase-auth.js'),
        import(PREFIX + 'firebase-firestore.js'),
        import(PREFIX + 'firebase-functions.js')
      ]);
      sdk = {...authLib, ...firestoreLib, ...functionsLib};
      const app = appLib.initializeApp(CONFIG, 'darkis-shared-v12');
      auth = authLib.getAuth(app);
      try {
        db = firestoreLib.initializeFirestore(app, {
          localCache: firestoreLib.persistentLocalCache({
            tabManager: firestoreLib.persistentMultipleTabManager()
          })
        });
      } catch { db = firestoreLib.getFirestore(app); }
      functions = functionsLib.getFunctions(app, 'us-central1');
      await authLib.setPersistence(auth, authLib.browserLocalPersistence);
      authLib.onAuthStateChanged(auth, async user => {
        currentUser = user;
        if (user) {
          const claims = (await user.getIdTokenResult()).claims;
          if (claims.role !== role || (role === 'socio' && claims.profileId !== profileId)) {
            currentUser = null;
            subscribe();
            return;
          }
          subscribe();
          flush();
          announce('online', 'Sincronizado');
        } else {
          subscribe();
          announce('local', 'Guardado en este dispositivo');
        }
      });
      try {
        const raw = sessionStorage.getItem('darkis_pin_pending_v12');
        sessionStorage.removeItem('darkis_pin_pending_v12');
        if (raw) pending = JSON.parse(raw);
        if (pending?.role === role) {
          if (pending.profileId) profileId = pending.profileId;
          await api.login(pending.role, pending.pin, pending.profileId || '');
          pending = null;
        }
      } catch (error) {
        announce('local', 'Guardado localmente; conexión Firebase pendiente.');
      }
    } catch {
      announce('local', 'Guardado localmente; sin conexión Firebase.');
    }
  }
  addEventListener('online', () => {
    if (pending && functions && auth) api.login(pending.role, pending.pin, pending.profileId || '').then(() => {pending = null; flush()}).catch(() => {});
    else flush();
  });
  init();
})();
