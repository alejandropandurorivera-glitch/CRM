/* Presentación única de la web: espera acotada, sin bloquear el uso offline. */
(() => {
 const root=document.documentElement,screen=document.getElementById('darkisStartup');if(!screen)return;
 if(!root.classList.contains('darkis-starting')){screen.remove();return}
 const started=performance.now(),minimum=1750,maximum=5500;let imagesReady=false,settled=false,closed=false,minTimer,maxTimer;
 function close(){if(closed)return;closed=true;clearTimeout(minTimer);clearTimeout(maxTimer);removeEventListener('darkis-sync-status',onStatus);screen.classList.add('is-leaving');setTimeout(()=>{root.classList.remove('darkis-starting');screen.remove()},360)}
 function check(){if(!imagesReady)return;const elapsed=performance.now()-started;if(elapsed<minimum){clearTimeout(minTimer);minTimer=setTimeout(check,minimum-elapsed);return}if(settled||!navigator.onLine)close()}
 function onStatus(event){const status=event.detail?.state;if(['online','offline','waiting','local'].includes(status)){settled=true;check()}}
 addEventListener('darkis-sync-status',onStatus);
 const current=window.darkisClockStatus||window.darkisSyncStatus;if(current)onStatus({detail:current});
 Promise.all([...screen.querySelectorAll('img')].map(img=>img.decode?img.decode().catch(()=>{}):Promise.resolve())).then(()=>{imagesReady=true;check()});
 // No hace falta obtener credenciales para cerrar la presentación y poder elegir área.
 maxTimer=setTimeout(close,maximum);
 addEventListener('pageshow',event=>{if(event.persisted)close()});
})();
