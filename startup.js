/* Presentación breve, independiente de Firebase y disponible sin conexión. */
(() => {
  const root=document.documentElement,screen=document.getElementById('darkisStartup');
  if(!screen)return;
  if(!root.classList.contains('darkis-starting')){screen.remove();return}
  const started=performance.now();let closed=false;
  function close(){if(closed)return;closed=true;screen.classList.add('is-leaving');setTimeout(()=>{root.classList.remove('darkis-starting');screen.remove()},440)}
  // No bloquea el acceso si las imágenes o la red fallan.
  setTimeout(close,3000);
  const images=[...screen.querySelectorAll('img')].map(img=>img.decode?img.decode().catch(()=>{}):Promise.resolve());
  Promise.all(images).then(()=>setTimeout(close,Math.max(0,1250-(performance.now()-started))));
  addEventListener('pageshow',event=>{if(event.persisted)close()});
})();
