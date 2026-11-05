/* Firebase Spark: Google + permisos guardados en Firestore. No usa Functions. */
(() => {
  'use strict';
  const CONFIG={apiKey:'AIzaSyAzpjktTdrIBt-I89ZX98icGEMmhluXlo8',authDomain:'darkis-brownies.firebaseapp.com',projectId:'darkis-brownies',storageBucket:'darkis-brownies.firebasestorage.app',messagingSenderId:'66959378357',appId:'1:66959378357:web:a059509bea57560a243bfc'};
  const PREFIX='https://www.gstatic.com/firebasejs/12.19.0/',QUEUE='darkis_v12_sync_queue',CONTRIBUTIONS='darkis_v12_contributions';
  let role=document.body.dataset.darkisPage==='administrador'?'admin':sessionStorage.getItem('darkis_suite_role_v12')||'',profileId=role==='socio'?sessionStorage.getItem('darkis_socio_profile_v12')||'':'';
  let sdk,auth,db,currentUser=null,grant=null,syncing=false,flushTimer,lastServerAck=0,checkingSince=Date.now(),generation=0;
  let unsubscribers=[],accessUnsubscribe=null,payrollRefreshPromise=null;const payrollServerSeen=new Set();
  function payrollState(name,state,error=''){window.darkisPayrollReadState={...(window.darkisPayrollReadState||{}),[name]:{state,error,at:Date.now()}};dispatchEvent(new CustomEvent('darkis-payroll-read-state',{detail:window.darkisPayrollReadState}))}
  function publishPayroll(name,rows){if(name==='payrollRequests')window.darkisPayrollRemoteRequests=rows;else window.darkisPayrollRemotePayments=rows;dispatchEvent(new CustomEvent(name==='payrollRequests'?'darkis-payroll-requests':'darkis-payroll-payments',{detail:rows}))}
  let accountState={state:'loading',role,profileId};
  const safeArray=key=>{try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:[]}catch{return[]}};
  const timeout=(promise,ms=15000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),ms))]);
  function announce(state,detail){if(state==='online')lastServerAck=Date.now();if(state==='connecting')checkingSince=Date.now();window.darkisSyncStatus={state,detail};dispatchEvent(new CustomEvent('darkis-sync-status',{detail:window.darkisSyncStatus}));document.querySelectorAll('[data-darkis-cloud-status]').forEach(node=>node.textContent=detail)}
  function accessState(state,message=''){const user=auth?.currentUser;accountState={state,message,role,profileId,uid:user?.uid||'',email:user?.email||'',name:user?.displayName||'',grant};window.darkisAccessState=accountState;dispatchEvent(new CustomEvent('darkis-access-state',{detail:accountState}))}
  function clearSubscriptions(){unsubscribers.forEach(fn=>fn());unsubscribers=[]}
  function canUse(permission,area,profile){if(!permission||permission.enabled!==true)return false;if(permission.role==='admin')return true;return permission.role===area&&(area!=='socio'||permission.profileId===profile)}
  function isGoogle(user){return !!user?.providerData?.some(p=>p.providerId==='google.com')}
  function saveQueue(queue){localStorage.setItem(QUEUE,JSON.stringify(queue))}
  function scheduleFlush(){clearTimeout(flushTimer);flushTimer=setTimeout(flush,180)}
  function queueOperation(parts,data,operation,targetRole,targetProfile=''){
    if(!parts.every(x=>typeof x==='string'&&x.length&&x.length<240))return;
    const key=parts.join('/'),queue=safeArray(QUEUE).filter(x=>x.key!==key);
    queue.push({key,opId:crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now(),parts,data:data===undefined?null:JSON.parse(JSON.stringify(data)),operation,role:targetRole,profileId:targetProfile});saveQueue(queue);scheduleFlush();
  }
  function publishRouteContext(value){window.darkisRouteContext=value;dispatchEvent(new CustomEvent('darkis-route-context',{detail:value}))}
  function profileOf(item){return String(item.actorProfileId||item.profileId||profileId||'')}
  function asContribution(sale){const saved=safeArray(CONTRIBUTIONS).find(x=>x.id===sale.id);if(saved)return saved;const items=Array.isArray(sale.items)?sale.items:[];return{...sale,actorProfileId:profileOf(sale),paid:Number(sale.paid)||items.reduce((n,x)=>n+(Number(x.qty)||0),0),removed:[],delivered:[],source:'Darkisocio',items}}
  function mergeContributions(remote){const rows=new Map(safeArray(CONTRIBUTIONS).map(x=>[x.id,x]));for(const item of remote)if(item?.id){const old=rows.get(item.id);if(!old||String(item.updatedAt||item.createdAt)>=String(old.updatedAt||old.createdAt))rows.set(item.id,item);}localStorage.setItem(CONTRIBUTIONS,JSON.stringify([...rows.values()]));dispatchEvent(new Event('darkis-data-updated'));dispatchEvent(new CustomEvent('darkis-route-contributions-data',{detail:[...rows.values()]}))}
  function listen(path,handler){const uid=currentUser?.uid;unsubscribers.push(sdk.onSnapshot(sdk.collection(db,...path),{includeMetadataChanges:true},snapshot=>{
    if(currentUser?.uid!==uid)return;
    if(path[0]==='payrollRequests'||path[0]==='payrollPayments'){const name=path[0],cache=snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites;if(cache&&payrollServerSeen.has(uid+'__'+name))return;if(!cache)payrollServerSeen.add(uid+'__'+name);payrollState(name,cache?'cache':'server')}
    if(!snapshot.metadata.fromCache)announce('online','Firebase conectado');
    if(!snapshot.metadata.fromCache&&['routeClients','routeContributions'].includes(path[0]))window.DarkisPricingSync?.reconcile({sdk,db,user:currentUser,role},path[0],snapshot.docs.map(doc=>({id:doc.id,...doc.data()})));
    const rows=snapshot.docs.map(doc=>doc.data()?.data).filter(Boolean);if(path[0]==='payrollRequests')window.darkisPayrollRemoteRequests=rows;if(path[0]==='payrollPayments')window.darkisPayrollRemotePayments=rows;if(path[0]==='routeClients')window.DarkisClientDirectory?.ingest(rows);handler(rows);
  },error=>{if(currentUser?.uid!==uid)return;if(path[0]==='payrollRequests'||path[0]==='payrollPayments')payrollState(path[0],'error',error.code||error.message);announce('offline','No se pudieron leer los datos: '+error.code)}))}
  function subscribe(){clearSubscriptions();if(!currentUser)return;if(role==='admin'||role==='route'){listen(['routeOrders'],rows=>dispatchEvent(new CustomEvent('darkis-route-orders',{detail:rows})));}if(role==='admin'||role==='route')listen(['routeReceipts'],rows=>dispatchEvent(new CustomEvent('darkis-route-receipts',{detail:rows})));if(role==='admin'||role==='route')listen(['routeSchedules'],rows=>dispatchEvent(new CustomEvent('darkis-route-schedules-data',{detail:rows})));
    if(role==='admin'){listen(['payrollRequests'],rows=>dispatchEvent(new CustomEvent('darkis-payroll-requests',{detail:rows})));listen(['payrollPayments'],rows=>dispatchEvent(new CustomEvent('darkis-payroll-payments',{detail:rows})));listen(['routeExpenses'],rows=>dispatchEvent(new CustomEvent('darkis-route-expenses',{detail:rows})));listen(['routeClients'],rows=>dispatchEvent(new CustomEvent('darkis-route-clients-data',{detail:rows})));listen(['routeContributions'],mergeContributions);listen(['timeclockEmployees'],devices=>dispatchEvent(new CustomEvent('darkis-clock-data',{detail:devices})));unsubscribers.push(sdk.onSnapshot(sdk.collection(db,'productionRecords'),snapshot=>{window.darkisProductionCloudDetail=snapshot.metadata?.fromCache?'Mostrando copia local de producción.':'Producción recibida de Firebase.';dispatchEvent(new CustomEvent('darkis-production-data',{detail:snapshot.docs.map(x=>x.data().data).filter(Boolean)}))},error=>{window.darkisProductionCloudDetail='No se pudo leer producción: '+error.code+'. Publica las reglas v22.';dispatchEvent(new CustomEvent('darkis-production-data',{detail:[]}))}));return}
    if(role==='route'){listen(['routeClients'],clients=>window.darkisRouteCloudApply?.({clients}));listen(['routeContributions'],mergeContributions);return}
    if(role==='socio'&&profileId){let clients=[],sales=[];const update=()=>window.darkisSocioCloudApply?.({clients,sales});listen(['socioProfiles',profileId,'clients'],rows=>{clients=rows;update()});listen(['socioProfiles',profileId,'sales'],rows=>{sales=rows;update()})}
  }
  async function resolveAccess(){
    window.DarkisInventory?.disconnect();publishRouteContext(null);const version=++generation,user=auth?.currentUser;currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;
    if(!role){
      accessState('idle','Selecciona tu área.');
      if(!isGoogle(user)){announce('waiting','Selecciona un área para conectar tu cuenta.');return false}
      announce('connecting','Comprobando Firebase…');
      try{await timeout(sdk.getDocFromServer(sdk.doc(db,'accessRoles',user.uid)));if(version===generation){accessState('idle','Firebase respondió. Abre tu área para comprobar sus permisos.');announce('online','Firebase respondió. Los permisos se comprueban al entrar en tu área.')}}
      catch(error){if(version===generation){const message=window.darkisFirebaseError(error);accessState('error',message);announce('offline',message)}}
      return false;
    }
    if(!isGoogle(user)){accessState('needs-login','Conecta tu cuenta Google una vez en este dispositivo.');announce('waiting','Falta conectar una cuenta Google.');return false}
    announce('connecting','Comprobando permisos de Google…');
    try{
      const ref=sdk.doc(db,'accessRoles',user.uid);
      const snapshot=await timeout(sdk.getDocFromServer(ref));
      if(version!==generation)return false;
      grant=snapshot.exists()?snapshot.data():null;
      accessUnsubscribe=sdk.onSnapshot(ref,{includeMetadataChanges:true},next=>{
        if(version!==generation||next.metadata.fromCache)return;
        const permission=next.exists()?next.data():null;
        if(JSON.stringify(permission)!==JSON.stringify(grant))resolveAccess();
      },()=>{});
      if(!grant){accessState('pending','Esta cuenta todavía necesita autorización.');announce('waiting','Cuenta pendiente de autorización.');return false}
      if(!canUse(grant,role,profileId)){accessState('denied','Esta cuenta no tiene permiso para abrir esta área.');announce('waiting','Cuenta sin permiso para esta área.');return false}
      currentUser=user;if(role==='admin'||role==='route')window.DarkisInventory?.connect({sdk,db,user,role});publishRouteContext({sdk,db,user,role});accessState('authorized','Cuenta autorizada.');subscribe();flush();return true;
    }catch(error){if(version===generation){accessState('error',window.darkisFirebaseError(error));announce('offline',window.darkisFirebaseError(error))}return false}
  }
  async function flush(){if(syncing||!currentUser||!db||!navigator.onLine||!canUse(grant,role,profileId))return;syncing=true;let failed=false;const user=currentUser,area=role,profile=profileId;
    try{for(const item of safeArray(QUEUE)){
      if(currentUser?.uid!==user.uid||role!==area||profileId!==profile)break;
      if(item.role!==area||(area==='socio'&&item.profileId!==profile))continue;
      try{const ref=sdk.doc(db,...item.parts);if(item.operation==='delete')await timeout(sdk.deleteDoc(ref));else if(item.parts[0]==='routeOrders')await timeout(sdk.runTransaction(db,async tx=>{const snap=await tx.get(ref);if(snap.exists()&&snap.data().data.status!=='pending'){dispatchEvent(new CustomEvent('darkis-route-orders',{detail:[snap.data().data]}));return}tx.set(ref,{ownerUid:user.uid,data:item.data,updatedAt:sdk.serverTimestamp()})}));else if(['routeClients','routeContributions'].includes(item.parts[0]))await timeout(sdk.runTransaction(db,async tx=>{const snap=await tx.get(ref),old=snap.exists()?snap.data():null;let data=item.data;
if(item.parts[0]==='routeClients')data=window.DarkisPricingSync?.mergeClient(old?.data,data)||data;
else{let client={name:data.customerName||''};if(data.customerId){const c=await tx.get(sdk.doc(db,'routeClients',data.customerId));if(c.exists())client=c.data().data}data=window.DarkisPricing?.repriceContribution(data,client)||data;}
tx.set(ref,{ownerUid:old?.ownerUid||user.uid,data,updatedAt:sdk.serverTimestamp()});}));else await timeout(sdk.setDoc(ref,{ownerUid:user.uid,data:item.data,updatedAt:sdk.serverTimestamp()}));lastServerAck=Date.now();saveQueue(safeArray(QUEUE).filter(x=>x.opId!==item.opId))}
      catch(error){failed=true;announce('offline',window.darkisFirebaseError(error));break}
    }if(!failed&&currentUser?.uid===user.uid&&lastServerAck)announce('online','Sincronizado')}
    finally{syncing=false;if(!failed&&currentUser?.uid===user.uid&&role===area&&safeArray(QUEUE).some(x=>x.role===area&&(area!=='socio'||x.profileId===profile)))scheduleFlush()}
  }
  const api={
    async refreshPayroll(){window.DarkisInventory?.refresh();if(grant?.role!=='admin'||!currentUser)throw Error('Conecta administrador.');if(payrollRefreshPromise)return payrollRefreshPromise;const uid=currentUser.uid,version=generation;for(const name of ['payrollRequests','payrollPayments'])payrollState(name,'loading');payrollRefreshPromise=(async()=>{const results=await Promise.allSettled(['payrollRequests','payrollPayments'].map(async name=>{try{const snap=await timeout(sdk.getDocsFromServer(sdk.collection(db,name)));if(currentUser?.uid!==uid||version!==generation)return;const rows=snap.docs.map(d=>d.data().data).filter(Boolean);payrollServerSeen.add(uid+'__'+name);publishPayroll(name,rows);payrollState(name,'server');return rows}catch(error){if(currentUser?.uid===uid&&version===generation)payrollState(name,'error',error.code||error.message);throw error}}));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason})().finally(()=>{payrollRefreshPromise=null});return payrollRefreshPromise},

    async payPayroll(requestId,paymentDate,method='Efectivo',requestOwner){
      if(!currentUser||grant?.role!=='admin')throw Error('Se necesita acceso de administrador.');
      return window.DarkisPayrollSettlement.settle({sdk,db,user:currentUser,role:'admin'},requestId,paymentDate,method,requestOwner);
    },
    async createHistoricalPayrollShift(input){
      if(!currentUser||grant?.role!=='admin')throw Error('Se necesita acceso de administrador.');
      return window.DarkisPayrollSettlement.addHistoricalShift({sdk,db,user:currentUser,role:'admin'},input);
    },
    async listPayrollEmployees(){if(!currentUser||grant?.role!=='admin')throw Error('Conecta administrador.');const [profiles,records,reports]=await Promise.all(['timeclockEmployees','timeclockRecords','payrollRequests'].map(col=>sdk.getDocsFromServer(sdk.collection(db,col))));const scores=new Map();for(const snap of [...records.docs,...reports.docs]){const raw=snap.data(),d=raw.data;if(!d?.employeeId||!raw.ownerUid)continue;const key=raw.ownerUid+'::'+d.employeeId;scores.set(key,Math.max(scores.get(key)||0,d.timestamp||d.createdAt||0))}const people=new Map();for(const doc of profiles.docs)for(const p of doc.data().data?.profiles||[]){if(!p.id||!p.name)continue;const person={ownerUid:doc.id,employeeId:p.id,employeeName:p.name},key=p.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),score=scores.get(doc.id+'::'+p.id)||0,old=people.get(key);if(!old||score>old.score)people.set(key,{person,score})}return [...people.values()].map(x=>x.person)},
    async listPayrollAdjustments(){if(!currentUser||grant?.role!=='admin')throw Error('Conecta administrador.');const snap=await sdk.getDocsFromServer(sdk.collection(db,'payrollAdjustments'));return snap.docs.map(d=>d.data().data)},
    async createPayrollAdjustment(input){if(!currentUser||grant?.role!=='admin')throw Error('Sólo administrador registra descuentos.');const cause=String(input.cause||'').trim(),recipients=input.recipients||[],total=input.totalCents;if(!cause||cause.length>180)throw Error('Escribe una causa de hasta 180 caracteres.');if(!Number.isInteger(total)||total<recipients.length||total>10000000||![1,2].includes(recipients.length))throw Error('Revisa el monto total y las personas.');if(recipients.length===2&&(recipients[0].employeeId===recipients[1].employeeId||recipients[0].employeeName.trim().toLowerCase()===recipients[1].employeeName.trim().toLowerCase()))throw Error('Selecciona dos personas distintas.');if(!/^adj-[a-z0-9-]{8,80}$/.test(input.id||''))throw Error('Folio de descuento inválido.');const now=Date.now(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date()),allocations=recipients.map((p,i)=>({...p,id:input.id+'_'+i,cents:Math.floor(total/recipients.length)+(i===0?total%recipients.length:0)}));return sdk.runTransaction(db,async tx=>{const ref=sdk.doc(db,'payrollAdjustments',input.id),old=await tx.get(ref);if(old.exists()){const d=old.data().data;if(d.totalCents!==total||d.cause!==cause||JSON.stringify(d.allocations)!==JSON.stringify(allocations))throw Error('Ese folio pertenece a otro descuento.');return d}for(const p of recipients){const profile=await tx.get(sdk.doc(db,'timeclockEmployees',p.ownerUid));if(!profile.exists()||!(profile.data().data?.profiles||[]).some(x=>x.id===p.employeeId&&x.name===p.employeeName))throw Error('No se encontró el perfil del reloj. Actualiza las personas.')}const group={id:input.id,totalCents:total,cause,allocations,date,createdAt:now,createdBy:currentUser.uid};tx.set(ref,{ownerUid:currentUser.uid,data:group});for(const a of allocations){const d={id:a.id,kind:'adminDeduction',adjustmentGroupId:input.id,ownerUid:a.ownerUid,employeeId:a.employeeId,employeeName:a.employeeName,quantities:[0,0,0,0,0,0,0],pieces:0,unitPrice:19,otherCents:a.cents,otherConcept:cause,amountCents:a.cents,cause,description:cause+(recipients.length===2?' · compartido: '+(a.cents/100).toFixed(2)+' de '+(total/100).toFixed(2):''),date,createdAt:now};tx.set(sdk.doc(db,'employeeWithdrawals',a.id),{ownerUid:a.ownerUid,data:d})}return group})},
    async voidEmployeeReturn(id){if(!currentUser||grant?.role!=='admin')throw Error('Se necesita administrador.');return sdk.runTransaction(db,async tx=>{const ref=sdk.doc(db,'employeeReturns',id),snap=await tx.get(ref),claim=await tx.get(sdk.doc(db,'payrollReturnClaims',id));if(!snap.exists())throw Error('No se encontró la devolución.');const raw=snap.data(),d=raw.data;if(d.status==='voided')return d;if(claim.exists())throw Error('Esta devolución ya fue abonada en una nómina pagada. Requiere un ajuste de nómina; no se puede anular.');let totalRef,total;if(!d.historical&&d.withdrawalId){totalRef=sdk.doc(db,'employeeReturnTotals',d.withdrawalId);const t=await tx.get(totalRef);if(!t.exists()||t.data().pieces<d.pieces)throw Error('El acumulado no coincide. Revisa la devolución antes de anularla.');total=t.data()}const next={...d,status:'voided',voidedAt:Date.now(),voidedBy:currentUser.uid};tx.set(ref,{...raw,data:next});if(totalRef)tx.set(totalRef,{...total,pieces:total.pieces-d.pieces,...(total.quantities?{quantities:window.DarkisInventoryModel.clean(total.quantities).map((n,i)=>Math.max(0,n-window.DarkisInventoryModel.clean(d.quantities)[i]))}:{}),lastVoidedReturnId:id});return next})},
    async cancelPayroll(requestId,requestOwner){if(!currentUser||grant?.role!=='admin')throw Error('Se necesita administrador.');return sdk.runTransaction(db,async tx=>{const ref=sdk.doc(db,'payrollRequests',requestOwner+'__'+requestId),snap=await tx.get(ref);if(!snap.exists())throw Error('No se encontró la selección.');const raw=snap.data();if(raw.data.status!=='pending')throw Error('Sólo se puede cancelar un PDF pendiente.');tx.set(ref,{...raw,data:{...raw.data,status:'cancelled',updatedAt:Date.now()},updatedAt:sdk.serverTimestamp()})});},
    saveRouteOrder(value){if(value?.id)queueOperation(['routeOrders',value.id],value,'set',role==='admin'?'admin':'route')},
    saveRouteReceipt(value){if(value?.id)queueOperation(['routeReceipts',value.id],value,'set',role==='admin'?'admin':'route')},
    saveRouteExpense(value){if(value?.id)queueOperation(['routeExpenses',value.id],value,'set',role==='admin'?'admin':'route')},
    saveRouteSchedule(value){if(value?.id==='gdl')queueOperation(['routeSchedules','gdl'],value,'set',role==='admin'?'admin':'route')},
    saveRouteClient(client){if(client?.id)queueOperation(['routeClients',client.id],client,'set',role==='admin'?'admin':'route')},
    deleteRouteClient(id){if(id)queueOperation(['routeClients',id],undefined,'delete','route')},
    saveRouteContribution(item){if(item?.id)queueOperation(['routeContributions',item.id],item,'set',role==='admin'?'admin':'route')},
    saveSocioClient(client){const id=profileOf(client);if(id&&client?.id)queueOperation(['socioProfiles',id,'clients',client.id],client,'set','socio',id)},
    saveSocioSale(sale){const id=profileOf(sale);if(!id||!sale?.id)return;queueOperation(['socioProfiles',id,'sales',sale.id],sale,'set','socio',id);queueOperation(['routeContributions',sale.id],asContribution(sale),'set','socio',id)},
    async activate(area,_pin,profile=''){role=area;profileId=area==='socio'?profile:'';sessionStorage.setItem('darkis_suite_role_v12',area);if(area==='socio')sessionStorage.setItem('darkis_socio_profile_v12',profileId);sessionStorage.removeItem('darkis_pin_pending_v12');if(!auth){accessState('loading','Preparando conexión con Google…');return false}return resolveAccess()},
    async signInGoogle(){if(!auth||!sdk)throw Error('Firebase todavía no está disponible.');const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{await sdk.signInWithPopup(auth,provider)}catch(error){accessState('error',error.code==='auth/unauthorized-domain'?'Añade el dominio de esta app en Authentication → Configuración → Dominios autorizados.':error.code==='auth/popup-blocked'?'Permite la ventana de Google en este navegador e inténtalo de nuevo.':'No se completó el inicio con Google.');throw error}},
    async changeAccount(){window.DarkisInventory?.disconnect();publishRouteContext(null);generation++;currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;if(auth)await sdk.signOut(auth);accessState('needs-login','Elige tu cuenta Google para continuar.');announce('offline','Cuenta Google desconectada.')},
    async deactivate(){window.DarkisInventory?.disconnect();publishRouteContext(null);generation++;role='';profileId='';currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;for(const key of ['darkis_pin_pending_v12','darkis_suite_role_v12','darkis_socio_profile_v12'])sessionStorage.removeItem(key);accessState('idle','Perfil cerrado. La cuenta Google sigue recordada en este dispositivo.');announce('offline','Perfil cerrado en este dispositivo.')},
    async requestAccess(){const user=auth?.currentUser;if(!isGoogle(user))throw Error('Primero entra con Google.');await timeout(sdk.setDoc(sdk.doc(db,'accessRequests',user.uid),{uid:user.uid,email:user.email||'',name:user.displayName||'',desiredRole:role,profileId:role==='socio'?profileId:'',updatedAt:sdk.serverTimestamp()}));accessState('pending','Solicitud enviada. El administrador puede autorizar esta cuenta.');},
    async listAccess(){if(!currentUser||grant?.role!=='admin')throw Error('Sólo el administrador puede gestionar accesos.');const [requests,roles]=await Promise.all([sdk.getDocsFromServer(sdk.collection(db,'accessRequests')),sdk.getDocsFromServer(sdk.collection(db,'accessRoles'))]);return{requests:requests.docs.map(d=>({id:d.id,...d.data()})),roles:roles.docs.map(d=>({id:d.id,...d.data()}))}},
    async setAccess(uid,permission){if(!currentUser||grant?.role!=='admin'||uid===currentUser.uid)throw Error('No se puede modificar este acceso.');await sdk.setDoc(sdk.doc(db,'accessRoles',uid),{role:permission.role,profileId:permission.profileId||'',enabled:permission.enabled===true,email:permission.email||'',updatedAt:sdk.serverTimestamp()});},
    refreshAccess:resolveAccess,syncNow:flush,
    openAccount(){dispatchEvent(new Event('darkis-open-account'))},
    get accountState(){return accountState},get status(){return window.darkisSyncStatus?.state||'local'}
  };
  window.darkisSharedSync=api;
  async function init(){announce(navigator.onLine?'connecting':'offline','Preparando Firebase…');try{
    const [appSdk,authSdk,firestoreSdk]=await Promise.all([import(PREFIX+'firebase-app.js'),import(PREFIX+'firebase-auth.js'),import(PREFIX+'firebase-firestore.js')]);sdk={...authSdk,...firestoreSdk};
    const app=appSdk.getApps().find(x=>x.name==='darkis-shared-v12')||appSdk.initializeApp(CONFIG,'darkis-shared-v12');auth=authSdk.getAuth(app);try{db=firestoreSdk.initializeFirestore(app,{experimentalForceLongPolling:true,experimentalAutoDetectLongPolling:false,localCache:firestoreSdk.persistentLocalCache({tabManager:firestoreSdk.persistentMultipleTabManager()})})}catch{db=firestoreSdk.getFirestore(app)}
    sessionStorage.removeItem('darkis_pin_pending_v12');await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);authSdk.onAuthStateChanged(auth,()=>{resolveAccess()});
  }catch(error){const message=window.darkisFirebaseError(error);accessState('error',message);announce('offline',message)}}
  addEventListener('online',()=>{if(role&&auth)resolveAccess()});addEventListener('offline',()=>announce('offline','Sin internet; cambios guardados en este dispositivo.'));
  setInterval(()=>{if(navigator.onLine&&lastServerAck<checkingSince&&Date.now()-checkingSince>15000)announce('offline','Firebase no respondió; datos locales disponibles.')},5000);
  init();
})();
