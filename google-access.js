/* Pantalla de cuenta y autorizaciones para Firebase Spark. */
(() => {
  'use strict';
  const api=window.darkisSharedSync;if(!api)return;
  const style=document.createElement('style');style.textContent='.ga-uid{width:100%;padding:10px;border:1px solid #cddfe6;border-radius:10px;background:#f4fafc;color:#17435c;font:11px monospace}.ga-account{margin:10px 0;color:#416275;font-size:12px;overflow-wrap:anywhere}.ga-row{padding:13px 0;border-bottom:1px solid #dbe6eb}.ga-row b{display:block}.ga-row small{display:block;overflow-wrap:anywhere;color:#607988}.ga-row select{margin-top:8px}.ga-list{margin-top:12px}.ga-message{padding:10px;border-radius:10px;background:#fff2dd;color:#805717;margin-top:12px;font-size:12px}.ga-back{color:#087eae;border:0;background:transparent;font:700 13px system-ui;padding:0;margin-bottom:10px;cursor:pointer}';document.head.append(style);
  const overlay=document.createElement('div');overlay.className='dx-modal';overlay.id='googleAccessModal';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.innerHTML='<div class="dx-panel"><button type="button" class="dx-close" aria-label="Cerrar">×</button><div id="googleAccessBody"></div></div>';document.body.append(overlay);
  const body=overlay.querySelector('#googleAccessBody');let manual=false,manager=false;
  const close=()=>{overlay.classList.remove('open');manual=false;manager=false};overlay.querySelector('.dx-close').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  function el(tag,text,className=''){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
  function button(text,action,secondary=false){const node=el('button',text,secondary?'secondary':'');node.type='button';node.onclick=async()=>{node.disabled=true;try{await action()}catch(error){message(error.message||'No se pudo completar la acción.')}finally{node.disabled=false}};return node}
  function actions(...nodes){const row=el('div',undefined,'dx-actions');row.append(...nodes);body.append(row)}
  function message(text){body.querySelector('.ga-message')?.remove();body.append(el('div',text,'ga-message'))}
  function areaName(s){return s.role==='admin'?'Administrador':s.role==='route'?'Repartidor':s.profileId==='sofia'?'Sofi':s.profileId==='tania'?'Tania':s.profileId==='juan-pablo'?'Juan Pablo':'Darkis'}
  function render(state=api.accountState,force=false){
    if(manager&&!force)return;
    if(state.state==='authorized'&&!manual){overlay.classList.remove('open');return}
    if(state.state==='idle'&&!manual){overlay.classList.remove('open');return}
    body.replaceChildren();const logo=el('img');logo.src='logo.png';logo.alt='Darkis Brownies';body.append(logo,el('h2',state.state==='authorized'?'Cuenta conectada':'Conectar '+areaName(state)));
    const user=state.uid?`${state.email||state.name||'Cuenta Google'} · ${state.uid}`:'';
    if(user)body.append(el('div',user,'ga-account'));
    if(state.state==='authorized'){
      body.append(el('p',state.role==='admin'?'Tu cuenta Google está autorizada para Administrador. Se comprobará el permiso al volver a abrir el panel.':'Tu cuenta está autorizada. Este dispositivo recordará la sesión de Google; el PIN seguirá abriendo la interfaz.'));
      actions(button('Comprobar conexión',()=>api.refreshAccess()),button('Cambiar Google',()=>api.changeAccount(),true));
      if(state.grant?.role==='admin')actions(button('Administrar accesos',showManager));
      return;
    }
    if(state.state==='idle'){
      body.append(el('p',state.message||'Elige tu área en el inicio. La conexión y los permisos se verifican por separado.'));
      actions(button('Comprobar Firebase',()=>api.refreshAccess()),button('Volver al inicio',async()=>close(),true));if(state.uid)actions(button('Cambiar Google',()=>api.changeAccount(),true));
      return;
    }
    if(!state.role&&state.state==='error'){body.append(el('p',state.message));actions(button('Reintentar conexión',()=>api.refreshAccess()),button('Volver al inicio',async()=>close(),true));return}
    body.append(el('p',state.message||'Usa Google una vez para conectar los datos en este dispositivo.'));
    if(state.state==='needs-login'||!state.uid){
      actions(button('Continuar con Google',()=>api.signInGoogle()));
    }else{
      if(state.state!=='denied')actions(button('Solicitar acceso',()=>api.requestAccess()));
      actions(button('Ya me autorizaron',()=>api.refreshAccess()),button('Cambiar Google',()=>api.changeAccount(),true));
      if(state.role==='admin'&&!state.grant){
        body.append(el('div','Primera configuración: el propietario del proyecto debe crear el permiso de administrador con este ID. La guía Firebase incluida indica los tres campos.','dx-note'));
        const input=el('input',undefined,'ga-uid');input.value=state.uid;input.readOnly=true;input.setAttribute('aria-label','ID de cuenta para configurar al primer administrador');body.append(input);
        actions(button('Copiar mi ID',async()=>{await navigator.clipboard.writeText(state.uid);message('ID copiado.')} ,true));
      }
    }
    actions(button('Seguir en este dispositivo',async()=>close(),true));
    body.append(el('div','Sin autorización de Google, los registros nuevos quedan pendientes de sincronizar.','dx-note'));
  }
  const CHOICES=[['route','Repartidor'],['tania','Darkisocio · Tania'],['sofia','Darkisocio · Sofi'],['juan-pablo','Darkisocio · Juan Pablo'],['admin','Administrador']];
  function selectedGrant(value,email){return{role:['admin','route'].includes(value)?value:'socio',profileId:['admin','route'].includes(value)?'':value,enabled:true,email}}
  async function showManager(){
    manager=true;body.replaceChildren(el('h2','Accesos de Google'),el('p','Cargando solicitudes…'));overlay.classList.add('open');
    try{const data=await api.listAccess();body.replaceChildren();const back=el('button','← Mi cuenta','ga-back');back.type='button';back.onclick=()=>{manager=false;manual=true;render(api.accountState,true)};body.append(back,el('h2','Autorizar cuentas'),el('p','Asigna a cada cuenta el área que podrá consultar en Firebase.'));
      const own=api.accountState.uid,roles=new Map(data.roles.map(x=>[x.id,x]));
      const requests=data.requests.filter(x=>x.id!==own&&!roles.get(x.id)?.enabled);
      if(!requests.length)body.append(el('div','No hay solicitudes pendientes.','dx-note'));
      for(const request of requests){const row=el('div',undefined,'ga-row');row.append(el('b',request.name||request.email||request.id),el('small',request.email||request.id));const select=el('select');select.setAttribute('aria-label','Área autorizada para '+(request.email||request.name));for(const [value,label]of CHOICES){const option=el('option',label);option.value=value;select.append(option)}select.value=request.desiredRole==='socio'?request.profileId:request.desiredRole;row.append(select);const controls=el('div',undefined,'dx-actions');controls.append(button('Autorizar',async()=>{await api.setAccess(request.id,selectedGrant(select.value,request.email||''));await showManager()}));row.append(controls);body.append(row)}
      body.append(el('h2','Cuentas autorizadas'));
      for(const record of data.roles){const row=el('div',undefined,'ga-row');row.append(el('b',record.email||record.id),el('small',`${record.role==='socio'?record.profileId:record.role} · ${record.enabled?'Activa':'Desactivada'}`));if(record.id!==own){const controls=el('div',undefined,'dx-actions');controls.append(button(record.enabled?'Desactivar':'Reactivar',async()=>{await api.setAccess(record.id,{...record,enabled:!record.enabled});await showManager()},true));row.append(controls)}else row.append(el('small','Tu cuenta administradora'));body.append(row)}
    }catch(error){body.replaceChildren(el('h2','No se pudieron leer los accesos'));message(error.message);actions(button('Volver',async()=>{manager=false;render(api.accountState,true)},true))}
  }
  function openAccount(){manual=true;manager=false;render(api.accountState,true);overlay.classList.add('open')}
  addEventListener('darkis-open-account',openAccount);
  addEventListener('darkis-access-state',e=>{const state=e.detail;manager=false;render(state);if(document.body.dataset.darkisPage!=='administrador'&&['needs-login','pending','denied'].includes(state.state))overlay.classList.add('open')});
  const settings=document.querySelector('#dxSettings .dx-panel');if(settings){const row=el('div',undefined,'dx-actions');row.append(button('Cuenta Google y permisos',async()=>{document.querySelector('#dxSettings')?.classList.remove('open');openAccount()},true));settings.append(row)}
  if(document.body.dataset.darkisPage!=='administrador'&&['needs-login','pending','denied'].includes(api.accountState.state)){render();overlay.classList.add('open')}
})();
