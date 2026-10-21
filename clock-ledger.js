/* Horarios: corrección libre, anulación con auditoría y cálculo sin duplicar entradas. */
(() => {
  'use strict';
  const active=rows=>rows.filter(r=>!r.deleted&&Number.isFinite(r.timestamp)&&['entry','exit'].includes(r.type)).slice().sort((a,b)=>a.timestamp-b.timestamp||(a.createdAt||0)-(b.createdAt||0)||String(a.id).localeCompare(String(b.id)));
  function analyze(rows,start,end,includeOpen=true,now=Date.now()){
    let pending=null,total=0;const warnings=[],pairs=[];
    const add=(entry,exit,to)=>{const from=Math.max(start,entry.timestamp),until=Math.min(end,to);if(until>from){total+=until-from;pairs.push({entryId:entry.id,exitId:exit?.id||null,start:from,end:until})}};
    for(const row of active(rows)){
      if(row.timestamp>now)break;
      if(row.type==='entry'){
        if(pending&&pending.timestamp>=start&&pending.timestamp<=end)warnings.push({kind:'entry-without-exit',id:pending.id});
        pending=row;
      }else if(pending){add(pending,row,row.timestamp);pending=null}
      else if(row.timestamp>=start&&row.timestamp<=end)warnings.push({kind:'exit-without-entry',id:row.id});
    }
    if(pending){if(includeOpen)add(pending,null,Math.min(now,end));if(pending.timestamp<=end)warnings.push({kind:'open-shift',id:pending.id})}
    return{hours:total/3600000,warnings,pairs};
  }
  function upsert(rows,input,now=Date.now()){
    if(!input.employeeId||!input.id||!['entry','exit'].includes(input.type)||!Number.isFinite(input.timestamp))throw Error('Completa el movimiento, fecha y hora.');
    if(input.timestamp>now+60000)throw Error('El horario no puede estar en el futuro.');
    const old=rows.find(r=>r.id===input.id);
    if(old&&(old.employeeId!==input.employeeId||old.deleted))throw Error('No se encontró un movimiento editable en este perfil.');
    const reason=String(input.reason||'').trim().slice(0,180);
    let record;
    if(old){
      record={...old,editHistory:[...(old.editHistory||[]),{action:'edit',previousTimestamp:old.timestamp,previousType:old.type,reason,changedAt:now}],type:input.type,timestamp:input.timestamp,manualEdited:true};
      if(!old.manualEdited){record.originalTimestamp=old.timestamp;record.originalType=old.type}
    }else record={id:input.id,employeeId:input.employeeId,employeeName:input.employeeName,type:input.type,timestamp:input.timestamp,manualCreated:true,manualEdited:true,originalTimestamp:null,originalType:null,locationValidation:'manual',insideRadius:false,deviceId:input.deviceId,ownerUid:input.ownerUid||null,createdAt:now,editHistory:[]};
    record.editReason=reason;record.manuallyUpdatedAt=now;record.updatedAt=now;
    return{record,records:old?rows.map(r=>r.id===record.id?record:r):[...rows,record]};
  }
  function remove(rows,id,employeeId,now=Date.now()){
    const old=rows.find(r=>r.id===id&&r.employeeId===employeeId&&!r.deleted);
    if(!old||!(old.manualCreated||old.manualEdited))throw Error('Sólo puedes eliminar movimientos manuales de este perfil.');
    const record={...old,deleted:true,deletedAt:now,updatedAt:now,editHistory:[...(old.editHistory||[]),{action:'delete',previousTimestamp:old.timestamp,previousType:old.type,changedAt:now}]};
    return{record,records:rows.map(r=>r.id===id?record:r)};
  }
  function merge(local,remote,tombstones=true){
    const map=new Map(local.map(r=>[r.id,r]));
    const version=r=>Math.max(r?.updatedAt||0,r?.manuallyUpdatedAt||0,r?.deletedAt||0,r?.createdAt||0);
    for(const incoming of remote){if(!incoming?.id)continue;const old=map.get(incoming.id);if(!old){map.set(incoming.id,incoming);continue}
      if(tombstones&&old.deleted&&!incoming.deleted)continue;
      if(tombstones&&incoming.deleted&&!old.deleted||version(incoming)>version(old))map.set(incoming.id,incoming);
    }
    return[...map.values()];
  }
  window.DarkisLedger={active,analyze,upsert,remove,merge};
})();
