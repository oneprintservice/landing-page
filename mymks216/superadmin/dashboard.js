const TABLES=[
"nasabah","pengajuan_kredit","pinjaman","angsuran","ledger_harian"];
const $=id=>document.getElementById(id);
const show=msg=>window.kspNotify(msg,"error","Superadmin");
function esc(v){return window.kspEscape(v)}
async function roleCheck(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){location.href="login.html";return null}
  const {data:role,error}=await supabaseClient.rpc("ksp_current_role");
  if(error||role!=="superadmin"){await supabaseClient.auth.signOut();location.href="login.html";return null}
  $("identity").innerHTML=`Login: <strong>${esc(session.user.email)}</strong> · Role: <strong>${esc(role)}</strong>`;
  return session;
}
function switchTab(tab){document.querySelectorAll(".sa-section").forEach(x=>x.classList.toggle("active",x.id===tab));document.querySelectorAll(".sa-bottom [data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));if(tab==="users")loadUsers();if(tab==="audit")loadAudit();if(tab==="overview")loadStats();}
async function loadStats(){
  const results=await Promise.all(TABLES.map(t=>supabaseClient.from(t).select("id",{count:"exact",head:true})));
  $("stats").innerHTML=TABLES.map((t,i)=>`<div class="sa-stat"><small>${esc(t.replaceAll("_"," "))}</small><strong>${results[i].error?"-":results[i].count??0}</strong></div>`).join("");
}
async function loadUsers(){
  const {data,error}=await supabaseClient.from("ksp_profiles").select("user_id,role,display_name,is_active,created_at").order("created_at",{ascending:true});
  if(error){$("usersList").textContent="Gagal membaca profil: "+error.message;return}
  $("usersList").innerHTML=`<table class="sa-table"><thead><tr><th>Nama</th><th>User ID</th><th>Role</th><th>Status</th></tr></thead><tbody>${(data||[]).map(u=>`<tr><td>${esc(u.display_name||"-")}</td><td>${esc(u.user_id)}</td><td><span class="sa-badge role">${esc(u.role)}</span></td><td><span class="sa-badge ${u.is_active?"good":"off"}">${u.is_active?"Aktif":"Nonaktif"}</span></td></tr>`).join("")||`<tr><td colspan="4">Belum ada profil.</td></tr>`}</tbody></table>`;
}
async function loadAudit(){
  const {data,error}=await supabaseClient.from("ksp_audit_log").select("id,actor_user_id,action,target_table,target_id,metadata,created_at").order("created_at",{ascending:false}).limit(100);
  if(error){$("auditList").textContent="Audit log belum tersedia: "+error.message;return}
  $("auditList").innerHTML=`<table class="sa-table"><thead><tr><th>Waktu</th><th>Aksi</th><th>Tabel</th><th>Target</th><th>Actor</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${esc(new Date(x.created_at).toLocaleString("id-ID"))}</td><td>${esc(x.action)}</td><td>${esc(x.target_table||"-")}</td><td>${esc(x.target_id||"-")}</td><td>${esc(x.actor_user_id||"-")}</td></tr>`).join("")||`<tr><td colspan="5">Belum ada log.</td></tr>`}</tbody></table>`;
}
async function resetDemo(){
  const {data,error}=await supabaseClient.rpc("ksp_reset_demo");
  $("resetResult").style.display="block";
  if(error){$("resetResult").textContent="GAGAL: "+error.message;show(error.message);return}
  $("resetResult").textContent=JSON.stringify(data,null,2);window.kspNotify("Data demo berhasil direset.","success","Reset selesai");await loadStats();await loadAudit();
}
async function backup(){
  const out={version:1,created_at:new Date().toISOString(),tables:{}};
  for(const t of TABLES){const {data,error}=await supabaseClient.from(t).select("*");if(error){show(`Backup ${t} gagal: ${error.message}`);return}out.tables[t]=data||[];}
  const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ksp-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$("backupResult").style.display="block";$("backupResult").textContent=TABLES.map(t=>`${t}: ${out.tables[t].length} baris`).join("\n");await audit("BACKUP","system","-");}
async function audit(action,targetTable,targetId){try{await supabaseClient.rpc("ksp_write_audit",{p_action:action,p_target_table:targetTable,p_target_id:targetId,p_metadata:{source:"superadmin-ui"}})}catch(e){}}
async function restore(file){
  let parsed;try{parsed=JSON.parse(await file.text())}catch(e){show("File JSON tidak valid.");return}
  if(!parsed||parsed.version!==1||!parsed.tables){show("Format backup KSP tidak dikenali.");return}
  if(!confirm("RESTORE akan mengganti seluruh data operasional saat ini. Lanjutkan?"))return;
  const {data:resetData,error:resetError}=await supabaseClient.rpc("ksp_reset_demo");
  if(resetError){show("Restore dibatalkan saat reset: "+resetError.message);return}
  const order=["nasabah","pengajuan_kredit","pinjaman","angsuran","ledger_harian"];
  for(const t of order){const rows=Array.isArray(parsed.tables[t])?parsed.tables[t]:[];if(!rows.length)continue;for(let i=0;i<rows.length;i+=100){const {error}=await supabaseClient.from(t).insert(rows.slice(i,i+100));if(error){show(`Restore ${t} gagal: ${error.message}`);$("restoreResult").style.display="block";$("restoreResult").textContent=JSON.stringify({resetData,error:error.message,table:t},null,2);return}}}
  await audit("RESTORE","system","-");$("restoreResult").style.display="block";$("restoreResult").textContent="Restore berhasil.\n"+order.map(t=>`${t}: ${(parsed.tables[t]||[]).length} baris`).join("\n");window.kspNotify("Restore selesai.","success","Superadmin");await loadStats();await loadAudit();
}

document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
$("resetConfirm").addEventListener("input",e=>$("resetBtn").disabled=e.target.value.trim()!=="RESET DEMO 2");
$("resetBtn").onclick=async()=>{if(!confirm("Hapus seluruh data demo sekarang?"))return;await resetDemo()};
$("backupBtn").onclick=backup;
$("restoreFile").addEventListener("change",e=>$("restoreBtn").disabled=!e.target.files?.[0]);
$("restoreBtn").onclick=()=>restore($("restoreFile").files[0]);
$("logout").onclick=async()=>{await supabaseClient.auth.signOut();location.href="login.html"};
(async()=>{if(await roleCheck())await loadStats()})();
