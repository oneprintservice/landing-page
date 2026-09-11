(function(){
const s=JSON.parse(localStorage.getItem("ksp_session")||"null");
window.kspUser=()=>s; window.kspRole=()=>s?.role||null;
window.kspRequireRole=function(role){if(!s||s.expiresAt<Date.now()||(role&&s.role!==role)){location.href="../login.html";return false;}return true};
window.kspNotify=function(msg,type="info"){let e=document.getElementById("ksp-toast");if(!e){e=document.createElement("div");e.id="ksp-toast";e.style="position:fixed;top:16px;right:16px;z-index:9999;padding:12px 16px;border-radius:10px;background:#111827;color:white;max-width:calc(100% - 32px);box-shadow:0 4px 18px #0003";document.body.append(e)}e.textContent=msg;e.style.background=type==="error"?"#b91c1c":type==="success"?"#15803d":"#111827";clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.remove(),3200)};
window.kspFmt=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
window.kspEsc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
})();