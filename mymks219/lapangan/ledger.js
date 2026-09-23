
const session=kspSession.get(); kspStartSessionGuard();
const role=session?.role||"";
const tanggal=document.getElementById("tanggal"), nomor=document.getElementById("nomorAnggota"), nama=document.getElementById("nama"), alamat=document.getElementById("alamat");
const filterTanggal=document.getElementById("filterTanggal"), filterStaf=document.getElementById("filterStaf"), txBody=document.getElementById("txBody");
tanggal.value=new Date().toISOString().slice(0,10);
["dropLama","dropBaru","bht","materai"].forEach(id=>kspInputThousand(document.getElementById(id)));
async function lookup(){
 const n=nomor.value.trim(); if(!n){kspNotify("Masukkan nomor anggota lalu klik Cari.","warning");return}
 let {data,error}=await supabaseClient.from("nasabah").select("id,nama_lengkap,alamat,nomor_anggota").eq("nomor_anggota",n).maybeSingle();
 if(error){kspNotify(error.message,"error","Pencarian gagal");return}
 if(!data){nama.value="";alamat.value="";kspNotify("Nasabah tidak ditemukan.","warning");return}
 nama.value=data.nama_lengkap||"";alamat.value=data.alamat||"";kspNotify("Data nasabah ditemukan.","success");
}
document.getElementById("cariNasabah").onclick=lookup;
async function loadStaff(){let r=await supabaseClient.from("ledger_harian").select("staf_nama").not("staf_nama","is",null);let names=[...new Set((r.data||[]).map(x=>x.staf_nama).filter(Boolean))].sort();filterStaf.innerHTML='<option value="">Semua staf</option>'+names.map(n=>`<option>${kspEscape(n)}</option>`).join("");}
async function load(){
 txBody.innerHTML='<tr><td colspan="10">Memuat...</td></tr>';
 let q=supabaseClient.from("ledger_harian").select("*").order("tanggal",{ascending:false}).order("nomor_anggota",{ascending:true});
 if(filterTanggal.value)q=q.eq("tanggal",filterTanggal.value);
 if(filterStaf.value)q=q.eq("staf_nama",filterStaf.value);
 let {data,error}=await q;
 if(error){txBody.innerHTML='<tr><td colspan="10">Gagal mengambil transaksi.</td></tr>';kspNotify(error.message,"error","Ledger");return}
 txBody.innerHTML=data?.length?data.map((x,i)=>`<tr><td>${i+1}</td><td>${kspFmtDate(x.tanggal)}</td><td>${kspEscape(x.nomor_anggota)}</td><td>${kspEscape(x.nama)}</td><td>${kspEscape(x.alamat)}</td><td>${kspFormatRupiah(x.drop_lama)}</td><td>${kspFormatRupiah(x.drop_baru)}</td><td>${kspFormatRupiah(x.bht)}</td><td>${kspFormatRupiah(x.materai)}</td><td>${kspEscape(x.staf_nama||"-")}</td></tr>`).join(""):'<tr><td colspan="10">Belum ada transaksi.</td></tr>';
 const sum=(key)=>(data||[]).reduce((a,x)=>a+Number(x[key]||0),0);
 document.getElementById("totalLama").textContent=kspFormatRupiah(sum("drop_lama"));
 document.getElementById("totalBaru").textContent=kspFormatRupiah(sum("drop_baru"));
 document.getElementById("totalJumlah").textContent=kspFormatRupiah(sum("drop_lama")+sum("drop_baru"));
}
filterTanggal.onchange=load;filterStaf.onchange=load;
document.getElementById("ledgerForm").addEventListener("submit",async e=>{
 e.preventDefault(); if(!nama.value){kspNotify("Cari nomor anggota dan pastikan nasabah ditemukan.","warning");return}
 const payload={tanggal:tanggal.value,nomor_anggota:nomor.value.trim(),nama:nama.value,alamat:alamat.value,drop_lama:kspNominal(document.getElementById("dropLama").value),drop_baru:kspNominal(document.getElementById("dropBaru").value),bht:kspNominal(document.getElementById("bht").value),materai:kspNominal(document.getElementById("materai").value),staf_nama:session.user};
 let r=await supabaseClient.from("ledger_harian").insert(payload);
 if(r.error){kspNotify(r.error.message,"error","Ledger gagal disimpan");return}
 kspNotify("Ledger berhasil disimpan.","success","Berhasil");e.target.reset();tanggal.value=new Date().toISOString().slice(0,10);nama.value="";alamat.value="";await loadStaff();await load();
});
loadStaff().then(load);
