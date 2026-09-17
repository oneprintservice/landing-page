
const ROLE=kspSession.get()?.role; kspStartSessionGuard(); let selected=null;
const customerSearch=document.getElementById("customerSearch"), results=document.getElementById("customerResults"), selectedBox=document.getElementById("selected");
const esc=kspEscape;
async function findCustomers(){
 const t=customerSearch.value.trim(); if(!t){kspNotify("Masukkan nomor anggota, nama, atau NIK.","warning");return}
 results.innerHTML="<p>Mencari...</p>";
 const {data,error}=await supabaseClient.from("nasabah").select("*").or(`nomor_anggota.ilike.%${t}%,nama_lengkap.ilike.%${t}%,nik.ilike.%${t}%`).limit(10);
 if(error){kspNotify(error.message,"error","Pencarian gagal");return}
 if(!data?.length){results.innerHTML="";kspNotify("Nasabah tidak ditemukan.","warning");return}
 results.innerHTML=data.map(n=>`<button type="button" class="ksp-customer" data-id="${n.id}" style="width:100%;text-align:left;margin-bottom:7px;cursor:pointer"><strong>${esc(n.nama_lengkap)}</strong><div class="meta">No. Anggota: ${esc(n.nomor_anggota||"-")} · NIK: ${esc(n.nik||"-")} · Score ${Number(n.credit_score??10)}/10</div></button>`).join("");
 results.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>selectCustomer(data.find(n=>String(n.id)===String(b.dataset.id))));
}
function selectCustomer(n){selected=n;results.innerHTML="";selectedBox.innerHTML=`<div class="ksp-customer"><strong>${esc(n.nama_lengkap)}</strong><div class="meta">No. Anggota: ${esc(n.nomor_anggota||"-")} · NIK: ${esc(n.nik||"-")}</div><div class="meta">${esc(n.alamat||"-")}</div><div style="margin-top:5px"><span class="ksp-score ${kspScoreClass(n.credit_score)}">${Number(n.credit_score??10)}/10 · ${kspScoreLabel(n.credit_score)}</span></div></div>`}
document.getElementById("customerSearchBtn").onclick=findCustomers;customerSearch.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();findCustomers()}});
kspInputThousand(document.getElementById("jumlah"));
document.getElementById("form").addEventListener("submit",async e=>{
 e.preventDefault(); if(!selected){kspNotify("Pilih nasabah terlebih dahulu.","warning");return}
 const score=Number(selected.credit_score??10); if(score<=3){kspNotify("Nasabah tidak dapat mengajukan kredit karena status credit score.","error","Pengajuan diblokir");return}
 const payload={nasabah_id:selected.id,jumlah_pengajuan:kspNominal(document.getElementById("jumlah").value),tenor:Number(document.getElementById("tenor").value),tujuan:document.getElementById("tujuan").value.trim(),catatan:document.getElementById("catatan").value.trim(),model_jatuh_tempo:document.getElementById("model").value,status:"pending"};
 let r=await supabaseClient.from("pengajuan_kredit").insert(payload).select().single();if(r.error){kspNotify(r.error.message,"error","Pengajuan gagal");return}
 kspNotify("Kredit berhasil diajukan.","success","Berhasil");e.target.reset();document.getElementById("model").value="mingguan";selected=null;selectedBox.innerHTML="";load();
});
async function load(){
 const term=document.getElementById("filter").value.trim();
 let {data,error}=await supabaseClient.from("pengajuan_kredit").select("*").order("created_at",{ascending:false});
 if(error){kspNotify(error.message,"error","Gagal memuat pengajuan");return}
 const ids=[...new Set((data||[]).map(x=>x.nasabah_id).filter(Boolean))];let ns=[];if(ids.length){let r=await supabaseClient.from("nasabah").select("*").in("id",ids);ns=r.data||[]}
 const map=Object.fromEntries(ns.map(n=>[n.id,n]));data=(data||[]).filter(p=>{const n=map[p.nasabah_id]||{};return !term||[n.nomor_anggota,n.nama_lengkap,n.nik,String(n.credit_score??10),kspFmtDate(p.created_at)].some(v=>String(v||"").toLowerCase().includes(term.toLowerCase()))});
 const rows=document.getElementById("rows");if(!data.length){rows.innerHTML='<tr><td colspan="11">Tidak ada pengajuan.</td></tr>';return}
 rows.innerHTML=data.map(p=>{const n=map[p.nasabah_id]||{},score=Number(n.credit_score??10);return `<tr><td>${kspFmtDate(p.created_at)}</td><td>${esc(n.nomor_anggota||"-")}</td><td>${esc(n.nama_lengkap||"-")}</td><td>${esc(n.nik||"-")}</td><td>${kspFormatRupiah(p.jumlah_pengajuan)}</td><td>${p.tenor}</td><td>${esc(p.model_jatuh_tempo||"mingguan")}</td><td>${esc(n.status||"aktif")}</td><td><span class="ksp-score ${kspScoreClass(score)}">${score}/10</span></td><td><span class="ksp-status ${p.status==="pending"?"pending":""}">${esc(p.status||"-")}</span></td>${ROLE==="admin"&&p.status==="pending"?`<td><div style="display:flex;gap:6px"><button class="ksp-btn ksp-btn-success" style="min-height:36px;padding:8px" onclick="approve('${p.id}')">Setujui</button><button class="ksp-btn ksp-btn-danger" style="min-height:36px;padding:8px" onclick="reject('${p.id}')">Tolak</button></div></td>`:ROLE==="admin"?'<td>-</td>':''}</tr>`}).join("");
}
async function approve(id){
 const r=await supabaseClient.from("pengajuan_kredit").select("*").eq("id",id).single();if(r.error)return kspNotify(r.error.message,"error");
 const p=r.data,nr=await supabaseClient.from("nasabah").select("*").eq("id",p.nasabah_id).single();if(nr.error)return kspNotify(nr.error.message,"error");
 const reactivated=String(nr.data.status||"aktif").toLowerCase()!=="aktif";if(Number(nr.data.credit_score??10)<=3)return kspNotify("Credit score 0–3 memblokir pengajuan.","error","Tidak dapat disetujui");
 const start=new Date(), end=new Date(start);if(p.model_jatuh_tempo==="bulanan")end.setMonth(end.getMonth()+p.tenor);else end.setDate(end.getDate()+p.tenor*7);
 const total=p.jumlah_pengajuan, loan=await supabaseClient.from("pinjaman").insert({nasabah_id:p.nasabah_id,jumlah_pinjaman:total,tenor:p.tenor,tanggal_mulai:start.toISOString(),tanggal_jatuh_tempo:end.toISOString(),total_harus_dibayar:total,total_dibayar:0,sisa_pinjaman:total,status:"aktif",model_jatuh_tempo:p.model_jatuh_tempo}).select().single();
 if(loan.error)return kspNotify(loan.error.message,"error","Pinjaman gagal dibuat");
 const base=Math.floor(total/p.tenor), rem=total-base*p.tenor, rows=[];for(let i=1;i<=p.tenor;i++){let d=new Date(start);if(p.model_jatuh_tempo==="bulanan")d.setMonth(d.getMonth()+i);else d.setDate(d.getDate()+i*7);let amt=base+(i===p.tenor?rem:0);rows.push({pinjaman_id:loan.data.id,angsuran_ke:i,tanggal_jatuh_tempo:d.toISOString(),jumlah_tagihan:amt,jumlah_dibayar:0,status:"belum_bayar",catatan:null,angsuran_pokok:amt,angsuran_murni:amt,pelunasan:0,total:amt,titip_angsuran:0,saldo:total-amt*i})}
 const ar=await supabaseClient.from("angsuran").insert(rows);if(ar.error)return kspNotify(ar.error.message,"error","Jadwal gagal dibuat");
 const up={status:"disetujui"};const pr=await supabaseClient.from("pengajuan_kredit").update(up).eq("id",id);if(pr.error)return kspNotify(pr.error.message,"error");
 if(reactivated)await supabaseClient.from("nasabah").update({status:"aktif",credit_score:5}).eq("id",p.nasabah_id);
 kspNotify("Pinjaman dan jadwal angsuran berhasil dibuat.","success","Pengajuan disetujui");load();
}
async function reject(id){let r=await supabaseClient.from("pengajuan_kredit").update({status:"ditolak"}).eq("id",id);if(r.error)kspNotify(r.error.message,"error","Gagal menolak");else{kspNotify("Pengajuan ditolak.","info");load()}}
document.getElementById("filterBtn").onclick=load;document.getElementById("filter").addEventListener("keydown",e=>{if(e.key==="Enter")load()});load();
