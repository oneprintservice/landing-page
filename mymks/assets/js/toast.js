(function(){
  const rootId='ksp-toast-root';
  function ensure(){
    let root=document.getElementById(rootId);
    if(root)return root;
    root=document.createElement('div'); root.id=rootId; root.className='ksp-toast-root';
    root.setAttribute('aria-live','polite'); root.setAttribute('aria-atomic','true');
    document.body.appendChild(root); return root;
  }
  window.kspToast=function(message,type='info',duration=4200){
    const root=ensure(); const item=document.createElement('div');
    item.className='ksp-toast ksp-toast-'+type;
    const icon=type==='success'?'✓':type==='error'?'!':type==='warning'?'⚠':'i';
    item.innerHTML='<span class="ksp-toast-icon">'+icon+'</span><span class="ksp-toast-message"></span><button type="button" aria-label="Tutup notifikasi">×</button>';
    item.querySelector('.ksp-toast-message').textContent=message;
    const close=()=>{item.classList.add('is-leaving');setTimeout(()=>item.remove(),180)};
    item.querySelector('button').addEventListener('click',close); root.appendChild(item);
    if(duration>0)setTimeout(close,duration);
  };
})();
