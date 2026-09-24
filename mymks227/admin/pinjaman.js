kspRequireRole(["admin","superadmin"]); kspStartSessionGuard();
const list=document.getElementById("list"), q=document.getElementById("q"), dateFilter=document.getElementById("dateFilter"), dateButton=document.getElementById("dateButton");
const session=kspSession.get(); const ROLE=session?.role||""; const isSuperadmin=ROLE==="superadmin";
if(dateFilter) dateFilter.value="";
function esc(v){return kspEscape(v==null?"-":String(v))}
function localDate(v){return v?String(v).slice(0,10):""}
function amount(v){return Number(v||0)}
function inputRibu(v){return amount(v)>0?(amount(v)/1000).toString():""}
function effectivePaid(a){const c=amount(a.angsuran_pokok)+amount(a.angsuran_murni)+amount(a.pelunasan)+amount(a.titip_angsuran);return c>0?c:amount(a.jumlah_dibayar)}
function paymentTotal(a){const c=amount(a.angsuran_pokok)+amount(a.angsuran_murni)+amount(a.pelunasan)+amount(a.titip_angsuran);return c>0?c:amount(a.jumlah_dibayar)}
function scheduleRows(schedule,totalLoan){let running=0;return schedule.slice(0,12).map((a,i)=>{const paid=effectivePaid(a),tagihan=amount(a.jumlah_tagihan||a.total_tagihan);running+=paid;const locked=String(a.status||"").toLowerCase()==="lunas",status=locked?"lunas":paid>0?"sebagian":"belum_bayar",breakdown=amount(a.angsuran_pokok)+amount(a.angsuran_murni)+amount(a.pelunasan)+amount(a.titip_angsuran)>0,saldo=Math.max(0,totalLoan-running);return `<tr data-row="${i+1}" data-id="${a.id}" data-tagihan="${tagihan}" data-paid="${paid}"><td>${i+1}</td><td>${localDate(a.tanggal_jatuh_tempo)?kspFmtDate(a.tanggal_jatuh_tempo):"-"}</td><td>${kspFormatRupiah(tagihan)}</td><td><input name="pokok" inputmode="numeric" value="${breakdown?inputRibu(a.angsuran_pokok):""}" placeholder="0" ${locked?"disabled":""}></td><td><input name="murni" inputmode="numeric" value="${breakdown?inputRibu(a.angsuran_murni):""}" placeholder="0" ${locked?"disabled":""}></td><td><input name="pelunasan" inputmode="numeric" value="${breakdown?inputRibu(a.pelunasan):""}" placeholder="0" ${locked?"disabled":""}></td><td><input name="titip" inputmode="numeric" value="${breakdown?inputRibu(a.titip_angsuran):""}" placeholder="0" ${locked?"disabled":""}></td><td class="payment-total">${paid>0?kspFormatRupiah(paymentTotal(a)):"Rp 0"}</td><td class="payment-saldo">${kspFormatRupiah(saldo)}</td><td>${a.tanggal_bayar?kspFmtDate(a.tanggal_bayar):"-"}</td><td><span class="ksp-status ${status==="lunas"?"active":""}">${esc(status)}</span></td><td>${esc(a.catatan||"")}</td><td>${locked?"":`<button type="button" class="ksp-btn ksp-btn-primary save-payment">Simpan</button>`}${isSuperadmin&&paid>0?`<button type="button" class="ksp-btn ksp-btn-danger delete-payment" style="margin-top:5px;min-height:34px;padding:7px 9px" data-payment-id="${a.id}" data-loan-id="${a.pinjaman_id}">Hapus Bayar</button>`:""}</td></tr>`}).join("")}
async function load(){
 list.innerHTML='<section class="ksp-card"><p>Memuat data...</p></section>';
 let {data:loans,error}=await supabaseClient.from("pinjaman").select("*").in("status",["aktif","active"]).order("created_at",{ascending:false});
 if(error){list.innerHTML='<section class="ksp-card"><p>Gagal mengambil data.</p></section>';kspNotify(error.message,"error","Gagal");return}
 const ids=[...new Set((loans||[]).map(x=>x.nasabah_id).filter(Boolean))];let ns=[];if(ids.length){let r=await supabaseClient.from("nasabah").select("*").in("id",ids);if(!r.error)ns=r.data||[]}
 const map=Object.fromEntries(ns.map(x=>[x.id,x]));const term=q.value.trim().toLowerCase();
 loans=(loans||[]).filter(p=>{const n=map[p.nasabah_id]||{};return !term||[n.nomor_anggota,n.nama_lengkap,n.nik].some(v=>String(v||"").toLowerCase().includes(term))});
 if(dateFilter.value){const wanted=dateFilter.value,filtered=[];for(const p of loans){const r=await supabaseClient.from("angsuran").select("tanggal_jatuh_tempo").eq("pinjaman_id",p.id).eq("tanggal_jatuh_tempo",wanted).limit(1);if((r.data||[]).length)filtered.push(p)}loans=filtered}
 if(!loans.length){list.innerHTML='<section class="ksp-card"><div class="empty">Tidak ada pinjaman yang cocok.</div></section>';return}
 list.innerHTML=loans.map(p=>{const n=map[p.nasabah_id]||{},score=Number(n.credit_score??10);return `<section class="ksp-card"><div class="ksp-loan-head"><div><div class="ksp-loan-title">${esc(n.nama_lengkap||"-")}</div><div class="ksp-score ${kspScoreClass(score)}">${score}/10 · ${kspScoreLabel(score)}</div></div><span class="ksp-status ${p.status==="aktif"?"active":""}">${esc(p.status||"-")}</span></div><div class="ksp-info-list"><div class="ksp-info-row"><b>Pinjaman</b><span>${kspFormatRupiah(p.jumlah_pinjaman??0)}</span></div><div class="ksp-info-row"><b>Jatuh tempo terakhir</b><span>${kspFmtDate(p.tanggal_jatuh_tempo)}</span></div><div class="ksp-info-row"><b>No. Anggota</b><span>${esc(n.nomor_anggota||"-")}</span></div><div class="ksp-info-row"><b>Alamat</b><span>${esc(n.alamat||"-")}</span></div><div class="ksp-info-row"><b>NIK</b><span>${esc(n.nik||"-")}</span></div><div class="ksp-info-row"><b>Status Nasabah</b><span>${esc(n.status||"aktif")}</span></div><div class="ksp-info-row"><b>Credit Score</b><span>${score}/10</span></div><div class="ksp-info-row"><b>Sisa Tanggungan Angsuran</b><span id="remaining-${p.id}">${kspFormatRupiah(Number(p.sisa_pinjaman??p.jumlah_pinjaman??0))}</span></div></div><h4>Jadwal & Pembayaran Angsuran (maks. 12 baris)</h4><div class="ksp-table-wrap ksp-angsuran-scroll"><table class="ksp-table ksp-angsuran-table"><thead><tr><th>No</th><th>Wajib Bayar</th><th>Tagihan</th><th>Angsuran Pokok</th><th>Angsuran Murni</th><th>Pelunasan</th><th>Titip Angsuran</th><th>Total Bayar</th><th>Saldo</th><th>Tanggal Bayar</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody id="tb-${p.id}"><tr><td colspan="13">Memuat...</td></tr></tbody></table></div></section>`}).join("");
 for(const p of loans){const tb=document.getElementById("tb-"+p.id);const r=await supabaseClient.from("angsuran").select("*").eq("pinjaman_id",p.id).order("angsuran_ke",{ascending:true}).limit(12);const existing=r.data||[];const totalLoan=amount(p.total_harus_dibayar??p.jumlah_pinjaman);const paid=existing.reduce((s,a)=>s+effectivePaid(a),0);const remaining=Math.max(0,totalLoan-paid);const rem=document.getElementById("remaining-"+p.id);if(rem)rem.textContent=kspFormatRupiah(remaining);tb.innerHTML=scheduleRows(existing,totalLoan);tb.querySelectorAll("input").forEach(k=>{if(!k.disabled)kspInputThousand(k)});tb.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",()=>updateRowPreview(inp.closest("tr"),totalLoan)));}
 document.querySelectorAll(".save-payment").forEach(b=>b.onclick=savePayment);
}
function updateRowPreview(tr,totalLoan){const vals=["pokok","murni","pelunasan","titip"].map(k=>kspNominal(tr.querySelector(`[name="${k}"]`)?.value||0));const total=vals.reduce((a,b)=>a+b,0);const el=tr.querySelector(".payment-total");if(el)el.textContent=kspFormatRupiah(total);let running=0;tr.closest("tbody").querySelectorAll("tr").forEach(r=>{running+=(r===tr?total:Number(r.dataset.paid||0));const se=r.querySelector(".payment-saldo");if(se)se.textContent=kspFormatRupiah(Math.max(0,totalLoan-running));});}
async function savePayment(e){
  const b=e.currentTarget,tr=b.closest("tr"),tb=tr.closest("tbody"),pid=tb.id.replace("tb-","");
  const id=tr.dataset.id;
  if(!id){kspNotify("Data angsuran tidak ditemukan.","error");return}
  const values={
    angsuran_pokok:kspNominal(tr.querySelector('[name="pokok"]')?.value||0),
    angsuran_murni:kspNominal(tr.querySelector('[name="murni"]')?.value||0),
    pelunasan:kspNominal(tr.querySelector('[name="pelunasan"]')?.value||0),
    titip_angsuran:kspNominal(tr.querySelector('[name="titip"]')?.value||0)
  };
  const total=Object.values(values).reduce((a,v)=>a+v,0);
  if(total<=0){kspNotify("Isi minimal satu nominal pembayaran.","warning");return}
  const tanggalBayar=prompt("Tanggal bayar (YYYY-MM-DD)",new Date().toISOString().slice(0,10));
  if(tanggalBayar===null)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(tanggalBayar)){kspNotify("Format tanggal bayar harus YYYY-MM-DD.","warning");return}
  const catatan=prompt("Catatan pembayaran (opsional)","");
  if(catatan===null)return;
  b.disabled=true;

  const r=await supabaseClient.from("angsuran").update({
    ...values,total,jumlah_dibayar:total,tanggal_bayar:tanggalBayar,
    status:"sebagian",catatan:catatan||null
  }).eq("id",id).select().single();
  if(r.error){b.disabled=false;kspNotify(r.error.message,"error","Pembayaran gagal");return}

  const ok=await recalcLoanAndRedistribute(pid);
  if(!ok){
    b.disabled=false;
    kspNotify("Pembayaran tersimpan, tetapi penyesuaian jadwal belum selesai. Periksa kembali pinjaman ini.","warning","Perlu pemeriksaan");
    return;
  }
  kspNotify("Pembayaran berhasil disimpan. Sisa tanggungan dan tagihan angsuran berikutnya dihitung ulang.","success","Berhasil");
  await load();
}

async function recalcLoanAndRedistribute(pid){
  const ar=await supabaseClient.from("angsuran").select("*").eq("pinjaman_id",pid).order("angsuran_ke",{ascending:true});
  if(ar.error)return false;
  const loan=await supabaseClient.from("pinjaman").select("total_harus_dibayar,jumlah_pinjaman").eq("id",pid).single();
  if(loan.error)return false;

  const rows=ar.data||[];
  const base=amount(loan.data.total_harus_dibayar??loan.data.jumlah_pinjaman);
  const paid=rows.reduce((sum,a)=>sum+effectivePaid(a),0);
  const remaining=Math.max(0,base-paid);

  const statusUpdates=[];
  for(const a of rows){
    const p=effectivePaid(a),tag=amount(a.jumlah_tagihan||a.total_tagihan);
    const desired=p>0 && tag>0 && p>=tag?"lunas":p>0?"sebagian":"belum_bayar";
    if(String(a.status||"").toLowerCase()!==desired){
      statusUpdates.push(supabaseClient.from("angsuran").update({status:desired}).eq("id",a.id));
    }
  }
  if(statusUpdates.length){
    const rs=await Promise.all(statusUpdates);
    if(rs.some(x=>x.error))return false;
  }

  const future=rows.filter(a=>effectivePaid(a)===0 && String(a.status||"").toLowerCase()!=="lunas");
  if(remaining>0 && future.length){
    const each=Math.floor(remaining/future.length);
    let rest=remaining;
    for(let i=0;i<future.length;i++){
      const value=i===future.length-1?rest:each;
      rest-=value;
      const u=await supabaseClient.from("angsuran").update({jumlah_tagihan:value}).eq("id",future[i].id);
      if(u.error)return false;
    }
  }

  const pu=await supabaseClient.from("pinjaman").update({
    total_dibayar:paid,
    sisa_pinjaman:remaining,
    status:remaining<=0?"lunas":"aktif"
  }).eq("id",pid);
  return !pu.error;
}

async function deletePayment(id,pid){
 if(!isSuperadmin)return kspNotify("Hanya Superadmin yang dapat menghapus transaksi pembayaran.","error","Akses ditolak");
 const reason=prompt("Alasan menghapus transaksi pembayaran:","Salah input");
 if(reason===null)return;
 if(!reason.trim())return kspNotify("Alasan penghapusan wajib diisi.","warning","Periksa data");
 const current=await supabaseClient.from("angsuran").select("*").eq("id",id).single();
 if(current.error)return kspNotify(current.error.message,"error","Pembayaran tidak ditemukan");
 const a=current.data;
 if(!confirm(`Hapus transaksi pembayaran angsuran ke-${a.angsuran_ke||"-"}? Jadwal angsurannya tetap dipertahankan.`))return;
 const r=await supabaseClient.from("angsuran").update({angsuran_pokok:0,angsuran_murni:0,pelunasan:0,titip_angsuran:0,total:0,jumlah_dibayar:0,tanggal_bayar:null,status:"belum_bayar",catatan:null}).eq("id",id);
 if(r.error)return kspNotify(r.error.message,"error","Hapus pembayaran gagal");
 const audit=await supabaseClient.rpc("ksp_write_audit",{p_action:"DELETE_PAYMENT",p_target_table:"angsuran",p_target_id:String(id),p_metadata:{reason:reason.trim(),pinjaman_id:pid,record:a}});
 if(audit.error)console.warn("Audit gagal",audit.error);
 const ok=await recalcLoanAndRedistribute(pid);
 if(!ok)return kspNotify("Pembayaran dihapus, tetapi perhitungan pinjaman perlu diperiksa.","warning","Perlu pemeriksaan");
 window.kspNotify("Transaksi pembayaran dihapus. Jadwal angsuran tetap ada dan saldo dihitung ulang.","success","Superadmin");
 await load();
}
document.getElementById("list").addEventListener("click",e=>{const b=e.target.closest(".delete-payment");if(b)deletePayment(b.dataset.paymentId,b.dataset.loanId)});
dateButton.onclick=load;q.addEventListener("keydown",e=>{if(e.key==='Enter'){e.preventDefault();load()}});load();
