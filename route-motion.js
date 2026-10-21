/* Las actualizaciones del servidor conservan las tarjetas y la posición de lectura. */
(() => {
 'use strict';const host=document.getElementById('routeClientCards');if(!host)return;
 function render(html){const fragment=document.createElement('template');fragment.innerHTML=html;const incoming=[...fragment.content.children];const existing=new Map([...host.children].map(n=>[n.dataset.clientId,n]));
   const animateNew=host.children.length===0;let cursor=host.firstElementChild;
   for(const next of incoming){const old=existing.get(next.dataset.clientId);let node=old||next;
     if(old){existing.delete(next.dataset.clientId);if(old.innerHTML!==next.innerHTML)old.innerHTML=next.innerHTML;old.className=next.className;}
     if(node!==cursor)host.insertBefore(node,cursor);else cursor=cursor.nextElementSibling;
     if(!old&&animateNew){node.classList.add('route-card-arriving');node.addEventListener('animationend',()=>node.classList.remove('route-card-arriving'),{once:true})}
   }
   for(const node of existing.values())node.remove();
 }
 window.DarkisRouteMotion={render};
})();
