        async function loadStatistik(){

            const snapshot =
                await db.ref('servis')
                .once('value');

            let aktif = 0;
            let servisBaru = 0;
            let sparepart = 0;
            let selesai = 0;
            let total = 0;

            snapshot.forEach(child => {

                total++;

                const data = child.val();

                const status =
                    (data.status || '')
                    .toUpperCase();

                if(status === 'MASUK' ){

                    servisBaru++;

                }

                if(
                    status === 'MASUK' ||
                    status === 'DIAGNOSA' ||
                    status === 'DIKERJAKAN'
                ){
                    aktif++;
                }

                if(
                    status ===
                    'MENUNGGU SPAREPART'
                ){
                    sparepart++;
                }

                if(
                    status === 'SELESAI'
                ){
                    selesai++;
                }

            });

            document.getElementById(
                'stat-aktif'
            ).innerText = aktif;

            document.getElementById(
                'stat-sparepart'
            ).innerText = sparepart;

            document.getElementById(
                'stat-selesai'
            ).innerText = selesai;

            document.getElementById(
                'stat-total'
            ).innerText = total;

            const badge =
                document.getElementById(
                    'badge-servis-baru'
                );
            
            if(servisBaru > 0){
            
                badge.classList.remove(
                    'hidden'
                );
            
                badge.innerText =
                    servisBaru;
            
            }else{
            
                badge.classList.add(
                    'hidden'
                );
            
            }

        }
        function bukaModalStatistik(judul, html){
        
            document.getElementById(
                'modal-judul'
            ).innerText = judul;
        
            document.getElementById(
                'modal-isi'
            ).innerHTML = html;
        
            document.getElementById(
                'modal-statistik'
            ).classList.remove('hidden');
        
        }
        
        function tutupModalStatistik(){
        
            document.getElementById(
                'modal-statistik'
            ).classList.add('hidden');
        
        }
        async function lihatServisAktif(){
        
            const snapshot =
                await db.ref('servis')
                .once('value');
        
            let html = '';
        
            const sekarang = new Date();
        
            snapshot.forEach(child => {
        
                const data = child.val();
        
                const status =
                    (data.status || '')
                    .toUpperCase();
        
                if(
                    status === 'MASUK' ||
                    status === 'DIAGNOSA' ||
                    status === 'DIKERJAKAN'
                ){
        
                    const umur =
                        Math.floor(
                            (
                                sekarang -
                                new Date(data.tanggal)
                            )
                            / 86400000
                        );
        
                    html += `
                        <div class="border-b py-2">
                    
                            ${
                                status === 'MASUK'
                                ? `
                                <div class="
                                    text-red-600
                                    font-bold
                                    text-xs
                                    mb-1
                                ">
                                    🔴 BARU MASUK
                                </div>
                                `
                                : ''
                            }
        
                            <div class="font-bold">
                                ${data.nomor}
                            </div>
        
                            <div>
                                ${data.pelanggan}
                            </div>
        
                            <div>
                                ${data.merk}
                            </div>

                            <div class="text-xs text-gray-600">
                            
                                ${
                                    status === 'MASUK'
                                    ? (
                                        data.keluhan ||
                                        'Belum ada keluhan'
                                    )
                                    : (
                                        data.keterangan ||
                                        '-'
                                    )
                                }
                            
                            </div>
        
                            <div class="
                                ${umur > 14
                                    ? 'text-red-600 font-bold'
                                    : ''
                                }
                            ">
                                ${umur} hari
                            </div>
        
                        </div>
                    `;
        
                }
        
            });
        
            bukaModalStatistik(
                'Servis Aktif',
                html || 'Tidak ada data'
            );
        
        }
        async function lihatMenungguSparepart(){
        
            const snapshot =
                await db.ref('servis')
                .once('value');
        
            let html = '';
        
            const sekarang = new Date();
        
            snapshot.forEach(child => {
        
                const data = child.val();
        
                if(
                    (data.status || '').toUpperCase()
                    === 'MENUNGGU SPAREPART'
                ){
        
                    const umur =
                        Math.floor(
                            (
                                sekarang -
                                new Date(data.tanggal)
                            ) / 86400000
                        );
        
                    html += `
                        <div class="border-b py-2">
        
                            <div class="font-bold">
                                ${data.nomor}
                            </div>
        
                            <div>
                                ${data.pelanggan}
                            </div>
        
                            <div>
                                ${data.merk}
                            </div>
        
                            <div class="text-xs text-gray-600">
                                ${data.keterangan || '-'}
                            </div>
        
                            <div class="
                                ${umur > 14
                                    ? 'text-red-600 font-bold'
                                    : ''
                                }
                            ">
                                ${umur} hari
                            </div>
        
                        </div>
                    `;
                }
        
            });
        
            bukaModalStatistik(
                'Menunggu Sparepart',
                html || 'Tidak ada data'
            );
        
        }
        async function lihatSelesai(){
        
            const snapshot =
                await db.ref('servis')
                .once('value');
        
            let html = '';
        
            const sekarang = new Date();
        
            snapshot.forEach(child => {
        
                const data = child.val();
        
                if(
                    (data.status || '').toUpperCase()
                    === 'SELESAI'
                ){
        
                    const umur =
                        Math.floor(
                            (
                                sekarang -
                                new Date(data.tanggal)
                            ) / 86400000
                        );
        
                    html += `
                        <div class="border-b py-2">
        
                            <div class="font-bold">
                                ${data.nomor}
                            </div>
        
                            <div>
                                ${data.pelanggan}
                            </div>
        
                            <div>
                                ${data.merk}
                            </div>
        
                            <div class="text-green-700 font-bold">
                                Rp ${(data.total || 0).toLocaleString()}
                            </div>
        
                            <div>
                                ${umur} hari
                            </div>
        
                        </div>
                    `;
                }
        
            });
        
            bukaModalStatistik(
                'Selesai Belum Diambil',
                html || 'Tidak ada data'
            );
        
        }
        async function lihatTotalServis(){
        
            const snapshot =
                await db.ref('servis')
                .once('value');
        
            let html = '';
        
            let totalCair = 0;
            let totalModal = 0;
            let jumlahDiambil = 0;
            let jumlahSelesai = 0;
        
            snapshot.forEach(child => {
        
                const data = child.val();
        
                const status =
                    (data.status || '')
                    .toUpperCase();
        
                if(
                    status === 'SELESAI' ||
                    status === 'DIAMBIL'
                ){
        
                    if(status === 'DIAMBIL'){
                    
                        jumlahDiambil++;
                    
                        totalCair +=
                            Number(data.total || 0);
                    
                        (data.sparepart || []).forEach(item => {
                    
                            let modalItem = 0;
                    
                            // barang inventori biasa
                            if(item.harga_beli){
                    
                                modalItem =
                                    Number(item.harga_beli);
                    
                            }
                    
                            // fallback hitung dari inventori
                            else{
                    
                                const dataInv =
                                    inventoriCache.find(
                                        x =>
                                        x.key === item.key &&
                                        x.kategori === item.kategori
                                    );
                    
                                if(dataInv){
                    
                                    modalItem =
                                        Number(
                                            dataInv.harga_beli || 0
                                        );
                    
                                    const satuan =
                                        (
                                            dataInv.satuan || ''
                                        ).toLowerCase();
                    
                                    // tinta & cleaner
                                    if(satuan === 'ml'){
                    
                                        modalItem =
                                            modalItem / 10;
                    
                                    }
                    
                                    // toner
                                    if(satuan === 'gram'){
                    
                                        modalItem =
                                            modalItem / 10;
                    
                                    }
                    
                                }
                    
                            }
                    
                            totalModal += modalItem;
                    
                        });
                    
                    }
        
                    if(status === 'SELESAI'){
                        jumlahSelesai++;
                    }
        
                    html += `
                        <div class="border-b py-2">
        
                            <div class="font-bold">
                                ${data.nomor}
                            </div>
        
                            <div>
                                ${data.pelanggan}
                            </div>
        
                            <div>
                                ${data.merk}
                            </div>
        
                            <div>
                                Rp ${(data.total || 0).toLocaleString()}
                            </div>
        
                            <div class="
                                ${
                                    status === 'DIAMBIL'
                                    ? 'text-green-600'
                                    : 'text-amber-600'
                                }
                                font-bold
                            ">
                                ${
                                    status === 'DIAMBIL'
                                    ? '🟢 DIAMBIL'
                                    : '🟡 SELESAI'
                                }
                            </div>
        
                        </div>
                    `;
                }
        
            });
        
            html += `
                <div class="mt-4 p-3 bg-gray-100 rounded">
        
                    <div class="font-bold">
                        Pendapatan Cair:
                        Rp ${totalCair.toLocaleString()}
                    </div>

                    <div class="font-bold text-red-600 mt-1">
                        Modal Keluar:
                        Rp ${totalModal.toLocaleString()}
                    </div>
                    
                    <div class="font-bold text-green-700 mt-1">
                        Estimasi Profit:
                        Rp ${(totalCair - totalModal).toLocaleString()}
                    </div>
        
                    <div>
                        Diambil:
                        ${jumlahDiambil}
                    </div>
        
                    <div>
                        Belum Diambil:
                        ${jumlahSelesai}
                    </div>
        
                </div>
            `;
        
            bukaModalStatistik(
                'Rekap Total Servis',
                html
            );
        
        }
        async function cariServis(){
        
            const keyword =
                document.getElementById(
                    'cari-servis'
                ).value.trim();
        
            if(!keyword){
                alert('Masukkan nomor yang dicari');
                return;
            }
        
            // 1. Coba cari langsung berdasarkan key
            const byKey =
                await db.ref(
                    'servis/' + keyword
                ).once('value');
        
            if(byKey.exists()){
        
                bukaServis(
                    keyword,
                    byKey.val()
                );
        
                return;
            }
        
            // 2. Cari berdasarkan nomor invoice
            const all =
                await db.ref('servis')
                .once('value');
        
            let ketemu = false;
        
            all.forEach(child => {
        
                const data = child.val();
        
                if(
                    data.nomor === keyword ||
                    data.serial === keyword
                ){
        
                    ketemu = true;
        
                    bukaServis(
                        child.key,
                        data
                    );
        
                }
        
            });
        
            if(!ketemu){
        
                alert('Servis tidak ditemukan');
        
            }
        
        }
        function bukaServis(key,data){
        
            currentServisKey = key;

            document.getElementById(
                'btn-update-servis'
            ).classList.remove('hidden');

            document.getElementById(
                'btn-reprint-nota'
            ).classList.remove('hidden');

            document.getElementById(
                'btn-batal-edit'
            ).classList.remove('hidden');

            document.getElementById(
                'btn-hapus-servis'
            ).classList.remove('hidden');
        
            document.getElementById(
                'mode-edit'
            ).classList.remove('hidden');
        
            document.getElementById(
                'mode-edit'
            ).innerHTML =
                '🟢 MODE EDIT : ' + key;
        
            document.getElementById(
                'barcode-input'
            ).value =
                data.serial || '';
        
            document.getElementById(
                'input-nama'
            ).value =
                data.pelanggan || '';
        
            document.getElementById(
                'input-telp'
            ).value =
                data.telp || '';
        
            document.getElementById(
                'input-merk'
            ).value =
                data.merk || '';
        
            document.getElementById(
                'input-kelengkapan'
            ).value =
                data.kelengkapan || '';
        
            document.getElementById(
                'input-keluhan'
            ).value =
                data.keluhan || '';
        
            document.getElementById(
                'status-servis'
            ).value =
                data.status || 'MASUK';
        
            document.getElementById(
                'keterangan-servis'
            ).value =
                data.keterangan || '';

            daftarTransaksi.jasa =
                data.jasa || [];
            
            daftarTransaksi.sparepart =
                data.sparepart || [];
            
            updateList();
        
        }
        function batalEditServis(){
        
            currentServisKey = null;

            document.getElementById(
                'btn-update-servis'
            ).classList.add('hidden');

            document.getElementById(
                'btn-reprint-nota'
            ).classList.add('hidden');

            document.getElementById(
                'btn-hapus-servis'
            ).classList.add('hidden');
        
            document.getElementById(
                'mode-edit'
            ).classList.add('hidden');
        
            document.getElementById(
                'btn-batal-edit'
            ).classList.add('hidden');
        
            document.getElementById(
                'cari-servis'
            ).value = '';
        
        }
        async function hapusServisAktif(){
        
            if(!currentServisKey){
                alert('Tidak ada servis yang dipilih');
                return;
            }
        
            if(
                !confirm(
                    'Yakin ingin menghapus servis ini?\n\n' +
                    currentServisKey
                )
            ){
                return;
            }
        
            const snapshot =
                await db.ref(
                    'servis/' + currentServisKey
                ).once('value');
        
            if(!snapshot.exists()){
                alert('Data tidak ditemukan');
                return;
            }
        
            const data = snapshot.val();
        
            // Kembalikan stok inventori
            const daftarBarang =
                data.sparepart || [];
        
            for(const item of daftarBarang){
        
                if(
                    item.dariInventori &&
                    item.kategori &&
                    item.key
                ){
        
                    const stokRef =
                        db.ref(
                            'inventori/' +
                            item.kategori +
                            '/' +
                            item.key +
                            '/stok'
                        );
        
                    const stokSnap =
                        await stokRef.once('value');
        
                    const stokLama =
                        stokSnap.val() || 0;
        
                    let pengembali = 1;
                    
                    const dataInv =
                        inventoriCache.find(
                            x =>
                            x.key === item.key &&
                            x.kategori === item.kategori
                        );
                    
                    if(dataInv){
                    
                        const satuan =
                            (dataInv.satuan || '')
                            .toLowerCase();
                    
                        if(satuan === 'ml'){
                    
                            pengembali = 100;
                    
                        }
                    
                        if(satuan === 'gram'){
                    
                            pengembali = 100;
                    
                        }
                    
                    }
                    
                    await stokRef.set(
                        stokLama + pengembali
                    );
        
                }
        
            }
        
            await db.ref(
                'servis/' + currentServisKey
            ).remove();
        
            alert(
                'Servis berhasil dihapus'
            );
        
            currentServisKey = null;

            document.getElementById(
                'btn-update-servis'
            ).classList.add('hidden');
        
            document.getElementById(
                'mode-edit'
            ).classList.add('hidden');
        
            document.getElementById(
                'btn-batal-edit'
            ).classList.add('hidden');
        
            document.getElementById(
                'btn-hapus-servis'
            ).classList.add('hidden');
        
            document.getElementById(
                'cari-servis'
            ).value = '';
        
            loadInventori();
            loadStatistik();
        
        }
        async function updateServisAktif(){
        
            if(!currentServisKey){
        
                alert('Tidak ada servis yang dibuka');
        
                return;
        
            }
        
            const dataUpdate = {
        
                pelanggan:
                    document.getElementById('input-nama').value,
        
                telp:
                    document.getElementById('input-telp').value,
        
                merk:
                    document.getElementById('input-merk').value,
        
                serial:
                    document.getElementById('barcode-input').value,
        
                kelengkapan:
                    document.getElementById('input-kelengkapan').value,
        
                keluhan:
                    document.getElementById('input-keluhan').value,
        
                status:
                    document.getElementById('status-servis').value,
        
                keterangan:
                    document.getElementById('keterangan-servis').value
        
            };
        
            try{
        
                await db.ref(
                    'servis/' + currentServisKey
                ).update(dataUpdate);
        
                loadStatistik();
        
                alert(
                    'Servis berhasil diupdate'
                );
        
            }catch(err){
        
                console.error(err);
        
                alert(
                    'Gagal update servis'
                );
        
            }
        
        }
        function resetFormServis(){
        
            currentServisKey = null;
        
            document.getElementById(
                'barcode-input'
            ).value = '';
        
            document.getElementById(
                'cari-servis'
            ).value = '';
        
            document.getElementById(
                'input-nama'
            ).value = '';
        
            document.getElementById(
                'input-telp'
            ).value = '';
        
            document.getElementById(
                'input-merk'
            ).value = '';
        
            document.getElementById(
                'input-kelengkapan'
            ).value = '';
        
            document.getElementById(
                'input-keluhan'
            ).value = '';
        
            document.getElementById(
                'status-servis'
            ).value = 'MASUK';
        
            document.getElementById(
                'keterangan-servis'
            ).value = '';

            document.getElementById(
                'btn-reprint-nota'
            ).classList.add('hidden');
        
            daftarSparepart = [];
            daftarTransaksi = {
                jasa: [],
                sparepart: []
            };
            
            updateList();
        
            renderDaftarSparepart();
        
            document.getElementById(
                'mode-edit'
            ).classList.add('hidden');
        
            document.getElementById(
                'btn-update-servis'
            ).classList.add('hidden');
        
            document.getElementById(
                'btn-hapus-servis'
            ).classList.add('hidden');
        
            document.getElementById(
                'btn-batal-edit'
            ).classList.add('hidden');
        
        }
        function reprintNota(){
        
            if(!currentServisKey){
        
                alert(
                    'Tidak ada servis dipilih'
                );
        
                return;
        
            }
        
            cetakDokumen(
                'nota',
                true
            );
        
        }
