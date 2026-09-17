
/* KSP Manager shared runtime */
(function(){
  const KEY="ksp_session";
  window.kspSession = {
    get(){ try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){return null} },
    save(role,user){ const d=new Date(); const next=new Date(d); if(d.getHours()>=5) next.setDate(next.getDate()+1); next.setHours(5,0,0,0); localStorage.setItem(KEY,JSON.stringify({role,user,expiresAt:next.getTime()})); },
    clear(){localStorage.removeItem(KEY)},
    valid(){const s=this.get(); if(!s) return false; if(Date.now()>=Number(s.expiresAt||0)){this.clear();return false} return true}
  };
  window.kspRequireRole=function(roles){
    const s=window.kspSession.get();
    if(!s || Date.now()>=Number(s.expiresAt||0)){window.kspSession.clear(); location.href="../login.html"; return null}
    if(!roles.includes(s.role)){ location.href=s.role==="admin"?"../admin/dashboard.html":"../lapangan/dashboard.html"; return null}
    return s;
  };
  window.kspLogout=function(){window.kspSession.clear(); location.href="../login.html"};
  window.kspNotify=function(message,type="success",title=""){
    let host=document.getElementById("ksp-toast-host");
    if(!host){host=document.createElement("div");host.id="ksp-toast-host";host.className="ksp-toast-host";document.body.appendChild(host)}
    const el=document.createElement("div"); el.className="ksp-toast "+type;
    const icons={success:"✓",error:"!",info:"i",warning:"!"};
    el.innerHTML=`<div class="ksp-toast-icon">${icons[type]||"i"}</div><div class="ksp-toast-body">${title?`<strong>${title}</strong>`:""}<span>${message}</span></div><button aria-label="Tutup">×</button>`;
    el.querySelector("button").onclick=()=>el.remove(); host.appendChild(el);
    const ms=type==="error"?6000:4000; setTimeout(()=>el.remove(),ms);
  };
  window.kspFormatRupiah=function(v){return "Rp "+Number(v||0).toLocaleString("id-ID")};
  window.kspInputThousand=function(input){
    if(!input) return;
    input.inputMode="numeric";
    input.addEventListener("input",()=>{input.value=input.value.replace(/\D/g,"")});
    input.dataset.multiplier="1000";
  };
  window.kspNominal=function(v){return Math.round(Number(v||0)*1000)};
  window.kspFmtDate=function(v){if(!v)return "-"; const d=new Date(v); return Number.isNaN(d.getTime())?"-":d.toLocaleDateString("id-ID")};
  window.kspEscape=function(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))};
  window.kspScoreClass=function(s){s=Number(s??10); return s<=3?"bad":s<=6?"warn":"good"};
  window.kspScoreLabel=function(s){s=Number(s??10); return s<=3?"Diblokir":s<=6?"Perhatian":"Baik"};
  window.kspStartSessionGuard=function(){
    const s=window.kspSession.get(); if(!s)return;
    const check=()=>{if(Date.now()>=Number((window.kspSession.get()||{}).expiresAt||0)){window.kspLogout()}};
    setInterval(check,30000); check();
  };
})();
