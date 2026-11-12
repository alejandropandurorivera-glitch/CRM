/* Unidades físicas por sabor. Índices 0..6 heredados; 7..11 son minis. */
(() => {
 'use strict';
 const flavors = ['Clásicos','Red velvet','Oreo',"M&M's",'Intenso','Galleta blanca','Galleta amargo','Mini clásico','Mini red velvet','Mini Oreo',"Mini M&M's",'Mini intenso','Protein brownie'];
 const activeIndices=[0,1,2,3,4,5,6,7,12];
 const visibleIndices=q=>flavors.map((_,i)=>i).filter(i=>activeIndices.includes(i)||Number(q?.[i]||0)!==0);
 const zero = () => flavors.map(() => 0);
 const clean = xs => flavors.map((_, i) => Number(xs?.[i] || 0));
 const empty = () => ({factory:zero(),box:zero(),car:zero()});
 const valid = q => Array.isArray(q) && [7,12,flavors.length].includes(q.length) && q.every(n => Number.isInteger(n) && Math.abs(n) <= 100000);
 function productIndex(product){const name=String(product||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^brownie\s+/,'').trim(),aliases={clasico:0,clasicos:0,'red velvet':1,oreo:2,'m&m':3,"m&m's":3,'m&ms':3,intenso:4};const exact=flavors.indexOf(product);return exact>=0?exact:aliases[name]??-1}
 function lines(items){const q=zero();for(const item of items||[]){const i=productIndex(item.product);if(i<0&&Number(item.qty)>0)throw Error('Hay sabores sin identificar. Corrige los dejados antes de descontar inventario.');if(i>=0)q[i]+=Number(item.qty)||0}if(!valid(q)||q.some(n=>n<0))throw Error('Revisa las cantidades por sabor.');return q}
 function production(r) {
  const out = empty();
  if (r.deleted) return out;
  for (let i = 0; i < 6; i++) {
   const minis = i<5?Number(r.miniPacked?.[i] || 0):0;
   const stockIndex=i===5?12:i;
   if (!Number.isInteger(minis) || minis < 0 || minis % 2) throw Error('Empaca los minis de dos en dos: cada brownie completo produce dos minis.');
   out.factory[stockIndex] = (r.trays?.[i] || 0) * r.piecesPerTray - minis / 2 - ['waste','seminar','trash','cookieInputs'].reduce((n,k) => n + Number(r[k]?.[i] || 0), 0);
   if(i<5)out.factory[7+i] = minis - ['miniWaste','miniSeminar','miniTrash','miniCookieInputs'].reduce((n,k) => n + Number(r[k]?.[i] || 0), 0);
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
   const shortage=next[loc].findIndex(n=>n<0);if(shortage>=0)throw Error('No alcanza '+flavors[shortage]+' en '+({factory:'fábrica',box:'la caja',car:'la caja'}[loc])+': hay '+clean(balance[loc])[shortage]+' y salen '+Math.abs(change[shortage])+'. La captura sigue pendiente.');
   if(next[loc].some(n=>!Number.isInteger(n)||n>100000))throw Error('El saldo debe ser entero, de 0 a 100,000 piezas por producto.');
  }
  return next;
 }
 function settlement(grossCents,debts) {let remaining=grossCents;const allocations=[];for(const d of debts){const cents=Math.min(remaining,d.availableCents);if(cents>0){allocations.push({id:d.id,cents,description:d.description||'',employeeId:d.employeeId});remaining-=cents}}return{allocations,deductionCents:grossCents-remaining,netCents:remaining};}
 const equivalent = quantities => clean(quantities).reduce((n,q,i)=>n+q*(i>=7&&i<=11?.5:1),0);
 window.DarkisInventoryModel={flavors,productIndex,activeIndices,visibleIndices,zero,empty,clean,valid,lines,production,sale,subtract,apply,settlement,equivalent};
})();

/* Precios de retiro congelados en cada movimiento, independientes de futuras vigencias. */
(()=>{const M=window.DarkisInventoryModel;
M.withdrawalPrices=(date='')=>M.flavors.map((_,i)=>i===12?3100:i>=7?1200:i>=5?1900:String(date)>='2026-11-02'?2100:1900);
M.originalPrices=w=>M.flavors.map((_,i)=>Array.isArray(w.unitCents)&&Number.isInteger(w.unitCents[i])?w.unitCents[i]:i===12?3100:i>=7?1200:Math.round(Number(w.unitPrice||19)*100));
M.withdrawalAmount=w=>M.clean(w.quantities).reduce((n,q,i)=>n+q*M.originalPrices(w)[i],0)+Number(w.otherCents||0);
})();
