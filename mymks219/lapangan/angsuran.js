kspRequireRole(["lapangan"]); kspStartSessionGuard();
const input=document.getElementById("searchInput"), btn=document.getElementById("searchButton"), result=document.getElementById("result");
const dateInput=document.getElementById("dateFilter"), dateButton=document.getElementById("dateButton");
if(dateInput) dateInput.value="";
let activeLoans=[];
function esc(v){return kspEscape(v==null?"-":String(v))}
function localDate(v){return v?String(v).slice(0,10):""}
function amount(v){return Number(v||0)}
function inputRibu(v){return amount(v)>0?(amount(v)/1000).toString():""}
function effectivePaid(a){
  const components=amount(a.angsuran_pokok)+amount(a.angsuran_murni)+amount(a.pelunasan)+amount(a.titip_angsuran);
  return components>0?components:amount(a.jumlah_dibayar);
}
function rowPaymentTotal(a){
  const components=amount(a.angsuran_pokok)+amount(a.angsuran_murni)+amount(a.pelunasan)+amount(a.titip_angsuran);
  return components>0?components:amount(a.jumlah_dibayar);
}
function scheduleRows(schedule, totalLoan){
  let running=0;
  return schedule.slice(0,12).map((a,i)=>{
    const paid=effectivePaid(a); running+=paid;
    const tagihan=amount(a.jumlah_tagihan||a.total_tagihan);
    const isPaid=String(a.status||"").toLowerCase()==="lunas" || paid>0;
    const locked=String(a.status||"").toLowerCase()==="lunas";
    const status=locked ? "lunas" : paid>0 ? "sebagian" : "belum_bayar";
    const saldo=Math.max(0,totalLoan-running);
    const oldBreakdown=(amount(a.angsuran_pokok)+amount(a.angsuran_murni)+amount(a.pelunasan)+amount(a.titip_angsuran))>0;
    return `<tr data-row="${i+1}" data-id="${a.id}" data-tagihan="${tagihan}" data-paid="${paid}">
      <td>${i+1}</td>
      <td>${localDate(a.tanggal_jatuh_tempo)?kspFmtDate(a.tanggal_jatuh_tempo):"-"}</td>
      <td>${kspFormatRupiah(tagihan)}</td>
      <td><input name="pokok" inputmode="numeric" value="${oldBreakdown?inputRibu(a.angsuran_pokok):""}" placeholder="0" ${locked?"disabled":""}></td>
      <td><input name="murni" inputmode="numeric" value="${oldBreakdown?inputRibu(a.angsuran_murni):""}" placeholder="0" ${locked?"disabled":""}></td>
      <td><input name="pelunasan" inputmode="numeric" value="${oldBreakdown?inputRibu(a.pelunasan):""}" placeholder="0" ${locked?"disabled":""}></td>
      <td><input name="titip" inputmode="numeric" value="${oldBreakdown?inputRibu(a.titip_angsuran):""}" placeholder="0" ${locked?"disabled":""}></td>
      <td class="payment-total">${isPaid?kspFormatRupiah(rowPaymentTotal(a)):"Rp 0"}</td>
      <td class="payment-saldo">${kspFormatRupiah(saldo)}</td>
      <td>${a.tanggal_bayar?kspFmtDate(a.tanggal_bayar):"-"}</td>
      <td><span class="ksp-status ${status==="lunas"?"active":""}">${esc(status)}</span></td>
      <td>${esc(a.catatan||"")}</td>
      <td>${locked?"":"<button type=\"button\" class=\"ksp-btn ksp-btn-primary save-payment\">Simpan</button>"}</td>
    </tr>`;
  }).join("");
}

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
    const baseTotal=amount(p.total_harus_dibayar??p.jumlah_pinjaman);
    const paid=schedule.reduce((sum,a)=>sum+effectivePaid(a),0);
    activeLoans.push({p,n:map[p.nasabah_id]||{},schedule,remaining:Math.max(0,baseTotal-paid),baseTotal});
  }
  renderActive();
}

function renderActive(){
  const term=input.value.trim().toLowerCase(), day=dateInput?.value||"";
  const rows=activeLoans.filter(x=>{
    const n=x.n;
    const text=[n.nomor_anggota,n.nama_lengkap,n.nik].map(v=>String(v||"").toLowerCase()).join(" ");
    const dateMatch=!day||x.schedule.some(a=>localDate(a.tanggal_jatuh_tempo)===day);
    return (!term||text.includes(term))&&dateMatch;
  });
  if(!rows.length){result.innerHTML='<section class="ksp-card"><div class="empty">Tidak ada pinjaman aktif yang cocok dengan filter.</div></section>';return}
  result.innerHTML=rows.map(x=>{
    const n=x.n,p=x.p,schedule=x.schedule,remaining=x.remaining, next=schedule.find(a=>String(a.status||"").toLowerCase()!=="lunas" && effectivePaid(a)<amount(a.jumlah_tagihan));
    return `<section class="ksp-card">
      <div class="ksp-customer"><strong>${esc(n.nama_lengkap)}</strong>
        <div class="meta">No. Anggota: ${esc(n.nomor_anggota)} · NIK: ${esc(n.nik)}</div>
        <div class="meta">${esc(n.alamat)}</div>
        <div class="meta">Pinjaman: ${kspFormatRupiah(p.jumlah_pinjaman)} · Jatuh tempo terakhir: ${kspFmtDate(p.tanggal_jatuh_tempo)}</div>
        <div class="meta">Jatuh tempo angsuran berikutnya: <strong>${next?kspFmtDate(next.tanggal_jatuh_tempo):"-"}</strong></div>
        <div class="meta"><strong>Sisa tanggungan angsuran: ${kspFormatRupiah(remaining)}</strong></div>
      </div>
      <h4 style="margin:14px 0 8px">Pembayaran Angsuran (maks. 12 baris)</h4>
      <div class="ksp-table-wrap ksp-angsuran-scroll"><table class="ksp-table ksp-angsuran-table"><thead><tr><th>No</th><th>Wajib Bayar</th><th>Tagihan</th><th>Angsuran Pokok</th><th>Angsuran Murni</th><th>Pelunasan</th><th>Titip Angsuran</th><th>Total Bayar</th><th>Saldo</th><th>Tanggal Bayar</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody id="tb-${p.id}">${scheduleRows(schedule,x.baseTotal)}</tbody></table></div>
    </section>`;
  }).join("");
  document.querySelectorAll('.save-payment').forEach(b=>b.addEventListener('click',savePayment));
  document.querySelectorAll('.ksp-angsuran-table input:not([type=date])').forEach(kspInputThousand);
  document.querySelectorAll('.ksp-angsuran-table tr').forEach(tr=>{
    tr.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',()=>updateRowPreview(tr)));
  });
}

function updateRowPreview(tr){
  const vals=["pokok","murni","pelunasan","titip"].map(k=>kspNominal(tr.querySelector(`[name="${k}"]`)?.value||0));
  const total=vals.reduce((a,b)=>a+b,0);
  const card=tr.closest(".ksp-card");
  const totalEl=tr.querySelector(".payment-total"); if(totalEl) totalEl.textContent=kspFormatRupiah(total);
  // Saldo preview is calculated against already stored payments before this row plus current input.
  let running=0;
  [...card.querySelectorAll("tbody tr")].forEach(r=>{
    if(r===tr){running+=total}else{running+=Number(r.dataset.paid||0)}
    const s=Math.max(0,Number(activeLoans.find(x=>x.p.id===card.querySelector(".save-payment")?.dataset.pid||"")?.baseTotal||0)-running);
    const se=r.querySelector(".payment-saldo"); if(se)se.textContent=kspFormatRupiah(s);
  });
}

async function savePayment(e){
  const button=e.currentTarget,tr=button.closest("tr"),card=button.closest(".ksp-card"),pid=card.querySelector("tbody")?.id?.replace("tb-","");
  const id=tr.dataset.id;
  if(!id){kspNotify("Data angsuran tidak ditemukan.","error");return}
  const values={
    angsuran_pokok:kspNominal(tr.querySelector('[name="pokok"]')?.value||0),
    angsuran_murni:kspNominal(tr.querySelector('[name="murni"]')?.value||0),
    pelunasan:kspNominal(tr.querySelector('[name="pelunasan"]')?.value||0),
    titip_angsuran:kspNominal(tr.querySelector('[name="titip"]')?.value||0)
  };
  const total=Object.values(values).reduce((a,b)=>a+b,0);
  if(total<=0){kspNotify("Isi minimal satu nominal pembayaran.","warning");return}
  const tanggalBayar=prompt("Tanggal bayar (YYYY-MM-DD)",new Date().toISOString().slice(0,10));
  if(tanggalBayar===null)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(tanggalBayar)){kspNotify("Format tanggal bayar harus YYYY-MM-DD.","warning");return}
  const catatan=prompt("Catatan pembayaran (opsional)","");
  if(catatan===null)return;
  button.disabled=true;
  const r=await supabaseClient.from("angsuran").update({
    ...values,total,jumlah_dibayar:total,tanggal_bayar:tanggalBayar,
    status:"sebagian",catatan:catatan||null
  }).eq("id",id).select().single();
  if(r.error){button.disabled=false;kspNotify(r.error.message,"error","Pembayaran gagal");return}

  const ok=await recalcLoan(pid);
  if(!ok){
    button.disabled=false;
    kspNotify("Pembayaran tersimpan, tetapi penyesuaian jadwal belum selesai. Periksa kembali pinjaman ini.","warning","Perlu pemeriksaan");
    return;
  }
  kspNotify("Pembayaran berhasil disimpan. Sisa tanggungan dan tagihan angsuran berikutnya dihitung ulang.","success","Berhasil");
  await loadActiveLoans();
}

async function recalcLoan(pid){
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

  // Any remaining balance is redistributed over future installments that
  // have not received a payment yet. This accepts over/under-payment on
  // the current row while preserving all payment history.
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

btn.onclick=renderActive;
if(dateButton)dateButton.onclick=renderActive;
input.addEventListener("keydown",e=>{if(e.key==='Enter'){e.preventDefault();renderActive()}});
loadActiveLoans();
