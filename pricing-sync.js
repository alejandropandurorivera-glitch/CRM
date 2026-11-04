/* Correcciones de vigencia sobre la última versión del servidor, sin reemplazar ventas concurrentes. */
(() => {
  'use strict';
  const inFlight = new Set();
  let owner='', latestContributions=[];
  const serverClients=new Map();
  const stamp=value=>typeof value==='number'?value:Date.parse(value)||0;
  function mergeClient(previous,incoming){
    if(!previous)return correctClient(incoming);
    const base=stamp(previous.updatedAt)>stamp(incoming.updatedAt)?{...incoming,...previous}:{...previous,...incoming};
    const sales=new Map((previous.sales||[]).map(s=>[s.id,s]));
    for(const sale of incoming.sales||[]){const old=sales.get(sale.id);if(!old||stamp(sale.updatedAt||sale.createdAt)>=stamp(old.updatedAt||old.createdAt))sales.set(sale.id,sale);}
    return correctClient({...base,sales:[...sales.values()]});
  }
  function correctClient(client) {
    const P = window.DarkisPricing;
    if (!P || !Array.isArray(client?.sales)) return client;
    let changed = false;
    const sales = client.sales.map(sale => {
      const next = P.repriceContribution(sale, client);
      changed ||= next !== sale;
      return next;
    });
    return changed ? {...client, sales, pricingVersion:30, updatedAt:new Date().toISOString()} : client;
  }
  async function reconcile(context, collection, rows) {
    if (!context?.user || !['admin','route'].includes(context.role) || !window.DarkisPricing) return;
    const {sdk, db, user, role} = context;
    if(owner!==user.uid){owner=user.uid;serverClients.clear();latestContributions=[];}
    if(collection==='routeClients')for(const raw of rows)if(raw?.data)serverClients.set(raw.id,raw.data);
    if(collection==='routeContributions')latestContributions=rows;
    const jobs = rows.filter(raw => raw?.id && raw.data &&
      (collection === 'routeClients' || role === 'admin' || raw.ownerUid === user.uid));
    // Una cola corta evita abrir cientos de transacciones a la vez durante el arranque.
    for (const raw of jobs) {
      const initial = collection === 'routeClients' ? correctClient(raw.data) :
        window.DarkisPricing.repriceContribution(raw.data, clientFor(raw.data));
      if (initial === raw.data) continue;
      const key = user.uid+'|'+collection+'|'+raw.id;
      if (inFlight.has(key)) continue;
      inFlight.add(key);
      try {
        await sdk.runTransaction(db, async tx => {
          const ref = sdk.doc(db, collection, raw.id), snap = await tx.get(ref);
          if (!snap.exists()) return;
          const latest = snap.data();
          if (collection === 'routeContributions' && role !== 'admin' && latest.ownerUid !== user.uid) return;
          let client=clientFor(latest.data);
          if(collection==='routeContributions'&&latest.data.customerId){
            const currentClient=await tx.get(sdk.doc(db,'routeClients',latest.data.customerId));
            if(currentClient.exists())client=currentClient.data().data;
          }
          const next = collection === 'routeClients' ? correctClient(latest.data) :
            window.DarkisPricing.repriceContribution(latest.data, client);
          if (next !== latest.data) tx.set(ref, {...latest, data:next, updatedAt:sdk.serverTimestamp()});
        });
        dispatchEvent(new CustomEvent('darkis-pricing-sync', {detail:{state:'synced', collection, id:raw.id}}));
      } catch (error) {
        dispatchEvent(new CustomEvent('darkis-pricing-sync', {detail:{state:'pending', collection, id:raw.id,
          code:error.code||'', message:error.message||'No se pudo actualizar la vigencia.'}}));
      } finally { inFlight.delete(key); }
    }
    if(collection==='routeClients'&&latestContributions.length)reconcile(context,'routeContributions',latestContributions);
  }
  function clientFor(sale) {
    let clients=[];
    try { clients=JSON.parse(localStorage.getItem('darkis_clientes_v01')||'[]'); } catch {}
    return serverClients.get(sale.customerId)||[...serverClients.values(),...(Array.isArray(clients)?clients:[])].find(c => c.id === sale.customerId ||
      window.DarkisPricing.norm(c.name) === window.DarkisPricing.norm(sale.customerName)) ||
      {name:sale.customerName||sale.route||''};
  }
  window.DarkisPricingSync={correctClient,mergeClient,reconcile};
})();
