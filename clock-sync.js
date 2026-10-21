/* Darkita usa su identidad anónima existente; no depende de la sesión Google. */
(() => {
  'use strict';
  const CONFIG={apiKey:'AIzaSyAzpjktTdrIBt-I89ZX98icGEMmhluXlo8',authDomain:'darkis-brownies.firebaseapp.com',projectId:'darkis-brownies',storageBucket:'darkis-brownies.firebasestorage.app',messagingSenderId:'66959378357',appId:'1:66959378357:web:a059509bea57560a243bfc'};
  const PREFIX='https://www.gstatic.com/firebasejs/12.19.0/';
  let sdk,auth,db,user=null,timer,syncing=false,dirty=false,retryMs=5000,starting=null,readyUid='',phase='inicio',lastError=null;
  function status(state, detail) {
    const indicator=document.getElementById('cloud'),label=document.getElementById('cloudText');
    if(indicator) indicator.className='cloud '+state;
    if(label) label.textContent=state==='online'?'Sincronizado':state==='connecting'?'Conectando…':'Pendiente de conexión';
    window.darkisClockStatus={state,detail,phase,code:lastError?.code||''};const notice=document.getElementById('clockConnectionNotice');if(notice){notice.hidden=state==='online'||(state==='connecting'&&!lastError);const text=document.getElementById('clockConnectionMessage');if(text)text.textContent=detail;}
    dispatchEvent(new CustomEvent('darkis-sync-status',{detail:window.darkisClockStatus}));
  }
  function problem(error){lastError={code:String(error?.code||error?.message||'connection-error'),message:String(error?.message||'').slice(0,300),phase};status('offline',navigator.onLine?window.darkisFirebaseError(error):'Sin internet; tus registros siguen guardados en este dispositivo.');}
  function timeout(promise,ms=14000){return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('timeout')),ms);Promise.resolve(promise).then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)})});}
  function retry(){clearTimeout(timer);if(!navigator.onLine)return;timer=setTimeout(()=>user?sync():start(),retryMs);retryMs=Math.min(retryMs*2,60000);}
  async function read(uid){
    phase='leer-perfil';const d=await timeout(sdk.getDocFromServer(sdk.doc(db,'timeclockEmployees',uid)));
    phase='leer-movimientos';const r=await timeout(sdk.getDocsFromServer(sdk.query(sdk.collection(db,'timeclockRecords'),sdk.where('ownerUid','==',uid))));
    phase='leer-cortes';const c=await timeout(sdk.getDocsFromServer(sdk.query(sdk.collection(db,'timeclockWeeklyCuts'),sdk.where('ownerUid','==',uid))));
    if(user?.uid!==uid)return false;
    window.clockApply?.({profiles:d.exists()?d.data()?.data?.profiles||[]:[],records:r.docs.map(x=>x.data().data).filter(Boolean),cuts:c.docs.map(x=>x.data().data).filter(Boolean)});
    await syncProduction([],uid);readyUid=uid;return true;
  }
  const sent=new Map();
  let productionReadUid='';
  async function syncProduction(rows,uid=user?.uid){if(!uid)return;try{
    if(productionReadUid!==uid){const found=await timeout(sdk.getDocsFromServer(sdk.query(sdk.collection(db,'productionRecords'),sdk.where('ownerUid','==',uid))));window.DarkisProduction?.apply(found.docs.map(x=>x.data().data).filter(Boolean));productionReadUid=uid;}
    for(const row of rows||[]){await write(['productionRecords',row.id],{...row,ownerUid:uid})}
    window.DarkisProduction?.setStatus('Producción sincronizada con Firebase.');
  }catch(error){window.DarkisProduction?.setStatus('Producción guardada en este celular. Pendiente de nube: '+(error.code||error.message)+'. Revisa las reglas v22 y pulsa Reintentar conexión.');}}

  async function write(parts,data){
    const key=parts.join('/'),fingerprint=JSON.stringify(data);
    if(sent.get(key)===fingerprint)return;
    phase='guardar-'+parts[0];await timeout(sdk.setDoc(sdk.doc(db,...parts),{ownerUid:user.uid,data,updatedAt:sdk.serverTimestamp()}));
    sent.set(key,fingerprint);
  }
  async function sync(){
    dirty=true;
    if(syncing)return;
    if(!user||!db){start();return}
    if(!navigator.onLine){status('offline','Sin internet; tus registros siguen guardados en este dispositivo.');return}
    syncing=true;clearTimeout(timer);
    try{
      status('connecting','Comprobando y guardando los horarios en Firebase…');
      if(readyUid!==user.uid && !await read(user.uid))return;
      do{
        dirty=false;
        const snapshot=window.clockSnapshot?.();if(!snapshot)return;
        await write(['timeclockEmployees',user.uid],{profiles:snapshot.profiles,deviceId:snapshot.deviceId});
        for(const row of snapshot.records){const data={...row,ownerUid:user.uid};await write(['timeclockRecords',row.id],data)}
        for(const row of snapshot.cuts){const data={...row,ownerUid:user.uid};await write(['timeclockWeeklyCuts',row.id],data)}
        await syncProduction(snapshot.production||[]);
      }while(dirty);
      // Confirma disponibilidad del servidor aunque no haya datos nuevos.
      phase='confirmar-servidor';await timeout(sdk.getDocFromServer(sdk.doc(db,'timeclockEmployees',user.uid)));
      retryMs=5000;lastError=null;status('online','Firebase confirmó tus horarios.');
    }catch(error){dirty=true;problem(error);retry()}
    finally{syncing=false}
  }
  function schedule(){dirty=true;clearTimeout(timer);timer=setTimeout(sync,500)}
  async function copyDiagnostic(){const report=['Sistema Darkis v22','Área: Darkita','Conexión: '+(window.darkisClockStatus?.state||'sin comprobar'),'Etapa: '+(lastError?.phase||phase),'Código: '+(lastError?.code||'sin error'),'Detalle: '+(lastError?.message||window.darkisClockStatus?.detail||''),'Identidad del reloj: '+(user?.uid||'todavía sin sesión'),'Proveedor: '+(user?.isAnonymous?'anónimo':user?'sesión existente':'pendiente'),'Internet: '+navigator.onLine,'Origen: '+location.origin,'Fecha: '+new Date().toISOString()].join('\n');try{await navigator.clipboard.writeText(report);const button=document.getElementById('clockCopyConnection');if(button)button.textContent='Diagnóstico copiado'}catch{const message=document.getElementById('clockConnectionMessage');if(message)message.textContent=report}}
  window.clockCloud={schedule,sync,diagnostic:copyDiagnostic};
  document.getElementById('clockRetryConnection')?.addEventListener('click',()=>{retryMs=5000;user?sync():start()});
  document.getElementById('clockCopyConnection')?.addEventListener('click',copyDiagnostic);
  async function start(){
    if(starting)return starting;
    starting=(async()=>{
      status('connecting','Preparando Firebase…');
      try{
        if(!sdk){
          phase='cargar-sdk';const [appSdk,authSdk,firestoreSdk]=await Promise.all([import(PREFIX+'firebase-app.js'),import(PREFIX+'firebase-auth.js'),import(PREFIX+'firebase-firestore.js')]);
          sdk={...authSdk,...firestoreSdk};
          const app=appSdk.getApps().find(x=>x.name==='darkis-timeclock')||appSdk.initializeApp(CONFIG,'darkis-timeclock');
          auth=authSdk.getAuth(app);
          try{db=firestoreSdk.initializeFirestore(app,{localCache:firestoreSdk.persistentLocalCache({tabManager:firestoreSdk.persistentMultipleTabManager()})})}catch{db=firestoreSdk.getFirestore(app)}
          phase='persistencia';await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
          authSdk.onAuthStateChanged(auth,u=>{
            user=u;window.clockOwner=u?.uid||null;
            if(u){if(readyUid!==u.uid)sent.clear();sync()}
            else {phase='acceso-anónimo';authSdk.signInAnonymously(auth).catch(error=>{problem(error);retry()})}
          });
        }else if(auth.currentUser){user=auth.currentUser;sync()}
        else {phase='acceso-anónimo';await sdk.signInAnonymously(auth);}
      }catch(error){sdk=null;problem(error);retry()}
    })().finally(()=>{starting=null});
    return starting;
  }
  addEventListener('online',()=>{retryMs=5000;user?sync():start()});
  addEventListener('offline',()=>{clearTimeout(timer);status('offline','Sin internet; tus registros siguen guardados en este dispositivo.')});
  start();
})();
