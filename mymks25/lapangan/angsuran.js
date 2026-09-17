kspRequireRole(["lapangan"]); kspStartSessionGuard();
const input=document.getElementById("searchInput"), btn=document.getElementById("searchButton"), result=document.getElementById("result");
const dateInput=document.getElementById("dateFilter"), dateButton=document.getElementById("dateButton");
dateInput.value="";
let activeLoans=[];
function esc(v){return kspEscape(v==null?"-":String(v))}
function localDate(v){return v?String(v).slice(0,10):""}
async function loadActiveLoans(){
 result.innerHTML='<section class="ksp-card"><p>Memuat pinjaman aktif...</p></section>';
 const {data:loans,error}=await supabaseClient.from("pinjaman").select("*").in("status",["aktif","active"]).order("created_at",{ascending:false});
 if(error){result.innerHTML='<section class="ksp-card"><p>Gagal mengambil pinjaman aktif.</p></section>';kspNotify(error.message,"error","Gagal memuat");return}
 const ids=[...new Set((loans||[]).map(x=>x.nasabah_id).filter(Boolean))]; let ns=[];
 if(ids.length){const r=await supabaseClient.from("nasabah").select("*").in("id",ids);if(r.error){kspNotify(r.error.message,"error","Gagal memuat nasabah");return}ns=r.data||[]}
 const map=Object.fromEntries(ns.map(n=>[n.id,n])); activeLoans=[];
 for(const p of (loans||[])){
  const ar=await supabaseClient.from("angsuran").select("*").eq("pinjaman_id",p.id).eq("status","belum_bayar").order("angsuran_ke",{ascending:true}).limit(12);
  if(ar.error)continue; const next=(ar.data||[])[0]; if(!next)continue;
  activeLoans.push({p,n:map[p.nasabah_id]||{},next});
 }
 renderActive();
}
function renderActive(){
 const term=input.value.trim().toLowerCase(), day=dateInput.value;
 const rows=activeLoans.filter(x=>{const n=x.n;const text=[n.nomor_anggota,n.nama_lengkap,n.nik].map(v=>String(v||"").toLowerCase()).join(" ");return (!term||text.includes(term))&&(!day||localDate(x.next.tanggal_jatuh_tempo)===day)});
 if(!rows.length){result.innerHTML='<section class="ksp-card"><div class="empty">Tidak ada pinjaman aktif yang cocok dengan filter.</div></section>';return}
 result.innerHTML=rows.map(x=>{const n=x.n,p=x.p,a=x.next;return `<section class="ksp-card"><div class="ksp-customer"><strong>${esc(n.nama_lengkap)}</strong><div class="meta">No. Anggota: ${esc(n.nomor_anggota)} · NIK: ${esc(n.nik)}</div><div class="meta">${esc(n.alamat)}</div><div class="meta">Pinjaman: ${kspFormatRupiah(p.jumlah_pinjaman)} · Jatuh tempo: ${kspFmtDate(a.tanggal_jatuh_tempo)}</div></div><form class="pay-form ksp-grid" data-pid="${p.id}" data-nid="${n.id}" style="margin-top:12px"><div class="ksp-field full"><label>Angsuran ke</label><select name="angsuran_id" required><option value="${a.id}">Ke-${a.angsuran_ke} · JT ${kspFmtDate(a.tanggal_jatuh_tempo)}</option></select></div><div class="ksp-field"><label>Tanggal Bayar</label><input name="tanggal_bayar" type="date" value="${dateInput.value}" required></div><div class="ksp-field"><label>Nominal Bayar (ribu)</label><input name="nominal" inputmode="numeric" placeholder="750" required></div><div class="ksp-field full"><label>Catatan</label><input name="catatan"></div><div class="ksp-field full"><button class="ksp-btn ksp-btn-success" type="submit">💾 Simpan Pembayaran</button></div></form></section>`}).join("");
 document.querySelectorAll('.pay-form').forEach(f=>f.addEventListener('submit',pay));
}
async function pay(e){e.preventDefault();const f=e.currentTarget,fd=new FormData(f),id=fd.get('angsuran_id'),amount=kspNominal(fd.get('nominal'));if(amount<=0){kspNotify('Nominal tidak valid.','warning');return}const r=await supabaseClient.from('angsuran').update({jumlah_dibayar:amount,tanggal_bayar:fd.get('tanggal_bayar'),status:'lunas',catatan:fd.get('catatan')||null}).eq('id',id).select().single();if(r.error){kspNotify(r.error.message,'error','Pembayaran gagal');return}kspNotify('Angsuran berhasil dibayar.','success','Berhasil');await updateScore(f.dataset.nid,r.data.tanggal_jatuh_tempo,fd.get('tanggal_bayar'));await loadActiveLoans()}
async function updateScore(nid,jt,bayar){const days=Math.floor((new Date(bayar)-new Date(jt))/86400000);const delta=days>7?-3:days>=4?-2:days>=1?-1:days< -7?1:0;const r=await supabaseClient.from('nasabah').select('credit_score').eq('id',nid).maybeSingle();if(!r.data)return;const score=Math.max(0,Math.min(10,Number(r.data.credit_score??5)+delta));await supabaseClient.from('nasabah').update({credit_score:score}).eq('id',nid)}
btn.onclick=renderActive;dateButton.onclick=renderActive;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();renderActive()}});loadActiveLoans();