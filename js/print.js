        function cetakDokumen(tipe, reprint = false) {
            simpanDataKeDatabase();

            const nama = document.getElementById('input-nama').value || '-';
            const telp = document.getElementById('input-telp').value || '-';
            const merk = document.getElementById('input-merk').value || '-';
            const kelengkapan = document.getElementById('input-kelengkapan').value || '-';
            const keluhan = document.getElementById('input-keluhan').value || '-';
            const sn = document.getElementById('barcode-input').value || '-';
            const total = updateList();
            const tgl = new Date().toLocaleDateString('id-ID');
            const now = new Date();
            let noNota;
            
            if(currentServisKey){
            
                noNota = currentServisKey;
            
            }else{
            
                noNota =
                    `${String(now.getFullYear()).slice(-2)}${
                    String(now.getMonth()+1).padStart(2,'0')
                    }${
                    String(now.getDate()).padStart(2,'0')
                    }${
                    String(now.getHours()).padStart(2,'0')
                    }${
                    String(now.getMinutes()).padStart(2,'0')
                    }`;
            
            }            
            const dataServis = {
                nomor: noNota,
                tanggal: now.toISOString(),
                pelanggan: nama,
                telp: telp,
                merk: merk,
                serial: sn,
                kelengkapan: kelengkapan,
                keluhan: keluhan,
                jasa: daftarTransaksi.jasa,
                sparepart: daftarTransaksi.sparepart,
                total: total,
                teknisi: currentTeknisi,
                status: document.getElementById('status-servis').value,
                keterangan: document.getElementById('keterangan-servis').value
            };

            const kopHeader = `
                <div class="header">
                    <div class="header-left">
                        <img src="logos.png" class="logo-image" onerror="this.outerHTML='<div style=\\'width:55px;height:55px;border:1px solid #000;margin-right:12px;display:flex;align-items:center;justify-content:center;font-size:8px;\\'>LOGO</div>'">
                        <div class="company-info">
                            <div class="company-name">OnePrint Service</div>
                            <p class="tagline italic">Melayani Perbaikan Printer, Laptop, dan Komputer</p>
                            <p class="address-info">Jl. Jula-Juli No.71 Tambakbayan, Ponorogo</p>
                            <p class="address-info font-bold">HP / WA: 082-337-557-178</p>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="invoice-title">
                            ${tipe === 'nota' ? 'INVOICE' : 'TANDA TERIMA'}
                        </div>
                    
                        <span class="invoice-number">
                            # ${tipe === 'nota' ? 'INV' : 'TT'}-${noNota}
                        </span>
                    </div>
                </div>`;

            // PERBAIKAN: Layout Grid yang mepet ke kiri
            const clientGrid = `
                <div class="client-data">
                    <label>Pelanggan</label><span class="display-data">: ${nama}</span>
                    <label>Tanggal</label><span class="display-data">: ${tgl}</span>
                    <label>Telepon</label><span class="display-data">: ${telp}</span>
                    <label>Merk/Tipe</label><span class="display-data">: ${merk}</span>
                    <label>Serial No.</label><span class="display-data">: ${sn}</span>
                    <label>Kelengkapan</label><span class="display-data">: ${kelengkapan}</span>
                </div>`;

            let mainContent = '';
            let noteContent = '';

            if(tipe === 'nota') {
                let rows = '';
                ['jasa', 'sparepart'].forEach(cat => {
                    rows += `<tr class="category-header"><td style="text-align:center">-</td><td colspan="2">${cat === 'jasa' ? 'A. JASA SERVIS' : 'B. SPAREPART / TINTA'}</td></tr>`;
                    if(daftarTransaksi[cat].length === 0) rows += `<tr><td style="text-align:center">-</td><td>-</td><td style="text-align:right">-</td></tr>`;
                    daftarTransaksi[cat].forEach((item, i) => {
                        rows += `<tr><td style="text-align:center">${i+1}</td><td class="uppercase">${item.nama}</td><td style="text-align:right">Rp ${item.harga.toLocaleString()}</td></tr>`;
                    });
                });
                mainContent = `<table class="service-table"><thead><tr><th width="5%">No</th><th width="70%">Rincian</th><th width="25%">Subtotal</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="font-bold"><td colspan="2" style="text-align:right">TOTAL :</td><td style="text-align:right; background:#eee;">Rp ${total.toLocaleString()}</td></tr></tfoot></table>`;
                noteContent = `<div class="note-box"><span class="note-title">PERHATIAN:</span><ol><li>1. Simpan nota / invoice sebagai bukti garansi.</li><li>2. Garansi tidak berlaku jika segel rusak atau cacat fisik karena pemakaian.</li></ol></div>`;
            } else {
                mainContent = `<div style="border:1px solid #000; padding:10px; min-height:160px; font-size:10px;"><div style="font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:8px;">KELUHAN PERANGKAT:</div><div class="uppercase">${keluhan.replace(/\n/g, '<br>')}</div>
<hr style="margin:10px 0">

<div style="
display:flex;
justify-content:space-between;
align-items:center;
gap:15px;
">

<div style="
font-size:9px;
line-height:1.5;
flex:1;
">

<b>TRACKING SERVIS ONLINE</b><br>

oneprintservice.web.id/tracking<br>

Masukkan nomor tanda terima:<br>

<b>TT-${noNota}</b><br>

atau scan QR di samping.

</div>

<div id="qr-print"></div>

</div>

</div>` ;
                noteContent = `<div class="note-box"><span class="note-title">SYARAT PENGAMBILAN:</span><ol><li>WAJIB bawa tanda terima ini saat pengambilan.</li><li>Barang tidak diambil >2 bulan setelah konfirmasi bukan tanggung jawab kami.</li></ol></div>`;
            }

            const trackingUrl=`https://oneprintservice.web.id/tracking.html?tt=${noNota}`;
document.getElementById('print-container').innerHTML = `
                <div class="invoice-page">
                    ${kopHeader}
                    ${clientGrid}
                    ${mainContent}
                    <div class="footer-area">
                        ${noteContent}
                        <div class="signature-wrapper">
                            <div class="signature-box">
                                <span>Hormat Kami,</span>
                                <span class="signature-line">${currentTeknisi}</span>
                            </div>
                            <div class="signature-box">
                                <span>Pelanggan,</span>
                                <span class="signature-line">(${nama})</span>
                            </div>
                        </div>
                    </div>
                </div>`;

            if(!reprint){
            
                const aksiSimpan =
                    currentServisKey
                    ? db.ref(
                        'servis/' + currentServisKey
                      ).update(dataServis)
                    : db.ref(
                        'servis/' + noNota
                      ).set(dataServis);
            
                aksiSimpan
                .then(() => {
            
                    console.log(
                        currentServisKey
                        ? 'Servis diupdate'
                        : 'Servis baru disimpan'
                    );
            
                    loadStatistik();
            
                    setTimeout(()=>{
const qrEl=document.getElementById('qr-print');
if(qrEl && typeof QRCode!=='undefined'){
 qrEl.innerHTML='';
 new QRCode(qrEl,{text:trackingUrl,width:110,height:110});
}
setTimeout(()=>window.print(),300);
},100);
            
                })
                .catch(err => {
            
                    console.error(err);
            
                    alert(
                        'Gagal menyimpan data servis!'
                    );
            
                });
            
            }else{
            
                window.print();
            
            }

            }
            document.getElementById('btn-simpan-inventori')
        .addEventListener('click', () => {

            const nama = document.getElementById('inv-nama').value.trim();
            const kategori = document.getElementById('inv-kategori').value;
            const beli = parseInt(document.getElementById('inv-beli').value) || 0;
            const jual = parseInt(document.getElementById('inv-jual').value) || 0;
            const stok = parseInt(document.getElementById('inv-stok').value) || 0;
            const satuan = document.getElementById('inv-satuan').value;

            if (!nama) {
                alert('Nama barang wajib diisi');
                return;
            }

            const key = nama
                .toUpperCase()
                .replace(/\s+/g, '_');

            const saveKey =
                inventoriEditKey || key;

            const saveKategori =
                inventoriEditKategori || kategori;

            db.ref(
                'inventori/' +
                saveKategori +
                '/' +
                saveKey
            ).set({
                nama: nama,
                harga_beli: beli,
                harga_jual: jual,
                stok: stok,
                satuan: satuan,
                minimum:
                    kategori === 'tinta'
                    ? 100
                    : 1
            })
            .then(() => {
                alert('Barang berhasil disimpan');

                inventoriEditKey = null;
                inventoriEditKategori = null;

                document.getElementById(
                    'btn-simpan-inventori'
                ).innerText = 'SIMPAN BARANG';

                loadInventori();

                document.getElementById('inv-nama').value = '';
                document.getElementById('inv-beli').value = '';
                document.getElementById('inv-jual').value = '';
                document.getElementById('inv-stok').value = '';
                document.getElementById('inv-satuan').selectedIndex = 0;
                document.getElementById('inv-kategori').selectedIndex = 0;
            })
            .catch(err => {
                console.error(err);
                alert('Gagal menyimpan inventori');
            });

        });
