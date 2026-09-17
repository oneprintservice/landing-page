
kspRequireRole(["lapangan"]); kspStartSessionGuard();
const input=document.getElementById("searchInput"), btn=document.getElementById("searchButton"), result=document.getElementById("result");
async function searchCustomers(){
 const term=input.value.trim(); if(!term){kspNotify("Masukkan nomor anggota, nama, atau NIK.","warning");return}
 result.innerHTML='<section class="ksp-card"><p>Mencari...</p></section>';
 let safeTerm=term.replace(/[\\%_]/g,"\\\\$&");
 let {data,error}=await supabaseClient.from("nasabah").select("*").or(`nomor_anggota.ilike.%${safeTerm}%,nama_lengkap.ilike.%${safeTerm}%,nik.ilike.%${safeTerm}%`).limit(10);
 if(error){
   const fields=["nomor_anggota","nama_lengkap","nik"]; data=[]; error=null;
   for(const field of fields){
     const q=await supabaseClient.from("nasabah").select("*").ilike(field,`%${safeTerm}%`).limit(10);
     if(q.error){error=q.error;break}
     data=[...data,...(q.data||[])];
   }
   data=[...new Map(data.map(x=>[x.id,x])).values()].slice(0,10);
 }
 if(error){kspNotify(error.message,"error","Pencarian gagal");return}
 if(!data?.length){result.innerHTML="";kspNotify("Nasabah tidak ditemukan.","warning");return}
 let html="";
 for(const n of data){let r=await supabaseClient.from("pinjaman").select("*").eq("nasabah_id",n.id).eq("status","aktif").order("created_at",{ascending:false}).limit(10); if(r.error)continue;
  for(const p of (r.data||[])){let a=await supabaseClient.from("angsuran").select("*").eq("pinjaman_id",p.id).eq("status","belum_bayar").order("angsuran_ke",{ascending:true}).limit(12);
   const rows=a.data||[]; html+=`<section class="ksp-card"><div class="ksp-customer"><strong>${kspEscape(n.nama_lengkap)}</strong><div class="meta">No. Anggota: ${kspEscape(n.nomor_anggota||"-")} · NIK: ${kspEscape(n.nik||"-")}</div><div class="meta">${kspEscape(n.alamat||"-")}</div><div style="margin-top:6px"><span class="ksp-score ${kspScoreClass(n.credit_score)}">${Number(n.credit_score??10)}/10 · ${kspScoreLabel(n.credit_score)}</span></div></div>
   <form class="pay-form ksp-grid" data-pid="${p.id}" data-nid="${n.id}" style="margin-top:12px"><div class="ksp-field full"><label>Angsuran ke</label><select name="angsuran_id" required>${rows.map(x=>`<option value="${x.id}">Ke-${x.angsuran_ke} · JT ${kspFmtDate(x.tanggal_jatuh_tempo)}</option>`).join("")}</select></div><div class="ksp-field"><label>Tanggal Bayar</label><input name="tanggal_bayar" type="date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="ksp-field"><label>Nominal Bayar (ribu)</label><input name="nominal" inputmode="numeric" placeholder="750" required></div><div class="ksp-field full"><label>Catatan</label><input name="catatan"></div><div class="ksp-field full"><button class="ksp-btn ksp-btn-success" type="submit">💾 Simpan Pembayaran</button></div></form></section>`}}
 result.innerHTML=html||'<section class="ksp-card"><div class="empty">Tidak ada pinjaman aktif.</div></section>';
 document.querySelectorAll(".pay-form").forEach(f=>f.addEventListener("submit",pay));
}
async function pay(e){e.preventDefault();const f=e.currentTarget;const fd=new FormData(f);const id=fd.get("angsuran_id"), amount=kspNominal(fd.get("nominal"));if(amount<=0){kspNotify("Nominal tidak valid.","warning");return}
 const s=kspSession.get();let r=await supabaseClient.from("angsuran").update({jumlah_dibayar:amount,tanggal_bayar:fd.get("tanggal_bayar"),status:"lunas",catatan:fd.get("catatan")||null}).eq("id",id).select().single();
 if(r.error){kspNotify(r.error.message,"error","Pembayaran gagal");return}
 kspNotify("Angsuran berhasil dibayar.","success","Berhasil"); await updateScore(f.dataset.nid, r.data.tanggal_jatuh_tempo, fd.get("tanggal_bayar")); await searchCustomers();
}
async function updateScore(nid,jt,bayar){const days=Math.floor((new Date(bayar)-new Date(jt))/86400000);let delta=days>7?-3:days>=4?-2:days>=1?-1:days < -7?1:0;let r=await supabaseClient.from("nasabah").select("credit_score").eq("id",nid).maybeSingle();if(!r.data)return;let score=Math.max(0,Math.min(10,Number(r.data.credit_score??10)+delta));await supabaseClient.from("nasabah").update({credit_score:score}).eq("id",nid)}
btn.onclick=searchCustomers;input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchCustomers()}}); 
