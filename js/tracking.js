const steps=['MASUK','DIAGNOSA','MENUNGGU SPAREPART','DIKERJAKAN','SELESAI','DIAMBIL'];
const statusInfo={
'DIAGNOSA':['#eadcff','Unit sedang dalam tahap diagnosa.'],
'MENUNGGU SPAREPART':['#fff3bf','Sparepart sedang dalam proses pengadaan.'],
'DIKERJAKAN':['#dbeafe','Unit sedang dalam proses perbaikan.'],
'SELESAI':['#dcfce7','Unit telah selesai diperbaiki dan siap diambil.'],
'DIAMBIL':['#e5e7eb','Unit telah diterima pelanggan.']
};function maskNama(n){if(!n)return '-';let p=n.trim().split(' ');if(p.length===1)return p[0];let b=p.slice(1).join(' ');return p[0]+' '+b.substring(0,3)+'***';}function drawTimeline(s){let idx=steps.indexOf(s);let h='';steps.forEach((x,i)=>{let c='step';if(i<idx)c+=' done';if(i===idx)c+=' current';h+=`<div class='${c}'>${x}</div>`});document.getElementById('timeline').innerHTML=h;}async function cari(){let k=document.getElementById('tt').value.toUpperCase().replace('TT-','').replace('TT','').trim();let snap=await db.ref('servis/'+k).once('value');if(!snap.exists()){alert('Tidak ditemukan');return;}let d=snap.val();result.style.display='block';nomor.innerText='TT-'+d.nomor;status.innerText=d.status||'-';pelanggan.innerText=d.pelanggan||'-';merk.innerText=d.merk||'-';keluhan.innerHTML=(d.keluhan||'-').replace(/\n/g,'<br>');ket.innerHTML=(d.keterangan||'-').replace(/\n/g,'<br>');let st=(d.status||'').toUpperCase();
drawTimeline(st);
if(statusInfo[st]){
document.getElementById('statusbox').style.background=statusInfo[st][0];
document.getElementById('statusmsg').innerText=statusInfo[st][1];
}}
function startScan(){
 const r=document.getElementById('reader');
 r.style.display='block';document.getElementById('scanHint').style.display='block';
 const qr=new Html5Qrcode('reader');
 qr.start({facingMode:'environment'},{fps:10,qrbox:250},(txt)=>{
   let m=txt.match(/tt=([^&]+)/i);
   document.getElementById('tt').value=m?m[1]:txt.replace('TT-','');
   qr.stop().then(()=>{
      r.style.display='none';
      document.getElementById('scanAgain').style.display='block';
      cari();
   });
 });
}
const p=new URLSearchParams(location.search);
if(p.get('tt')){tt.value=p.get('tt');cari();}
