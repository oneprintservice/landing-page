const TABLES=["nasabah","pengajuan_kredit","pinjaman","angsuran","ledger_harian"];
const $=id=>document.getElementById(id);
const show=msg=>window.kspNotify(msg,"error","Superadmin");
const EDGE_FN=`${SUPABASE_URL}/functions/v1/manage-user`;
function esc(v){return window.kspEscape(v)}
async function roleCheck(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){location.href="login.html";return null}
  const {data:role,error}=await supabaseClient.rpc("ksp_current_role");
  if(error||role!=="superadmin"){await supabaseClient.auth.signOut();location.href="login.html";return null}
  // The operational Admin pages use the shared app session in addition to Supabase Auth.
  window.kspSession.save("superadmin",session.user.email||"Owner");
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
  const rows=(data||[]).map(u=>{
    const protectedUser=u.role==="superadmin";
    return `<tr>
      <td><input class="sa-name-input" data-user="${esc(u.user_id)}" data-field="name" value="${esc(u.display_name||"")}" ${protectedUser?"disabled":""}></td>
      <td><code>${esc(u.user_id)}</code></td>
      <td><select class="sa-role-select" data-user="${esc(u.user_id)}" data-field="role" ${protectedUser?"disabled":""}><option value="admin" ${u.role==="admin"?"selected":""}>admin</option><option value="lapangan" ${u.role==="lapangan"?"selected":""}>lapangan</option><option value="superadmin" ${u.role==="superadmin"?"selected":""}>superadmin</option></select></td>
      <td><span class="sa-badge ${u.is_active?"good":"off"}">${u.is_active?"Aktif":"Nonaktif"}</span></td>
      <td><div class="sa-inline-actions">${protectedUser?`<span class="sa-muted">Dilindungi</span>`:`<button class="sa-btn sa-btn-primary" data-action="save-user" data-user="${esc(u.user_id)}" data-active="${u.is_active}">Simpan</button><button class="sa-btn sa-btn-light" data-action="toggle-user" data-user="${esc(u.user_id)}" data-active="${u.is_active}">${u.is_active?"Nonaktifkan":"Aktifkan"}</button><button class="sa-btn sa-btn-danger" data-action="delete-user" data-user="${esc(u.user_id)}">Hapus</button>`}</div></td>
    </tr>`;
  }).join("");
  $("usersList").innerHTML=`<table class="sa-table"><thead><tr><th>Nama</th><th>User ID</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows||`<tr><td colspan="5">Belum ada profil.</td></tr>`}</tbody></table>`;
}
async function loadAudit(){
  const {data,error}=await supabaseClient.from("ksp_audit_log").select("id,actor_user_id,action,target_table,target_id,metadata,created_at").order("created_at",{ascending:false}).limit(100);
  if(error){$("auditList").textContent="Audit log belum tersedia: "+error.message;return}
  $("auditList").innerHTML=`<table class="sa-table"><thead><tr><th>Waktu</th><th>Aksi</th><th>Tabel</th><th>Target</th><th>Actor</th><th>Detail</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${esc(new Date(x.created_at).toLocaleString("id-ID"))}</td><td>${esc(x.action)}</td><td>${esc(x.target_table||"-")}</td><td>${esc(x.target_id||"-")}</td><td>${esc(x.actor_user_id||"-")}</td><td>${esc(JSON.stringify(x.metadata||{}))}</td></tr>`).join("")||`<tr><td colspan="6">Belum ada log.</td></tr>`}</tbody></table>`;
}
async function edge(action,payload={}){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session) throw new Error("Sesi Superadmin berakhir.");

  // Gunakan SDK Supabase agar URL, Authorization dan refresh session
  // ditangani konsisten. Ini juga memberi error yang lebih jelas bila
  // Edge Function belum dideploy.
  const {data,error}=await supabaseClient.functions.invoke("manage-user",{
    body:{action,...payload}
  });

  if(error){
    const msg=String(error.message||error);
    if(/failed to fetch|failed to send a request|network/i.test(msg)){
      throw new Error("Layanan manage-user belum dapat dihubungi. Pastikan Edge Function 'manage-user' sudah dideploy di Supabase.");
    }
    throw new Error(msg);
  }
  if(data?.error) throw new Error(String(data.error));
  return data||{};
}

async function checkUserService(){
  const box=$("userServiceStatus");
  box.className="sa-service-status checking";
  box.textContent="Memeriksa Edge Function manage-user...";
  try{
    const out=await edge("ping");
    box.className="sa-service-status ok";
    box.textContent=`Layanan akun aktif · ${out.service||"manage-user"}`;
  }catch(e){
    box.className="sa-service-status error";
    box.textContent=e.message;
  }
}

async function createUser(){
  const email=$("newEmail").value.trim(), display_name=$("newDisplayName").value.trim(), role=$("newRole").value, password=$("newPassword").value;
  if(!email||!display_name||!password){show("Email, nama, dan password wajib diisi.");return}
  if(password.length<8){show("Password minimal 8 karakter.");return}
  try{await edge("create",{email,display_name,role,password,is_active:true});window.kspNotify("Akun berhasil dibuat.","success","User baru");$("newEmail").value=$("newDisplayName").value=$("newPassword").value="";await loadUsers();await loadAudit()}catch(e){show(e.message)}
}
async function saveUser(userId){
  const name=document.querySelector(`[data-user="${CSS.escape(userId)}"][data-field="name"]`)?.value.trim();
  const role=document.querySelector(`[data-user="${CSS.escape(userId)}"][data-field="role"]`)?.value;
  const button=document.querySelector(`button[data-action="save-user"][data-user="${CSS.escape(userId)}"]`);
  const isActive=button?.dataset.active !== "false";
  if(!name){show("Nama tampilan wajib diisi.");return}
  try{await edge("update",{user_id:userId,display_name:name,role,is_active:isActive});window.kspNotify("Profil berhasil diperbarui.","success","User");await loadUsers();await loadAudit()}catch(e){show(e.message)}
}
async function toggleUser(userId,active){
  const action=active?"disable":"update";
  const role=document.querySelector(`[data-user="${CSS.escape(userId)}"][data-field="role"]`)?.value;
  const name=document.querySelector(`[data-user="${CSS.escape(userId)}"][data-field="name"]`)?.value.trim();
  if(active && !confirm("Nonaktifkan akun ini? Pengguna tidak akan bisa login lagi."))return;
  try{await edge(action,{user_id:userId,display_name:name,role,is_active:!active});window.kspNotify(active?"Akun dinonaktifkan.":"Akun diaktifkan.","success","User");await loadUsers();await loadAudit()}catch(e){show(e.message)}
}
async function deleteUser(userId){
  if(!confirm("Hapus akun Admin/Lapangan secara permanen dari Supabase Auth? Data operasional nasabah tidak ikut dihapus."))return;
  if(!confirm("Konfirmasi terakhir: HAPUS AKUN ini?"))return;
  try{await edge("delete",{user_id:userId});window.kspNotify("Akun berhasil dihapus.","success","User");await loadUsers();await loadAudit()}catch(e){show(e.message)}
}
async function resetDemo(){
  const {data,error}=await supabaseClient.rpc("ksp_reset_demo");
  $("resetResult").style.display="block";
  if(error){$("resetResult").textContent="GAGAL: "+error.message;show(error.message);return}
  $("resetResult").textContent=JSON.stringify(data,null,2);window.kspNotify("Data demo berhasil direset.","success","Reset selesai");await loadStats();await loadAudit();
}
async function sha256(text){const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function backup(){
  const base={version:1,created_at:new Date().toISOString(),tables:{}};
  for(const t of TABLES){const {data,error}=await supabaseClient.from(t).select("*");if(error){show(`Backup ${t} gagal: ${error.message}`);return}base.tables[t]=data||[];}
  const canonical=JSON.stringify(base);const out={...base,sha256:await sha256(canonical)};
  const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ksp-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$("backupResult").style.display="block";$("backupResult").textContent=TABLES.map(t=>`${t}: ${out.tables[t].length} baris`).join("\n")+`\nSHA-256: ${out.sha256}`;await audit("BACKUP","system","-",{sha256:out.sha256});
}
async function audit(action,targetTable,targetId,metadata={}){try{await supabaseClient.rpc("ksp_write_audit",{p_action:action,p_target_table:targetTable,p_target_id:targetId,p_metadata:metadata})}catch(e){console.warn("Audit gagal",e)}}
async function restore(file){
  const result=$("restoreResult"), button=$("restoreBtn");
  result.style.display="block";
  const status=message=>{result.textContent=message};
  button.disabled=true;
  try{
    if(!file) throw new Error("Pilih file backup JSON terlebih dahulu.");
    status("Membaca dan memeriksa file backup...");
    const parsed=JSON.parse(await file.text());
    if(!parsed || parsed.version!==1 || !parsed.tables || typeof parsed.tables!=="object")
      throw new Error("Format backup KSP tidak dikenali.");
    for(const table of TABLES){
      if(!Array.isArray(parsed.tables[table]))
        throw new Error(`Backup tidak lengkap: tabel ${table} tidak berupa array.`);
    }
    if(!parsed.sha256) throw new Error("Backup tidak memiliki checksum SHA-256.");
    // Jangan beri nama variabel sha256: itu menimpa fungsi sha256() dan
    // membuat restore versi sebelumnya berhenti tanpa pesan.
    const {sha256: savedChecksum,...withoutHash}=parsed;
    const expectedChecksum=await sha256(JSON.stringify(withoutHash));
    if(savedChecksum!==expectedChecksum)
      throw new Error("Checksum SHA-256 tidak cocok. File backup berubah atau rusak.");
    const expectedCounts=Object.fromEntries(TABLES.map(t=>[t,parsed.tables[t].length]));
    status("Backup valid. Jumlah record: "+JSON.stringify(expectedCounts));
    if(!confirm("RESTORE akan mengganti seluruh data operasional saat ini. Backup telah divalidasi. Lanjutkan?")){
      status("Restore dibatalkan. Database tidak diubah.");return;
    }
    status("Mengirim backup ke Supabase. Jangan tutup halaman...");
    const {data,error}=await supabaseClient.rpc("ksp_restore_backup",{p_backup:parsed});
    if(error) throw new Error("RPC restore gagal: "+error.message);
    status("Restore diproses. Memeriksa jumlah record pada database...");
    const actualCounts={};
    for(const t of TABLES){
      const {count,error:countError}=await supabaseClient.from(t).select("*",{count:"exact",head:true});
      if(countError) throw new Error(`Restore diproses, tetapi verifikasi ${t} gagal: ${countError.message}`);
      actualCounts[t]=count;
    }
    const mismatch=TABLES.filter(t=>actualCounts[t]!==expectedCounts[t]);
    if(mismatch.length) throw new Error("Restore diproses tetapi verifikasi jumlah TIDAK cocok: "+mismatch.map(t=>`${t} ${actualCounts[t]}/${expectedCounts[t]}`).join(", ")+". Jangan reset lagi.");
    status("RESTORE TERVERIFIKASI.\n"+TABLES.map(t=>`${t}: ${actualCounts[t]} record`).join("\n"));
    window.kspNotify?.("Restore berhasil dan jumlah data terverifikasi.","success","Superadmin");
    await loadStats();await loadAudit();
  }catch(e){
    const msg=e instanceof Error?e.message:String(e);
    status("RESTORE BELUM TERVERIFIKASI: "+msg);
    console.error("KSP restore error",e);
    show(msg);
  }finally{button.disabled=false}
}

document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
$("resetConfirm").addEventListener("input",e=>$("resetBtn").disabled=e.target.value.trim()!=="RESET DEMO 2");
$("resetBtn").onclick=async()=>{if(!confirm("Hapus seluruh data demo sekarang?"))return;await resetDemo()};
$("backupBtn").onclick=backup;
$("restoreFile").addEventListener("change",e=>$("restoreBtn").disabled=!e.target.files?.[0]);
$("restoreBtn").onclick=()=>restore($("restoreFile").files[0]);
$("createUserBtn").onclick=createUser;
$("checkUserServiceBtn").onclick=checkUserService;
$("usersList").addEventListener("click",e=>{const b=e.target.closest("button[data-action]");if(!b)return;const id=b.dataset.user;if(b.dataset.action==="save-user")saveUser(id);if(b.dataset.action==="toggle-user")toggleUser(id,b.dataset.active==="true");if(b.dataset.action==="delete-user")deleteUser(id)});
$("logout").onclick=async()=>{await supabaseClient.auth.signOut();location.href="login.html"};
(async()=>{if(await roleCheck())await loadStats()})();
