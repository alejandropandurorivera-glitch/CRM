/* El historial nunca se elimina por inactividad. Fechas de calendario de México. */
(() => {
 'use strict';
 const iso=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function dayNumber(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const [y,m,d]=value.split('-').map(Number),ms=Date.UTC(y,m-1,d);return new Date(ms).toISOString().slice(0,10)===value?ms/86400000:null}
 const age=(date,today=iso())=>{const a=dayNumber(date),b=dayNumber(today);return a===null||b===null?null:Math.max(0,b-a)};
 const plus=(date,n)=>new Date((dayNumber(date)+n)*86400000).toISOString().slice(0,10);
 function apply(clients,today=iso()) {const changed=[];const rows=clients.map(c=>{const days=age(c.lastAttention,today);if(c.status!=='activo'||days===null||days<=100||c.inactivityOverrideUntil&&c.inactivityOverrideUntil>=today)return c;const row={...c,status:'pausado',inactivityReview:{state:'pending',reason:'Más de 100 días sin atención',lastAttention:c.lastAttention,daysAtPause:days,pausedOn:today},updatedAt:new Date().toISOString()};changed.push(row);return row});return{clients:rows,changed}}
 function review(client,action,today=iso()){if(!['keep','activate'].includes(action))throw Error('Acción inválida');return {...client,status:action==='activate'?'activo':'pausado',inactivityOverrideUntil:action==='activate'?plus(today,7):'',inactivityReview:{...client.inactivityReview,state:'reviewed',reviewedOn:today,action},updatedAt:new Date().toISOString()}}
 window.DarkisClientPolicy={today:iso,age,apply,review};
})();
