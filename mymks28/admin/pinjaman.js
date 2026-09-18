
kspRequireRole(["admin"]); kspStartSessionGuard();
const list=document.getElementById("list"), q=document.getElementById("q"), dateFilter=document.getElementById("dateFilter"), dateButton=document.getElementById("dateButton");
dateFilter.value="";
const esc=kspEscape;
async function load(){
 list.innerHTML='<section class="ksp-card"><p>Memuat data...</p></section>';
 let {data: loans,error}=await supabaseClient.from("pinjaman").select("*").in("status",["aktif","active"]).order("created_at",{ascending:false});
 if(error){list.innerHTML='<section class="ksp-card"><p>Gagal mengambil data.</p></section>';kspNotify(error.message,"error","Gagal");return}
 const ids=[...new Set((loans||[]).map(x=>x.nasabah_id).filter(Boolean))];
 let ns=[];
 if(ids.length) {let r=await supabaseClient.from("nasabah").select("*").in("id",ids); if(!r.error)ns=r.data||[]}
 const map=Object.fromEntries(ns.map(x=>[x.id,x]));
 const term=q.value.trim().toLowerCase();
 loans=(loans||[]).filter(p=>{const n=map[p.nasabah_id]||{};return !term||[n.nomor_anggota,n.nama_lengkap,n.nik].some(v=>String(v||"").toLowerCase().includes(term))});
 if(dateFilter.value){
   const wanted=dateFilter.value;
   const filtered=[];
   for(const p of loans){
     const r=await supabaseClient.from("angsuran").select("tanggal_jatuh_tempo").eq("pinjaman_id",p.id).eq("tanggal_jatuh_tempo",wanted).limit(1);
     if((r.data||[]).length) filtered.push(p);
   }
   loans=filtered;
 }
 if(!loans.length){list.innerHTML='<section class="ksp-card"><div class="empty">Tidak ada pinjaman yang cocok.</div></section>';return}
 list.innerHTML=loans.map(p=>{
  const n=map[p.nasabah_id]||{}, score=Number(n.credit_score??10);
  return `<section class="ksp-card"><div class="ksp-loan-head"><div><div class="ksp-loan-title">${esc(n.nama_lengkap||"-")}</div><div class="ksp-score ${kspScoreClass(score)}">${score}/10 · ${kspScoreLabel(score)}</div></div><span class="ksp-status ${p.status==="aktif"?"active":""}">${esc(p.status||"-")}</span></div>
  <div class="ksp-info-list"><div class="ksp-info-row"><b>Sisa Tanggungan</b><span id="remaining-${p.id}">${kspFormatRupiah(Number(p.sisa_pinjaman??p.jumlah_pinjaman??0))}</span></div><div class="ksp-info-row"><b>No. Anggota</b><span>${esc(n.nomor_anggota||"-")}</span></div><div class="ksp-info-row"><b>Alamat</b><span>${esc(n.alamat||"-")}</span></div><div class="ksp-info-row"><b>NIK</b><span>${esc(n.nik||"-")}</span></div><div class="ksp-info-row"><b>Status Nasabah</b><span>${esc(n.status||"aktif")}</span></div><div class="ksp-info-row"><b>Credit Score</b><span>${score}/10</span></div></div>
  <h4>Jadwal Angsuran</h4><div class="ksp-table-wrap"><table class="ksp-table"><thead><tr><th>No</th><th>Tanggal Angsuran</th><th>Angsuran Pokok</th><th>Angsuran Murni</th><th>Pelunasan</th><th>Total</th><th>Titip Angsuran</th><th>Saldo</th></tr></thead><tbody id="tb-${p.id}"><tr><td colspan="8">Memuat...</td></tr></tbody></table></div></section>`;
 }).join("");
 for(const p of loans){
   const tb=document.getElementById("tb-"+p.id);
   let r=await supabaseClient.from("angsuran").select("*").eq("pinjaman_id",p.id).order("angsuran_ke",{ascending:true}).limit(12);
   const existing=r.data||[];
   const paid=existing.reduce((sum,a)=>sum+Number(a.jumlah_dibayar||0),0);
   const remaining=Math.max(0,Number(p.total_harus_dibayar??p.jumlah_pinjaman??0)-paid);
   const remEl=document.getElementById("remaining-"+p.id); if(remEl) remEl.textContent=kspFormatRupiah(remaining);
   tb.innerHTML=Array.from({length:12},(_,i)=>{
     const a=existing[i]||{}, n=i+1;
     const val=k=>a[k]==null?"":(Number(a[k])/1000).toString();
     return `<tr data-row="${n}"><td>${n}</td><td><input type="date" name="tanggal" value="${a.tanggal_jatuh_tempo?new Date(a.tanggal_jatuh_tempo).toISOString().slice(0,10):""}" style="min-width:125px"></td><td><input name="pokok" inputmode="numeric" value="${val("angsuran_pokok")}" placeholder="0" style="width:100px"></td><td><input name="murni" inputmode="numeric" value="${val("angsuran_murni")}" placeholder="0" style="width:100px"></td><td><input name="pelunasan" inputmode="numeric" value="${val("pelunasan")}" placeholder="0" style="width:100px"></td><td><input name="total" inputmode="numeric" value="${val("total")}" placeholder="0" style="width:100px"></td><td><input name="titip" inputmode="numeric" value="${val("titip_angsuran")}" placeholder="0" style="width:100px"></td><td><input name="saldo" inputmode="numeric" value="${val("saldo")}" placeholder="0" style="width:100px"></td></tr>`;
   }).join("");
   tb.parentElement.insertAdjacentHTML("afterend",`<div style="padding-top:10px"><button class="ksp-btn ksp-btn-success save-schedule" data-pid="${p.id}">💾 Simpan Jadwal 12 Baris</button></div>`);
   tb.querySelectorAll("input:not([type=date])").forEach(kspInputThousand);
 }
 document.querySelectorAll(".save-schedule").forEach(b=>b.onclick=async()=>{
   const card=b.closest(".ksp-card"); const pid=b.dataset.pid; const rows=[...document.querySelectorAll(`#tb-${pid} tr`)];
   b.disabled=true;
   for(const tr of rows){
     const fd=new FormData();tr.querySelectorAll("input").forEach(i=>fd.append(i.name,i.value));
     const ke=Number(tr.dataset.row), date=fd.get("tanggal"); if(!date)continue;
     const payload={pinjaman_id:pid,angsuran_ke:ke,tanggal_jatuh_tempo:new Date(date+"T00:00:00").toISOString(),angsuran_pokok:kspNominal(fd.get("pokok")),angsuran_murni:kspNominal(fd.get("murni")),pelunasan:kspNominal(fd.get("pelunasan")),total:kspNominal(fd.get("total")),titip_angsuran:kspNominal(fd.get("titip")),saldo:kspNominal(fd.get("saldo"))};
     const ex=await supabaseClient.from("angsuran").select("id").eq("pinjaman_id",pid).eq("angsuran_ke",ke).maybeSingle();
     let rr=ex.data?await supabaseClient.from("angsuran").update(payload).eq("id",ex.data.id):await supabaseClient.from("angsuran").insert(payload);
     if(rr.error){kspNotify(rr.error.message,"error","Jadwal gagal disimpan");b.disabled=false;return}
   }
   b.disabled=false;kspNotify("Jadwal 12 baris berhasil disimpan.","success","Berhasil");dateButton.onclick=load; q.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();load()}}); load();
 });
}

dateButton.onclick=load; q.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();load()}}); load();
