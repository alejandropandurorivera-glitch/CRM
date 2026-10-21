/* Importación idempotente: IDs estables, no sustituye las capturas posteriores del equipo. */
(() => {
 'use strict';const H=window.DarkisHistory;if(!H)return;
 const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const active=H.visits.filter(x=>!x.pendingDuplicate&&!x.unconfirmed);
 function mergeRoute(existing){const clients=existing.map(c=>({...c,sales:[...(c.sales||[])]}));
  for(const row of active){let client=clients.find(c=>c.id===row.customerId)||clients.find(c=>norm(c.name)===norm(row.customerName));if(!client){client={id:row.customerId,name:row.customerName,city:row.city,status:'activo',notes:'Importado de notas 2026',maps:'',contact:'',phone:'',address:'',sales:[],lastAttention:'',stockExpiry:'',createdAt:row.createdAt,updatedAt:row.updatedAt};clients.push(client)}
   if(!client.sales.some(s=>s.id===row.id)){
    const same=client.sales.find(s=>s.date===row.date&&!s.id?.startsWith('hist22-')&&Number(s.paid)===row.paid&&Number(s.removedTotal??s.removed?.reduce((n,x)=>n+(Number(x.qty)||0),0))===row.removedTotal);
    if(!same)client.sales.push({id:row.id,date:row.date,paid:row.paid,removedTotal:row.removedTotal,deliveredTotal:row.deliveredTotal,removed:row.removed,delivered:row.delivered,notes:row.notes,source:row.source,createdAt:row.createdAt});
   }
   if(!client.lastAttention||client.lastAttention<row.date)client.lastAttention=row.date;
   if((row.notes.includes('SHUTDOWN')||row.notes.includes('cierre SHUTDOWN'))&&!active.some(x=>x.customerId===row.customerId&&x.date>row.date&&(x.paid>0||x.deliveredTotal>0)))client.status='retirado';
  }return clients;
 }
 function contributions(){const rows=new Map(active.map(x=>[x.id,x]));for(const x of read('darkis_v12_contributions'))rows.set(x.id,x);return [...rows.values()]}
 function finance(db){db.historyImportAudit=db.historyImportAudit||{version:22,expenseMatches:[],routeSettlements:[],pending:H.pendingExpenses};
  // Liquidaciones a $19 son transferencias entre distribuidor y negocio; no una segunda venta al público.
  const original=db.sales.filter(x=>x.channel==='Venta Ruta'&&x.source==='Excel'&&x.unitPrice===19);
  for(const row of original)if(!db.historyImportAudit.routeSettlements.some(x=>x.id===row.id))db.historyImportAudit.routeSettlements.push(row);
  const archived=new Set(db.historyImportAudit.routeSettlements.map(x=>x.id));db.sales=db.sales.filter(x=>!archived.has(x.id));
  for(const row of H.expenses){if(db.expenses.some(x=>x.id===row.id))continue;const match=db.expenses.find(x=>x.date===row.date&&Number(x.amount)===row.amount&&!x.id?.startsWith('hist22-'));
   if(match){if(!db.historyImportAudit.expenseMatches.some(x=>x.id===row.id))db.historyImportAudit.expenseMatches.push({...row,matchedId:match.id,review:'Mismo día e importe: conservado una sola vez; confirmar concepto con comprobante'});continue}db.expenses.push(row)}
  for(const row of H.cashMoves)if(!db.cashMoves.some(x=>x.id===row.id))db.cashMoves.push({...row,note:row.concept+'. '+row.note});
  db.catalogs.routes=[...new Set([...db.catalogs.routes,...active.map(x=>x.customerName)])];return db;
 }
 window.DarkisHistoryTools={mergeRoute,finance,active,read,contributions};
})();
