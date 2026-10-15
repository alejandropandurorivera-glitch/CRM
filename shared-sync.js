/* Firebase Spark: Google + permisos guardados en Firestore. No usa Functions. */
(() => {
  'use strict';
  const CONFIG={apiKey:'AIzaSyAzpjktTdrIBt-I89ZX98icGEMmhluXlo8',authDomain:'darkis-brownies.firebaseapp.com',projectId:'darkis-brownies',storageBucket:'darkis-brownies.firebasestorage.app',messagingSenderId:'66959378357',appId:'1:66959378357:web:a059509bea57560a243bfc'};
  const PREFIX='https://www.gstatic.com/firebasejs/12.19.0/',QUEUE='darkis_v12_sync_queue',CONTRIBUTIONS='darkis_v12_contributions';
  let role=sessionStorage.getItem('darkis_suite_role_v12')||'',profileId=role==='socio'?sessionStorage.getItem('darkis_socio_profile_v12')||'':'';
  let sdk,auth,db,currentUser=null,grant=null,syncing=false,flushTimer,lastServerAck=0,checkingSince=Date.now(),generation=0;
  let unsubscribers=[],accessUnsubscribe=null;
  let accountState={state:'loading',role,profileId};
  const safeArray=key=>{try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:[]}catch{return[]}};
  const timeout=(promise,ms=15000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),ms))]);
  function announce(state,detail){if(state==='online')lastServerAck=Date.now();if(state==='connecting')checkingSince=Date.now();dispatchEvent(new CustomEvent('darkis-sync-status',{detail:{state,detail}}));document.querySelectorAll('[data-darkis-cloud-status]').forEach(node=>node.textContent=detail)}
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
  function mergeContributions(remote){const rows=new Map(safeArray(CONTRIBUTIONS).map(x=>[x.id,x]));for(const item of remote)if(item?.id)rows.set(item.id,item);localStorage.setItem(CONTRIBUTIONS,JSON.stringify([...rows.values()]));dispatchEvent(new Event('darkis-data-updated'))}
  function listen(path,handler){const uid=currentUser?.uid;unsubscribers.push(sdk.onSnapshot(sdk.collection(db,...path),{includeMetadataChanges:true},snapshot=>{
    if(currentUser?.uid!==uid)return;
    if(!snapshot.metadata.fromCache)announce('online','Firebase conectado');
    handler(snapshot.docs.map(doc=>doc.data()?.data).filter(Boolean));
  },error=>announce('offline','No se pudieron leer los datos: '+error.code)))}
  function subscribe(){clearSubscriptions();if(!currentUser)return;
    if(role==='admin'){listen(['routeContributions'],mergeContributions);listen(['timeclockEmployees'],devices=>dispatchEvent(new CustomEvent('darkis-clock-data',{detail:devices})));return}
    if(role==='route'){listen(['routeClients'],clients=>window.darkisRouteCloudApply?.({clients}));return}
    if(role==='socio'&&profileId){let clients=[],sales=[];const update=()=>window.darkisSocioCloudApply?.({clients,sales});listen(['socioProfiles',profileId,'clients'],rows=>{clients=rows;update()});listen(['socioProfiles',profileId,'sales'],rows=>{sales=rows;update()})}
  }
  async function resolveAccess(){
    const version=++generation,user=auth?.currentUser;currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;
    if(!role){accessState('idle','Selecciona un área para conectar.');announce('offline','Selecciona un área para conectar Firebase.');return false}
    if(!isGoogle(user)){accessState('needs-login','Conecta tu cuenta Google una vez en este dispositivo.');announce('offline','Falta conectar una cuenta Google.');return false}
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
      if(!grant){accessState('pending','Esta cuenta todavía necesita autorización.');announce('offline','Cuenta pendiente de autorización.');return false}
      if(!canUse(grant,role,profileId)){accessState('denied','Esta cuenta no tiene permiso para abrir esta área.');announce('offline','Cuenta sin permiso para esta área.');return false}
      currentUser=user;accessState('authorized','Cuenta autorizada.');subscribe();flush();return true;
    }catch(error){if(version===generation){accessState('error',error.code==='permission-denied'?'Publica las reglas nuevas de la versión Spark.':'No se pudo comprobar la cuenta. Tus cambios siguen guardados en este dispositivo.');announce('offline','Sin conexión autorizada; datos locales disponibles.')}return false}
  }
  async function flush(){if(syncing||!currentUser||!db||!navigator.onLine||!canUse(grant,role,profileId))return;syncing=true;let failed=false;const user=currentUser,area=role,profile=profileId;
    try{for(const item of safeArray(QUEUE)){
      if(currentUser?.uid!==user.uid||role!==area||profileId!==profile)break;
      if(item.role!==area||(area==='socio'&&item.profileId!==profile))continue;
      try{const ref=sdk.doc(db,...item.parts);if(item.operation==='delete')await timeout(sdk.deleteDoc(ref));else await timeout(sdk.setDoc(ref,{ownerUid:user.uid,data:item.data,updatedAt:sdk.serverTimestamp()}));lastServerAck=Date.now();saveQueue(safeArray(QUEUE).filter(x=>x.opId!==item.opId))}
      catch{failed=true;announce('offline','Hay cambios pendientes de sincronizar.');break}
    }if(!failed&&currentUser?.uid===user.uid&&lastServerAck)announce('online','Sincronizado')}
    finally{syncing=false;if(!failed&&currentUser?.uid===user.uid&&role===area&&safeArray(QUEUE).some(x=>x.role===area&&(area!=='socio'||x.profileId===profile)))scheduleFlush()}
  }
  const api={
    saveRouteClient(client){if(client?.id)queueOperation(['routeClients',client.id],client,'set','route')},
    deleteRouteClient(id){if(id)queueOperation(['routeClients',id],undefined,'delete','route')},
    saveRouteContribution(item){if(item?.id)queueOperation(['routeContributions',item.id],item,'set','route')},
    saveSocioClient(client){const id=profileOf(client);if(id&&client?.id)queueOperation(['socioProfiles',id,'clients',client.id],client,'set','socio',id)},
    saveSocioSale(sale){const id=profileOf(sale);if(!id||!sale?.id)return;queueOperation(['socioProfiles',id,'sales',sale.id],sale,'set','socio',id);queueOperation(['routeContributions',sale.id],asContribution(sale),'set','socio',id)},
    async activate(area,_pin,profile=''){role=area;profileId=area==='socio'?profile:'';sessionStorage.setItem('darkis_suite_role_v12',area);if(area==='socio')sessionStorage.setItem('darkis_socio_profile_v12',profileId);sessionStorage.removeItem('darkis_pin_pending_v12');if(!auth){accessState('loading','Preparando conexión con Google…');return false}return resolveAccess()},
    async signInGoogle(){if(!auth||!sdk)throw Error('Firebase todavía no está disponible.');const provider=new sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{await sdk.signInWithPopup(auth,provider)}catch(error){accessState('error',error.code==='auth/unauthorized-domain'?'Añade el dominio de esta app en Authentication → Configuración → Dominios autorizados.':error.code==='auth/popup-blocked'?'Permite la ventana de Google en este navegador e inténtalo de nuevo.':'No se completó el inicio con Google.');throw error}},
    async changeAccount(){generation++;currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;if(auth)await sdk.signOut(auth);accessState('needs-login','Elige tu cuenta Google para continuar.');announce('offline','Cuenta Google desconectada.')},
    async deactivate(){generation++;role='';profileId='';currentUser=null;grant=null;clearSubscriptions();accessUnsubscribe?.();accessUnsubscribe=null;for(const key of ['darkis_pin_pending_v12','darkis_suite_role_v12','darkis_socio_profile_v12'])sessionStorage.removeItem(key);accessState('idle','Perfil cerrado. La cuenta Google sigue recordada en este dispositivo.');announce('offline','Perfil cerrado en este dispositivo.')},
    async requestAccess(){const user=auth?.currentUser;if(!isGoogle(user))throw Error('Primero entra con Google.');await timeout(sdk.setDoc(sdk.doc(db,'accessRequests',user.uid),{uid:user.uid,email:user.email||'',name:user.displayName||'',desiredRole:role,profileId:role==='socio'?profileId:'',updatedAt:sdk.serverTimestamp()}));accessState('pending','Solicitud enviada. El administrador puede autorizar esta cuenta.');},
    async listAccess(){if(!currentUser||grant?.role!=='admin')throw Error('Sólo el administrador puede gestionar accesos.');const [requests,roles]=await Promise.all([sdk.getDocsFromServer(sdk.collection(db,'accessRequests')),sdk.getDocsFromServer(sdk.collection(db,'accessRoles'))]);return{requests:requests.docs.map(d=>({id:d.id,...d.data()})),roles:roles.docs.map(d=>({id:d.id,...d.data()}))}},
    async setAccess(uid,permission){if(!currentUser||grant?.role!=='admin'||uid===currentUser.uid)throw Error('No se puede modificar este acceso.');await sdk.setDoc(sdk.doc(db,'accessRoles',uid),{role:permission.role,profileId:permission.profileId||'',enabled:permission.enabled===true,email:permission.email||'',updatedAt:sdk.serverTimestamp()});},
    refreshAccess:resolveAccess,syncNow:flush,
    openAccount(){dispatchEvent(new Event('darkis-open-account'))},
    get accountState(){return accountState},get status(){return currentUser?'online':'local'}
  };
  window.darkisSharedSync=api;
  addEventListener('darkis-admin-unlocked',()=>api.activate('admin',''));
  async function init(){announce(navigator.onLine?'connecting':'offline','Preparando Firebase…');try{
    const [appSdk,authSdk,firestoreSdk]=await Promise.all([import(PREFIX+'firebase-app.js'),import(PREFIX+'firebase-auth.js'),import(PREFIX+'firebase-firestore.js')]);sdk={...authSdk,...firestoreSdk};
    const app=appSdk.getApps().find(x=>x.name==='darkis-shared-v12')||appSdk.initializeApp(CONFIG,'darkis-shared-v12');auth=authSdk.getAuth(app);try{db=firestoreSdk.initializeFirestore(app,{localCache:firestoreSdk.persistentLocalCache({tabManager:firestoreSdk.persistentMultipleTabManager()})})}catch{db=firestoreSdk.getFirestore(app)}
    sessionStorage.removeItem('darkis_pin_pending_v12');await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);authSdk.onAuthStateChanged(auth,()=>{resolveAccess()});
  }catch{accessState('error','Firebase no está disponible. Puedes seguir guardando en este dispositivo.');announce('offline','Guardado localmente; Firebase no disponible.')}}
  addEventListener('online',()=>{if(role&&auth)resolveAccess()});addEventListener('offline',()=>announce('offline','Sin internet; cambios guardados en este dispositivo.'));
  setInterval(()=>{if(navigator.onLine&&lastServerAck<checkingSince&&Date.now()-checkingSince>15000)announce('offline','Firebase no respondió; datos locales disponibles.')},5000);
  init();
})();
