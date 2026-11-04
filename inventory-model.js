/* Unidades físicas por sabor. Índices 0..6 heredados; 7..11 son minis. */
(() => {
 'use strict';
 const flavors = ['Clásicos','Red velvet','Oreo',"M&M's",'Intenso','Galleta blanca','Galleta amargo','Mini clásico','Mini red velvet','Mini Oreo',"Mini M&M's",'Mini intenso'];
 const zero = () => flavors.map(() => 0);
 const clean = xs => flavors.map((_, i) => Number(xs?.[i] || 0));
 const empty = () => ({factory:zero(),box:zero(),car:zero()});
 const valid = q => Array.isArray(q) && [7,flavors.length].includes(q.length) && q.every(n => Number.isInteger(n) && Math.abs(n) <= 100000);
 function lines(items) {
  const q = zero();
  for (const item of items || []) {
   const i = flavors.indexOf(item.product);
   if (i < 0 && Number(item.qty) > 0) throw Error('Hay sabores sin identificar. Corrige los dejados antes de descontar inventario.');
   if (i >= 0) q[i] += Number(item.qty) || 0;
  }
  if (!valid(q) || q.some(n => n < 0)) throw Error('Revisa las cantidades por sabor.');
  return q;
 }
 function production(r) {
  const out = empty();
  if (r.deleted) return out;
  for (let i = 0; i < 5; i++) {
   const minis = Number(r.miniPacked?.[i] || 0);
   if (!Number.isInteger(minis) || minis < 0 || minis % 2) throw Error('Empaca los minis de dos en dos: cada brownie completo produce dos minis.');
   out.factory[i] = (r.trays?.[i] || 0) * r.piecesPerTray - minis / 2 - ['waste','seminar','trash','cookieInputs'].reduce((n,k) => n + Number(r[k]?.[i] || 0), 0);
   out.factory[7+i] = minis - ['miniWaste','miniSeminar','miniTrash','miniCookieInputs'].reduce((n,k) => n + Number(r[k]?.[i] || 0), 0);
  }
  out.factory[5] = r.cookiesWhite || 0;
  out.factory[6] = r.cookiesDark || 0;
  if (!valid(out.factory)) throw Error('Revisa las cantidades del movimiento de producción.');
  return out;
 }
 function sale(r, location='box') {const d=empty();d[location]=lines(r.delivered).map(n=>-n);return d;}
 function subtract(a,b) {return Object.fromEntries(['factory','box','car'].map(k=>[k,clean(a[k]).map((n,i)=>n-clean(b[k])[i])]));}
 function apply(balance,delta) {
  const next={};
  for (const loc of ['factory','box','car']) {
   const change=clean(delta[loc]);
   if (!valid(change)) throw Error('Movimiento inválido.');
   next[loc]=clean(balance[loc]).map((n,i)=>n+change[i]);
   if (next[loc].some(n=>!Number.isInteger(n)||n<0||n>100000)) throw Error('Inventario insuficiente en '+({factory:'fábrica',box:'la caja para ruta',car:'la caja'}[loc])+'. Revisa la existencia inicial o las cantidades.');
  }
  return next;
 }
 function settlement(grossCents,debts) {let remaining=grossCents;const allocations=[];for(const d of debts){const cents=Math.min(remaining,d.availableCents);if(cents>0){allocations.push({id:d.id,cents,description:d.description||'',employeeId:d.employeeId});remaining-=cents}}return{allocations,deductionCents:grossCents-remaining,netCents:remaining};}
 const equivalent = quantities => clean(quantities).reduce((n,q,i)=>n+q*(i>=7?.5:1),0);
 window.DarkisInventoryModel={flavors,zero,empty,clean,valid,lines,production,sale,subtract,apply,settlement,equivalent};
})();

/* Precios de retiro congelados en cada movimiento, independientes de futuras vigencias. */
(()=>{const M=window.DarkisInventoryModel;
M.withdrawalPrices=(date='')=>M.flavors.map((_,i)=>i>=7?1200:i>=5?1900:String(date)>='2026-11-02'?2100:1900);
M.originalPrices=w=>M.flavors.map((_,i)=>Array.isArray(w.unitCents)&&Number.isInteger(w.unitCents[i])?w.unitCents[i]:i>=7?1200:Math.round(Number(w.unitPrice||19)*100));
M.withdrawalAmount=w=>M.clean(w.quantities).reduce((n,q,i)=>n+q*M.originalPrices(w)[i],0)+Number(w.otherCents||0);
})();
