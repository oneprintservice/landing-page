(function(){
  'use strict';
  const toggle=document.getElementById('mobile-menu-toggle');
  const sidebar=document.getElementById('app-sidebar');
  const backdrop=document.getElementById('mobile-menu-backdrop');
  function close(){sidebar?.classList.remove('mobile-open');backdrop?.classList.remove('show');document.body.classList.remove('menu-open');}
  function open(){sidebar?.classList.add('mobile-open');backdrop?.classList.add('show');document.body.classList.add('menu-open');}
  toggle?.addEventListener('click',()=> sidebar?.classList.contains('mobile-open') ? close() : open());
  backdrop?.addEventListener('click',close);
  sidebar?.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();
