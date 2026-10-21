/* El administrador se abre sólo tras Google y comprobación del rol en Firestore. */
(() => {
  'use strict';
  const api=window.darkisSharedSync;
  const get=id=>document.getElementById(id);
  let booted=false,busy=false;
  function lock(){window.darkisAdminAuthorized=false;document.body.classList.add('admin-locked');const app=document.querySelector('.app');if(app)app.inert=true;document.querySelectorAll('.dx-modal.open').forEach(x=>x.classList.remove('open'));}
  function boot(){
    if(booted)return;
    // Ejecuta el código de finanzas en orden, una vez autorizada la cuenta.
    for(const source of document.querySelectorAll('script[data-admin-core]')){
      const script=document.createElement('script');script.textContent=source.textContent;document.body.append(script);source.remove();
    }
    booted=true;
  }
  function show(state={state:'loading'}){
    const allowed=state.state==='authorized'&&state.role==='admin'&&state.grant?.role==='admin'&&state.grant.enabled===true&&Boolean(state.uid);
    if(allowed){
      window.darkisAdminAuthorized=true;boot();document.body.classList.remove('admin-locked');const app=document.querySelector('.app');if(app)app.inert=false;
      get('adminAccountEmail').textContent=state.email||state.name||'Administrador';get('adminAccountBar').hidden=false;
      dispatchEvent(new Event('darkis-admin-ready'));return;
    }
    lock();get('adminAccountBar').hidden=true;
    const signed=Boolean(state.uid),pending=state.state==='pending',denied=state.state==='denied';
    get('adminLoginAccount').textContent=signed?state.email||state.name||'Cuenta Google conectada':'';
    get('adminLoginMessage').textContent=state.message||'Preparando el acceso con Google…';
    get('adminGoogleLogin').hidden=signed;get('adminGoogleLogin').disabled=busy||['loading'].includes(state.state);
    get('adminRetryLogin').hidden=!signed;
    get('adminChangeGoogle').hidden=!signed;
    get('adminRequestAccess').hidden=!pending;
    get('adminFirstAccess').hidden=!pending;
    get('adminAccountUid').value=pending?state.uid:'';
  }
  async function action(fn){busy=true;document.querySelectorAll('#adminGate button').forEach(x=>x.disabled=true);try{await fn()}catch(error){get('adminLoginMessage').textContent=window.darkisFirebaseError?.(error)||error.message}finally{busy=false;document.querySelectorAll('#adminGate button').forEach(x=>x.disabled=false);if(api?.accountState.state==='loading')get('adminGoogleLogin').disabled=true}}
  get('adminGoogleLogin').onclick=()=>action(()=>api.signInGoogle());
  get('adminChangeGoogle').onclick=()=>action(()=>api.changeAccount());
  get('adminRetryLogin').onclick=()=>action(()=>api.refreshAccess());
  get('adminRequestAccess').onclick=()=>action(()=>api.requestAccess());
  get('adminCopyUid').onclick=()=>action(async()=>{await navigator.clipboard.writeText(api.accountState.uid);get('adminLoginMessage').textContent='ID copiado. Úsalo para configurar el primer administrador en Firestore.'});
  get('adminGoogleLogout').onclick=()=>{lock();return action(()=>api.changeAccount())};
  addEventListener('darkis-access-state',event=>show(event.detail));
  addEventListener('offline',()=>{lock();get('adminLoginMessage').textContent='Conéctate a internet para verificar tu acceso de administrador.';get('adminRetryLogin').hidden=false});
  addEventListener('pagehide',lock);
  addEventListener('pageshow',event=>{if(event.persisted){lock();api?.refreshAccess()}});
  if(!api){lock();get('adminLoginMessage').textContent='No se pudo cargar Firebase. Abre de nuevo con internet.';return}
  show(api.accountState);
})();
