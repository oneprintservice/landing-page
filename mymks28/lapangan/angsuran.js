kspRequireRole(["lapangan"]); kspStartSessionGuard();
const input=document.getElementById("searchInput"), btn=document.getElementById("searchButton"), result=document.getElementById("result");
const dateInput=document.getElementById("dateFilter"), dateButton=document.getElementById("dateButton");
dateInput.value="";
let activeLoans=[];
function esc(v){return kspEscape(v==null?"-":String(v))}
function localDate(v){return v?String(v).slice(0,10):""}
function moneyInput(v){return v==null?"":(Number(v)/1000).toString()}
function amount(v){return Number(v||0)}

async function loadActiveLoans(){
 result.innerHTML='<section class="ksp-card"><p>Memuat pinjaman aktif...</p></section>';
 const {data:loans,error}=await supabaseClient.from("pinjaman").select("*").in("status",["aktif","active"]).order("created_at",{ascending:false});
 if(error){result.innerHTML='<section class="ksp-card"><p>Gagal mengambil pinjaman aktif.</p></section>';kspNotify(error.message,"error","Gagal memuat");return}
 const ids=[...new Set((loans||[]).map(x=>x.nasabah_id).filter(Boolean))];
 let ns=[];
 if(ids.length){const r=await supabaseClient.from("nasabah").select("*").in("id",ids);if(r.error){kspNotify(r.error.message,"error","Gagal memuat nasabah");return}ns=r.data||[]}
 const map=Object.fromEntries(ns.map(n=>[n.id,n]));
 activeLoans=[];
 for(const p of (loans||[])){
   const ar=await supabaseClient.from("angsuran").select("*").eq("pinjaman_id",p.id).order("angsuran_ke",{ascending:true}).limit(12);
   if(ar.error){kspNotify(ar.error.message,"error","Gagal memuat jadwal");continue}
   const schedule=ar.data||[];
   const paid=schedule.reduce((sum,a)=>sum+amount(a.jumlah_dibayar),0);
   const baseTotal=amount(p.total_harus_dibayar??p.jumlah_pinjaman);
   const remaining=Math.max(0,baseTotal-paid);
   activeLoans.push({p,n:map[p.nasabah_id]||{},schedule,remaining});
 }
 renderActive();
}

function renderActive(){
 const term=input.value.trim().toLowerCase(), day=dateInput.value||"";
 const rows=activeLoans.filter(x=>{
   const n=x.n;
   const text=[n.nomor_anggota,n.nama_lengkap,n.nik].map(v=>String(v||"").toLowerCase()).join(" ");
   const dateMatch=!day||x.schedule.some(a=>localDate(a.tanggal_jatuh_tempo)===day);
   return (!term||text.includes(term))&&dateMatch;
 });
 if(!rows.length){result.innerHTML='<section class="ksp-card"><div class="empty">Tidak ada pinjaman aktif yang cocok dengan filter.</div></section>';return}
 result.innerHTML=rows.map(x=>{
   const n=x.n,p=x.p,schedule=x.schedule,remaining=x.remaining;
   const rows12=Array.from({length:12},(_,i)=>{
     const a=schedule.find(v=>Number(v.angsuran_ke)===i+1)||{};
     const paidStatus=String(a.status||"belum_bayar").toLowerCase();
     return `<tr data-row="${i+1}">
       <td>${i+1}</td>
       <td><input type="date" name="tanggal" value="${a.tanggal_jatuh_tempo?localDate(a.tanggal_jatuh_tempo):""}"></td>
       <td><input name="pokok" inputmode="numeric" value="${moneyInput(a.angsuran_pokok)}" placeholder="0"></td>
       <td><input name="murni" inputmode="numeric" value="${moneyInput(a.angsuran_murni)}" placeholder="0"></td>
       <td><input name="pelunasan" inputmode="numeric" value="${moneyInput(a.pelunasan)}" placeholder="0"></td>
       <td><input name="total" inputmode="numeric" value="${moneyInput(a.total??a.jumlah_tagihan)}" placeholder="0"></td>
       <td><input name="titip" inputmode="numeric" value="${moneyInput(a.titip_angsuran)}" placeholder="0"></td>
       <td><input name="saldo" inputmode="numeric" value="${moneyInput(a.saldo)}" placeholder="0"></td>
       <td><span class="ksp-status ${paidStatus==="lunas"?"active":""}">${esc(a.status||"belum_bayar")}</span></td>
     </tr>`;
   }).join("");
   return `<section class="ksp-card">
     <div class="ksp-customer"><strong>${esc(n.nama_lengkap)}</strong>
       <div class="meta">No. Anggota: ${esc(n.nomor_anggota)} · NIK: ${esc(n.nik)}</div>
       <div class="meta">${esc(n.alamat)}</div>
       <div class="meta">Pinjaman: ${kspFormatRupiah(p.jumlah_pinjaman)} · Jatuh tempo: ${kspFmtDate(p.tanggal_jatuh_tempo)}</div>
       <div class="meta"><strong>Sisa tanggungan angsuran: ${kspFormatRupiah(remaining)}</strong></div>
     </div>
     <h4 style="margin:14px 0 8px">Jadwal Angsuran (maks. 12 baris)</h4>
     <div class="ksp-table-wrap"><table class="ksp-table ksp-angsuran-table"><thead><tr><th>No</th><th>Tanggal Angsuran</th><th>Angsuran Pokok</th><th>Angsuran Murni</th><th>Pelunasan</th><th>Total</th><th>Titip Angsuran</th><th>Saldo</th><th>Status</th></tr></thead><tbody id="tb-${p.id}">${rows12}</tbody></table></div>
     <div style="padding-top:10px"><button class="ksp-btn ksp-btn-success save-schedule" data-pid="${p.id}">💾 Simpan Jadwal 12 Baris</button></div>
     <form class="pay-form ksp-grid" data-pid="${p.id}" data-nid="${n.id}" style="margin-top:14px">
       <div class="ksp-field"><label>Angsuran ke</label><input name="angsuran_ke" type="number" min="1" max="12" placeholder="1" required></div>
       <div class="ksp-field"><label>Tanggal Bayar</label><input name="tanggal_bayar" type="date" value="" required></div>
       <div class="ksp-field"><label>Nominal Bayar (ribu)</label><input name="nominal" inputmode="numeric" placeholder="750" required></div>
       <div class="ksp-field"><label>Catatan</label><input name="catatan"></div>
       <div class="ksp-field full"><button class="ksp-btn ksp-btn-primary" type="submit">💾 Simpan Pembayaran</button></div>
     </form>
   </section>`;
 }).join("");
 document.querySelectorAll('.save-schedule').forEach(b=>b.addEventListener('click',saveSchedule));
 document.querySelectorAll('.pay-form').forEach(f=>f.addEventListener('submit',pay));
 document.querySelectorAll('.ksp-angsuran-table input:not([type=date])').forEach(kspInputThousand);
}

async function saveSchedule(e){
 const b=e.currentTarget,pid=b.dataset.pid,tb=document.getElementById("tb-"+pid); b.disabled=true;
 try{
   const rows=[...tb.querySelectorAll("tr")];
   for(const tr of rows){
     const fd=new FormData();tr.querySelectorAll("input").forEach(i=>fd.append(i.name,i.value));
     const ke=Number(tr.dataset.row),date=fd.get("tanggal"); if(!date)continue;
     const payload={pinjaman_id:pid,angsuran_ke:ke,tanggal_jatuh_tempo:date,angsuran_pokok:kspNominal(fd.get("pokok")),angsuran_murni:kspNominal(fd.get("murni")),pelunasan:kspNominal(fd.get("pelunasan")),total:kspNominal(fd.get("total")),titip_angsuran:kspNominal(fd.get("titip")),saldo:kspNominal(fd.get("saldo"))};
     const ex=await supabaseClient.from("angsuran").select("id").eq("pinjaman_id",pid).eq("angsuran_ke",ke).maybeSingle();
     const rr=ex.data?await supabaseClient.from("angsuran").update(payload).eq("id",ex.data.id):await supabaseClient.from("angsuran").insert(payload);
     if(rr.error)throw rr.error;
   }
   kspNotify("Jadwal 12 baris berhasil disimpan.","success","Berhasil"); await loadActiveLoans();
 }catch(err){kspNotify(err.message||"Gagal menyimpan jadwal.","error","Jadwal gagal disimpan");}
 finally{b.disabled=false}
}

async function pay(e){
 e.preventDefault();
 const f=e.currentTarget,fd=new FormData(f),pid=f.dataset.pid,nid=f.dataset.nid,ke=Number(fd.get("angsuran_ke")),amountPaid=kspNominal(fd.get("nominal"));
 if(ke<1||ke>12){kspNotify("Nomor angsuran harus 1–12.","warning");return}
 if(amountPaid<=0){kspNotify("Nominal tidak valid.","warning");return}
 const target=activeLoans.find(x=>x.p.id===pid)?.schedule.find(a=>Number(a.angsuran_ke)===ke);
 if(!target){kspNotify("Jadwal angsuran tersebut belum ada. Isi tanggal dan jadwalnya terlebih dahulu.","warning");return}
 const r=await supabaseClient.from('angsuran').update({jumlah_dibayar:amountPaid,tanggal_bayar:fd.get('tanggal_bayar'),status:'lunas',catatan:fd.get('catatan')||null}).eq('id',target.id).select().single();
 if(r.error){kspNotify(r.error.message,'error','Pembayaran gagal');return}
 kspNotify('Angsuran berhasil dibayar.','success','Berhasil');
 await updateScore(nid,target.tanggal_jatuh_tempo,fd.get('tanggal_bayar'));
 await loadActiveLoans();
}
async function updateScore(nid,jt,bayar){const days=Math.floor((new Date(bayar)-new Date(jt))/86400000);const delta=days>7?-3:days>=4?-2:days>=1?-1:days< -7?1:0;const r=await supabaseClient.from('nasabah').select('credit_score').eq('id',nid).maybeSingle();if(!r.data)return;const score=Math.max(0,Math.min(10,Number(r.data.credit_score??5)+delta));await supabaseClient.from('nasabah').update({credit_score:score}).eq('id',nid)}
btn.onclick=renderActive;dateButton.onclick=renderActive;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();renderActive()}});loadActiveLoans();
