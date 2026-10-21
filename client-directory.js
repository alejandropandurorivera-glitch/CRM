/* Bajas sincronizables: los históricos importados y teléfonos viejos no reviven un cliente. */
(()=>{'use strict';const KEY='darkis_client_deletions_v25';const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
function ingest(rows){const saved=read();let changed=false;for(const row of rows||[])if(row?.id&&row.deleted){const old=saved[row.id];if(!old||String(row.updatedAt||'')>String(old.updatedAt||'')){saved[row.id]=row;changed=true}}if(changed)localStorage.setItem(KEY,JSON.stringify(saved));return saved}
const isDeleted=id=>Boolean(read()[id]);
function filter(rows){ingest(rows);const removed=read();return rows.filter(row=>!row.deleted&&!removed[row.id])}
function remove(client){const date=new Date().toISOString(),row={...client,deleted:true,deletedAt:date,updatedAt:date};ingest([row]);window.darkisSharedSync?.saveRouteClient?.(row);return row}
window.DarkisClientDirectory={filter,ingest,isDeleted,remove,snapshot:()=>Object.values(read())};
})();
