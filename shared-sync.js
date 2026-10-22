/* Firebase Spark: Google + permisos guardados en Firestore. No usa Functions. */
(() => {
  'use strict';
  const CONFIG={apiKey:'AIzaSyAzpjktTdrIBt-I89ZX98icGEMmhluXlo8',authDomain:'darkis-brownies.firebaseapp.com',projectId:'darkis-brownies',storageBucket:'darkis-brownies.firebasestorage.app',messagingSenderId:'66959378357',appId:'1:66959378357:web:a059509bea57560a243bfc'};
  const PREFIX='https://www.gstatic.com/firebasejs/12.19.0/',QUEUE='darkis_v12_sync_queue',CONTRIBUTIONS='darkis_v12_contributions';
  let role=document.body.dataset.darkisPage==='administrador'?'admin':sessionStorage.getItem('darkis_suite_role_v12')||'',profileId=role==='socio'?sessionStorage.getItem('darkis_socio_profile_v12')||'':'';
  let sdk,auth,db,currentUser=null,grant=null,syncing=false,flushTimer,lastServerAck=0,checkingSince=Date.now(),generation=0;
  let unsubscribers=[],accessUnsubscribe=null;
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
  function profileOf(item){return String(item.actorProfileId||item.profileId||profileId||'')}
  function asContribution(sale){const saved=safeArray(CONTRIBUTIONS).find(x=>x.id===sale.id);if(saved)return saved;const items=Array.isArray(sale.items)?sale.items:[];return{...sale,actorProfileId:profileOf(sale),paid:Number(sale.paid)||items.reduce((n,x)=>n+(Number(x.qty)||0),0),removed:[],delivered:[],source:'Darkisocio',items}}
  function mergeContributions(remote){const rows=new Map(safeArray(CONTRIBUTIONS).map(x=>[x.id,x]));for(const item of remote)if(item?.id){const old=rows.get(item.id);if(!old||String(item.updatedAt||item.createdAt)>=String(old.updatedAt||old.createdAt))rows.set(item.id,item);}localStorage.setItem(CONTRIBUTIONS,JSON.stringify([...rows.values()]));dispatchEvent(new Event('darkis-data-updated'))}
  function listen(path,handler){const uid=currentUser?.uid;unsubscribers.push(sdk.onSnapshot(sdk.collection(db,...path),{includeMetadataChanges:true},snapshot=>{
    if(currentUser?.uid!==uid)return;
    if(!snapshot.metadata.fromCache)announce('online','Firebase conectado');
    const rows=snapshot.docs.map(doc=>doc.data()?.data).filter(Boolean);if(path[0]==='payrollRequests')window.darkisPayrollRemoteRequests=rows;if(path[0]==='payrollPayments')window.darkisPayrollRemotePayments=rows;if(path[0]==='routeClients')window.DarkisClientDirectory?.ingest(rows);handler(rows);
  },error=>announce('offline','No se pudieron leer los datos: '+error.code)))}
  function subscribe(){clearSubscriptions();if(!currentUser)return;if(role==='admin'||role==='route'){listen(['routeOrders'],rows=>dispatchEvent(new CustomEvent('darkis-route-orders',{detail:rows})));}if(role==='admin'||role==='route')listen(['routeSchedules'],rows=>dispatchEvent(new CustomEvent('darkis-route-schedules-data',{detail:rows})));
    if(role==='admin'){listen(['payrollRequests'],rows=>dispatchEvent(new CustomEvent('darkis-payroll-requests',{detail:rows})));listen(['payrollPayments'],rows=>dispatchEvent(new CustomEvent('darkis-payroll-payments',{detail:rows})));listen(['routeExpenses'],rows=>dispatchEvent(new CustomEvent('darkis-route-expenses',{detail:rows})));listen(['routeClients'],rows=>dispatchEvent(new CustomEvent('darkis-route-clients-data',{detail:rows})));listen(['routeContributions'],mergeContributions);listen(['timeclockEmployees'],devices=>dispatchEvent(new CustomEvent('darkis-clock-data',{detail:devices})));unsubscribers.push(sdk.onSnapshot(sdk.collection(db,'productionRecords'),snapshot=>{window.darkisProductionCloudDetail=snapshot.metadata?.fromCache?'Mostrando copia local de producción.':'Producción recibida de Firebase.';dispatchEvent(new CustomEvent('darkis-production-data',{detail:snapshot.docs.map(x=>x.data().data).filter(Boolean)}))},error=>{window.darkisProductionCloudDetail='No se pudo leer producción: '+error.code+'. Publica las reglas v22.';dispatchEvent(new CustomEvent('darkis-production-data',{detail:[]}))}));return}
    if(role==='route'){listen(['routeClients'],clients=>window.darkisRouteCloudApply?.({clients}));return}
    if(role==='socio'&&profileId){let clients=[],sales=[];const update=()=>window.darkisSocioCloudApply?.({clients,sales});listen(['socioProfiles',profileId,'clients'],rows=>{clients=rows;update()});listen(['socioProfiles',profileId,'sales'],rows=>{sales=rows;update()})}
  }
  async function resolveAccess(){
    window.DarkisInventory?.disconnect();const version=++generation,user=auth?.currentUser;currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;
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
      currentUser=user;if(role==='admin'||role==='route')window.DarkisInventory?.connect({sdk,db,user,role});accessState('authorized','Cuenta autorizada.');subscribe();flush();return true;
    }catch(error){if(version===generation){accessState('error',window.darkisFirebaseError(error));announce('offline',window.darkisFirebaseError(error))}return false}
  }
  async function flush(){if(syncing||!currentUser||!db||!navigator.onLine||!canUse(grant,role,profileId))return;syncing=true;let failed=false;const user=currentUser,area=role,profile=profileId;
    try{for(const item of safeArray(QUEUE)){
      if(currentUser?.uid!==user.uid||role!==area||profileId!==profile)break;
      if(item.role!==area||(area==='socio'&&item.profileId!==profile))continue;
      try{const ref=sdk.doc(db,...item.parts);if(item.operation==='delete')await timeout(sdk.deleteDoc(ref));else if(item.parts[0]==='routeOrders')await timeout(sdk.runTransaction(db,async tx=>{const snap=await tx.get(ref);if(snap.exists()&&snap.data().data.status!=='pending'){dispatchEvent(new CustomEvent('darkis-route-orders',{detail:[snap.data().data]}));return}tx.set(ref,{ownerUid:user.uid,data:item.data,updatedAt:sdk.serverTimestamp()})}));else await timeout(sdk.setDoc(ref,{ownerUid:user.uid,data:item.data,updatedAt:sdk.serverTimestamp()}));lastServerAck=Date.now();saveQueue(safeArray(QUEUE).filter(x=>x.opId!==item.opId))}
      catch(error){failed=true;announce('offline',window.darkisFirebaseError(error));break}
    }if(!failed&&currentUser?.uid===user.uid&&lastServerAck)announce('online','Sincronizado')}
    finally{syncing=false;if(!failed&&currentUser?.uid===user.uid&&role===area&&safeArray(QUEUE).some(x=>x.role===area&&(area!=='socio'||x.profileId===profile)))scheduleFlush()}
  }
  const api={
    async refreshPayroll(){if(grant?.role!=='admin')throw Error('Conecta administrador.');for(const [name,event]of [['payrollRequests','darkis-payroll-requests'],['payrollPayments','darkis-payroll-payments']]){const snap=await sdk.getDocsFromServer(sdk.collection(db,name));dispatchEvent(new CustomEvent(event,{detail:snap.docs.map(d=>d.data().data)}))}},
    async payPayroll(requestId,paymentDate,method='Efectivo',requestOwner){
      if(!currentUser||grant?.role!=='admin')throw Error('Se necesita acceso de administrador.');
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)||paymentDate>today)throw Error('Elige una fecha de pago válida, hasta hoy.');
      return sdk.runTransaction(db,async tx=>{
        const requestRef=sdk.doc(db,'payrollRequests',requestOwner+'__'+requestId),paymentRef=sdk.doc(db,'payrollPayments',requestId),requestSnap=await tx.get(requestRef),paymentSnap=await tx.get(paymentRef);
        if(paymentSnap.exists())return paymentSnap.data().data;if(!requestSnap.exists())throw Error('No se encontró el PDF seleccionado.');const request=requestSnap.data().data,claimRows=[];
        if(!Array.isArray(request.allocations)||request.allocations.length>20)throw Error('La selección está dañada.');
        for(const allocation of request.allocations){
          const claim=await tx.get(sdk.doc(db,'payrollClaims',allocation.key));if(claim.exists())claimRows.push(claim.data().data);
          const readRecord=async id=>{let found=await tx.get(sdk.doc(db,'timeclockRecords',request.ownerUid+'__'+id));if(!found.exists())found=await tx.get(sdk.doc(db,'timeclockRecords',id));if(!found.exists())throw Error('Falta sincronizar un movimiento del reloj antes de pagar.');const raw=found.data();if(raw.ownerUid!==request.ownerUid)throw Error('La identidad del movimiento no coincide.');return raw.data};
          const entry=await readRecord(allocation.entryId),exit=await readRecord(allocation.exitId);
          if(entry.deleted||exit.deleted||entry.type!=='entry'||exit.type!=='exit'||entry.employeeId!==request.employeeId||exit.employeeId!==request.employeeId||entry.timestamp!==allocation.start||exit.timestamp!==allocation.end||Math.round((exit.timestamp-entry.timestamp)/1000)!==allocation.capacitySeconds||JSON.stringify([entry.id,entry.timestamp,exit.id,exit.timestamp])!==allocation.fingerprint)throw Error('Un horario del PDF cambió. Revisa o cancela esa selección y genera otra.');
        }
        const deductionUpdates=[],deductionIds=new Set();if((request.deductions||[]).length>20)throw Error('Demasiados descuentos en un PDF.');for(const d of request.deductions||[]){if(deductionIds.has(d.id)||!Number.isInteger(d.cents)||d.cents<=0)throw Error('Descuento inválido.');deductionIds.add(d.id);const debtRef=sdk.doc(db,'employeeWithdrawals',d.id),claimRef=sdk.doc(db,'payrollDeductionClaims',d.id),debtSnap=await tx.get(debtRef),claimSnap=await tx.get(claimRef);if(!debtSnap.exists())throw Error('Falta sincronizar el retiro de brownies antes de pagar.');const debt=debtSnap.data().data,paid=claimSnap.exists()?claimSnap.data().data.paidCents:0;if(debt.ownerUid!==request.ownerUid||debt.employeeId!==request.employeeId||paid+d.cents>debt.amountCents)throw Error('Ese descuento ya se aplicó o pertenece a otra persona.');deductionUpdates.push({ref:claimRef,data:{id:d.id,paidCents:paid+d.cents,amountCents:debt.amountCents,lastRequestId:requestId}})}
        const returnUpdates=[],returnIds=new Set();let returnCredit=0,returnFlag=false;if((request.returns||[]).length>20)throw Error('Demasiadas devoluciones.');for(const r of request.returns||[]){if(returnIds.has(r.id))throw Error('Devolución duplicada.');returnIds.add(r.id);const ref=sdk.doc(db,'employeeReturns',r.id),claimRef=sdk.doc(db,'payrollReturnClaims',r.id),snap=await tx.get(ref),claim=await tx.get(claimRef);if(!snap.exists())throw Error('Falta sincronizar el expendio regresado.');const data=snap.data().data;if(claim.exists()||data.ownerUid!==request.ownerUid||data.employeeId!==request.employeeId||data.creditCents!==r.creditCents||data.pieces!==r.pieces||data.withdrawalId!==r.withdrawalId)throw Error('Ese expendio ya fue abonado o no corresponde.');returnCredit+=data.creditCents;returnFlag=returnFlag||data.totalReturnedPieces/data.issuedPieces>.15;returnUpdates.push({ref:claimRef,data:{id:r.id,requestId,creditCents:data.creditCents}})}if(returnCredit!==(request.returnCreditCents||0))throw Error('Revisa el abono por expendios.');const updates=window.DarkisPayrollModel.validatePayment(request,claimRows),now=Date.now(),payment={id:requestId,requestId,ownerUid:request.ownerUid,employeeId:request.employeeId,employeeName:request.employeeName,allocations:request.allocations,totalMinutes:request.totalMinutes,totalSeconds:request.totalSeconds,rate:50,grossAmount:request.grossAmount??request.amount,deductionCents:request.deductionCents||0,deductions:request.deductions||[],returns:request.returns||[],returnCreditCents:request.returnCreditCents||0,returnRedFlag:returnFlag,amount:request.amount,paymentDate,method,paidAt:now,createdAt:now,updatedAt:now,paidBy:currentUser.email||currentUser.uid};
        for(const r of returnUpdates)tx.set(r.ref,{ownerUid:request.ownerUid,data:r.data});for(const d of deductionUpdates)tx.set(d.ref,{ownerUid:request.ownerUid,data:{...d.data,updatedAt:now},updatedAt:sdk.serverTimestamp()});for(const claim of updates)tx.set(sdk.doc(db,'payrollClaims',claim.id),{ownerUid:currentUser.uid,data:{...claim,updatedAt:now,lastRequestId:requestId},updatedAt:sdk.serverTimestamp()});
        tx.set(paymentRef,{ownerUid:request.ownerUid,data:payment,updatedAt:sdk.serverTimestamp()});tx.set(requestRef,{ownerUid:request.ownerUid,data:{...request,status:'paid',paymentId:requestId,paidAt:now,updatedAt:now},updatedAt:sdk.serverTimestamp()});return payment;
      }).catch(async error=>{try{const confirmed=await sdk.getDocFromServer(sdk.doc(db,'payrollPayments',requestId)),payment=confirmed.exists()?confirmed.data().data:null;if(payment?.requestId===requestId&&payment.ownerUid===requestOwner)return payment}catch{}throw error});
    },
    async cancelPayroll(requestId,requestOwner){if(!currentUser||grant?.role!=='admin')throw Error('Se necesita administrador.');return sdk.runTransaction(db,async tx=>{const ref=sdk.doc(db,'payrollRequests',requestOwner+'__'+requestId),snap=await tx.get(ref);if(!snap.exists())throw Error('No se encontró la selección.');const raw=snap.data();if(raw.data.status!=='pending')throw Error('Sólo se puede cancelar un PDF pendiente.');tx.set(ref,{...raw,data:{...raw.data,status:'cancelled',updatedAt:Date.now()},updatedAt:sdk.serverTimestamp()})});},
    saveRouteOrder(value){if(value?.id)queueOperation(['routeOrders',value.id],value,'set',role==='admin'?'admin':'route')},
    saveRouteExpense(value){if(value?.id)queueOperation(['routeExpenses',value.id],value,'set',role==='admin'?'admin':'route')},
    saveRouteSchedule(value){if(value?.id==='gdl')queueOperation(['routeSchedules','gdl'],value,'set',role==='admin'?'admin':'route')},
    saveRouteClient(client){if(client?.id)queueOperation(['routeClients',client.id],client,'set',role==='admin'?'admin':'route')},
    deleteRouteClient(id){if(id)queueOperation(['routeClients',id],undefined,'delete','route')},
    saveRouteContribution(item){if(item?.id)queueOperation(['routeContributions',item.id],item,'set','route')},
    saveSocioClient(client){const id=profileOf(client);if(id&&client?.id)queueOperation(['socioProfiles',id,'clients',client.id],client,'set','socio',id)},
    saveSocioSale(sale){const id=profileOf(sale);if(!id||!sale?.id)return;queueOperation(['socioProfiles',id,'sales',sale.id],sale,'set','socio',id);queueOperation(['routeContributions',sale.id],asContribution(sale),'set','socio',id)},
    async activate(area,_pin,profile=''){role=area;profileId=area==='socio'?profile:'';sessionStorage.setItem('darkis_suite_role_v12',area);if(area==='socio')sessionStorage.setItem('darkis_socio_profile_v12',profileId);sessionStorage.removeItem('darkis_pin_pending_v12');if(!auth){accessState('loading','Preparando conexión con Google…');return false}return resolveAccess()},
    async signInGoogle(){if(!auth||!sdk)throw Error('Firebase todavía no está disponible.');const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{await sdk.signInWithPopup(auth,provider)}catch(error){accessState('error',error.code==='auth/unauthorized-domain'?'Añade el dominio de esta app en Authentication → Configuración → Dominios autorizados.':error.code==='auth/popup-blocked'?'Permite la ventana de Google en este navegador e inténtalo de nuevo.':'No se completó el inicio con Google.');throw error}},
    async changeAccount(){window.DarkisInventory?.disconnect();generation++;currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;if(auth)await sdk.signOut(auth);accessState('needs-login','Elige tu cuenta Google para continuar.');announce('offline','Cuenta Google desconectada.')},
    async deactivate(){window.DarkisInventory?.disconnect();generation++;role='';profileId='';currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;for(const key of ['darkis_pin_pending_v12','darkis_suite_role_v12','darkis_socio_profile_v12'])sessionStorage.removeItem(key);accessState('idle','Perfil cerrado. La cuenta Google sigue recordada en este dispositivo.');announce('offline','Perfil cerrado en este dispositivo.')},
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
    const app=appSdk.getApps().find(x=>x.name==='darkis-shared-v12')||appSdk.initializeApp(CONFIG,'darkis-shared-v12');auth=authSdk.getAuth(app);try{db=firestoreSdk.initializeFirestore(app,{localCache:firestoreSdk.persistentLocalCache({tabManager:firestoreSdk.persistentMultipleTabManager()})})}catch{db=firestoreSdk.getFirestore(app)}
    sessionStorage.removeItem('darkis_pin_pending_v12');await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);authSdk.onAuthStateChanged(auth,()=>{resolveAccess()});
  }catch(error){const message=window.darkisFirebaseError(error);accessState('error',message);announce('offline',message)}}
  addEventListener('online',()=>{if(role&&auth)resolveAccess()});addEventListener('offline',()=>announce('offline','Sin internet; cambios guardados en este dispositivo.'));
  setInterval(()=>{if(navigator.onLine&&lastServerAck<checkingSince&&Date.now()-checkingSince>15000)announce('offline','Firebase no respondió; datos locales disponibles.')},5000);
  init();
})();
