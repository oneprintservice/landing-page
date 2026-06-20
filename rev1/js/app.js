        const firebaseConfig = {
            apiKey: "AIzaSyBcyS36JnJNGZPdSxd_g9UmCq4BJRiG2rA",
            authDomain: "oneprintservice-db.firebaseapp.com",
            databaseURL: "https://oneprintservice-db-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "oneprintservice-db",
            storageBucket: "oneprintservice-db.firebasestorage.app",
            messagingSenderId: "330853999249",
            appId: "1:330853999249:web:4503ed115d2694d9cb5530"
        };
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.database();

        let currentTeknisi = "TEKNISI";
        let currentServisKey = null;

        auth.onAuthStateChanged(user => {
            if (!user) { window.location.href = 'login.html'; } 
            else { 
                const name = user.email.split('@')[0].toUpperCase();
                currentTeknisi = name;
                document.getElementById('user-display').innerText = "TEKNISI: " + name; 
            }
        });

        document.getElementById('btn-logout').addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'login.html');
        });

        let idleTime = 0;
        setInterval(() => {
            if (auth.currentUser) {
                idleTime++;
                document.getElementById('idle-timer').innerText = `Idle: ${idleTime}/30 mnt`;
                if (idleTime >= 30) auth.signOut().then(() => window.location.href = 'login.html');
            }
        }, 60000); 

        function resetTimer() { idleTime = 0; }
        window.onmousemove = resetTimer; window.onclick = resetTimer; window.onkeypress = resetTimer;

        function simpanDataKeDatabase() {
            const sn = document.getElementById('barcode-input').value.trim();
            if (!sn || sn === '-') return; 
            const safeSn = sn.replace(/[.#$[\]]/g, "_"); 
            db.ref('pelanggan/' + safeSn).update({
                nama: document.getElementById('input-nama').value,
                telp: document.getElementById('input-telp').value,
                merk: document.getElementById('input-merk').value,
                kelengkapan: document.getElementById('input-kelengkapan').value
            });
        }

        const barcodeInput = document.getElementById('barcode-input');
        function isiDataOtomatis(sn) {
            if(!sn) return;
            const safeSn = sn.trim().replace(/[.#$[\]]/g, "_");
            db.ref('pelanggan/' + safeSn).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    document.getElementById('input-nama').value = data.nama || '';
                    document.getElementById('input-telp').value = data.telp || '';
                    document.getElementById('input-merk').value = data.merk || '';
                    document.getElementById('input-kelengkapan').value = data.kelengkapan || '';
                    try { new Audio('https://www.soundjay.com/button/beep-07.mp3').play(); } catch(e){}
                }
            });
        }
        barcodeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') isiDataOtomatis(e.target.value); });

        let currentTab = 'jasa';
        let daftarTransaksi = { jasa: [], sparepart: [] };

        let inventoriCache = [];
        let inventoriEditKey = null;
        let inventoriEditKategori = null;
        let selectedInventori = null;
        async function loadInventori() {

            inventoriCache = [];

            const kategoriList =
                ['sparepart','tinta','lisensi','jasa'];

            for(const kategori of kategoriList){

                const snapshot =
                    await db.ref(
                        'inventori/' + kategori
                    ).once('value');

                snapshot.forEach(child => {

                    inventoriCache.push({
                        kategori: kategori,
                        key: child.key,
                        ...child.val()
                    });

                });

            }

            renderInventoriList();

        }

        loadInventori();
        loadStatistik();
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
        function setTab(tab) {
            currentTab = tab;
            document.getElementById('tab-jasa').className = tab === 'jasa' ? "px-4 py-2 border-b-2 border-blue-600 text-blue-600" : "px-4 py-2 text-gray-500";
            document.getElementById('tab-sparepart').className = tab === 'sparepart' ? "px-4 py-2 border-b-2 border-blue-600 text-blue-600" : "px-4 py-2 text-gray-500";
        }

        document.getElementById('btn-tambah-item').addEventListener('click', () => {
            const nama = document.getElementById('input-item-nama').value;
            const harga = parseInt(document.getElementById('input-item-harga').value) || 0;
            if(!nama || harga <= 0) return;
            const transaksiBaru = {
                nama,
                harga
            };

            if(selectedInventori){
                transaksiBaru.key = selectedInventori.key;
                transaksiBaru.kategori = selectedInventori.kategori;
                transaksiBaru.dariInventori = true;
            }

            if(selectedInventori){

                const item = inventoriCache.find(
                    x =>
                    x.key === selectedInventori.key &&
                    x.kategori === selectedInventori.kategori
                );

                if(item && item.kategori !== 'jasa'){

                    if((item.stok || 0) <= 0){

                        alert(item.nama + ' stok habis!');

                        return;
                    }

                    let pengurang = 1;
                    
                    const satuan =
                        (item.satuan || '')
                        .toLowerCase();
                    
                    if(satuan === 'ml'){
                    
                        pengurang = 100;
                    
                    }
                    
                    if(satuan === 'gram'){
                    
                        pengurang = 100;
                    
                    }
                    
                    const stokBaru =
                        (item.stok || 0) - pengurang;

                    db.ref(
                        'inventori/' +
                        item.kategori +
                        '/' +
                        item.key +
                        '/stok'
                    ).set(stokBaru);

                    item.stok = stokBaru;

                }

            }

            daftarTransaksi[currentTab].push(transaksiBaru);

            updateList();

            document.getElementById('input-item-nama').value = '';
            document.getElementById('input-item-harga').value = '';
            document.getElementById('input-item-nama').focus();
            selectedInventori = null;
            loadInventori();
        });

        function updateList() {
            const list = document.getElementById('list-transaksi');
            list.innerHTML = '';
            let total = 0;
            ['jasa', 'sparepart'].forEach(cat => {
                if(daftarTransaksi[cat].length > 0) {
                    list.innerHTML += `<div class="font-bold text-blue-800 mb-1 mt-1 uppercase text-[8px]">${cat}</div>`;
                    daftarTransaksi[cat].forEach((item, idx) => {
                        list.innerHTML += `<div class="flex justify-between py-1 border-b border-gray-200">
                            <span class="uppercase">
                                ${item.nama}
                                ${
                                    item.dariInventori
                                    ? '<span class="text-[8px] text-green-600 font-bold">[INV]</span>'
                                    : ''
                            }
                            </span>
                            <span>Rp ${item.harga.toLocaleString()} <i onclick="hapus(${idx},'${cat}')" class="fas fa-times-circle text-red-400 ml-1 cursor-pointer"></i></span>
                        </div>`;
                        total += item.harga;
                    });
                }
            });
            document.getElementById('text-total').innerText = 'Rp ' + total.toLocaleString();
            return total;
        }
        function hapus(idx, cat) {

            const item =
                daftarTransaksi[cat][idx];

            if(
                !confirm(
                    'Batalkan item "' +
                    item.nama +
                    '" ?'
                )
            ){
                return;
            }

            if(
                item &&
                item.dariInventori &&
                item.kategori !== 'jasa'
            ){

                const dataInv =
                    inventoriCache.find(
                        x =>
                        x.key === item.key &&
                        x.kategori === item.kategori
                    );

                if(dataInv){

                    let pengembali = 1;
                    
                    const satuan =
                        (dataInv.satuan || '')
                        .toLowerCase();
                    
                    if(satuan === 'ml'){
                    
                        pengembali = 100;
                    
                    }
                    
                    if(satuan === 'gram'){
                    
                        pengembali = 100;
                    
                    }
                    
                    const stokBaru =
                        (dataInv.stok || 0) + pengembali;
                        

                    db.ref(
                        'inventori/' +
                        dataInv.kategori +
                        '/' +
                        dataInv.key +
                        '/stok'
                    ).set(stokBaru);

                    dataInv.stok = stokBaru;

                }

            }

            daftarTransaksi[cat].splice(idx,1);

            updateList();

            loadInventori();

        }

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
            function renderInventoriList() {

                const target =
                    document.getElementById('inventori-list');

                if (!target) return;

                target.innerHTML = '';

                inventoriCache
                .sort((a,b) => a.nama.localeCompare(b.nama))
                .forEach(item => {

                    const div = document.createElement('div');

                    div.className =
                        'border rounded p-2 mb-2 bg-gray-50';

                    div.innerHTML = `
                        <div class="font-bold">
                            ${item.nama}
                        </div>

                        <div class="${
                            (item.stok || 0) <= 0
                            ? 'text-red-700 font-bold'
                            : ''
                        }">
                            Stok:
                            ${item.stok || 0}
                            ${item.satuan || ''}
                        </div>
                        ${(item.stok || 0) <= (item.minimum || 1)
                        ? '<div class="text-red-600 font-bold">⚠ STOK MENIPIS</div>'
                        : ''}

                        <div>
                            Jual:
                            Rp ${(item.harga_jual || 0).toLocaleString()}
                        </div>

                        <div class="mt-2 flex gap-2">

                            <button
                                onclick="editInventori('${item.kategori}','${item.key}')"
                                class="bg-yellow-500 text-white px-2 py-1 rounded text-[10px]">
                                EDIT
                            </button>

                            <button
                                onclick="hapusInventori('${item.kategori}','${item.key}')"
                                class="bg-red-600 text-white px-2 py-1 rounded text-[10px]">
                                HAPUS
                            </button>

                        </div>
                    `;

                    target.appendChild(div);

                });

            }
            function editInventori(kategori,key){

                const item =
                    inventoriCache.find(
                        x => x.kategori===kategori &&
                        x.key===key
                    );

                if(!item) return;

                inventoriEditKey = key;
                inventoriEditKategori = kategori;

                document.getElementById('inv-nama').value =
                    item.nama || '';

                document.getElementById('inv-beli').value =
                    item.harga_beli || 0;

                document.getElementById('inv-jual').value =
                    item.harga_jual || 0;

                document.getElementById('inv-stok').value =
                    item.stok || 0;

                document.getElementById('inv-satuan').value =
                    item.satuan || 'pcs';

                document.getElementById('inv-kategori').value =
                    kategori;

                document.getElementById('btn-simpan-inventori')
                    .innerText = 'UPDATE BARANG';

            }
            function hapusInventori(kategori,key){

                if(!confirm('Hapus barang ini?'))
                    return;

                db.ref(
                    'inventori/' +
                    kategori +
                    '/' +
                    key
                )
                .remove()
                .then(() => {

                    loadInventori();

                });

            }
            const searchInput = document.getElementById('input-item-nama');
            const hasilPencarian = document.getElementById('hasil-pencarian');

            searchInput.addEventListener('input', () => {

                const keyword = searchInput.value
                    .trim()
                    .toLowerCase();

                if(keyword.length < 2){
                    hasilPencarian.classList.add('hidden');
                    return;
                }

                const hasil = inventoriCache.filter(item =>
                    item.nama &&
                    item.nama.toLowerCase().includes(keyword)
                );

                hasilPencarian.innerHTML = '';

                hasil.slice(0,10).forEach(item => {

                    const div = document.createElement('div');

                    div.className =
                        'p-2 border-b hover:bg-blue-50 cursor-pointer text-sm';

                    div.innerHTML = `
                        <div class="font-bold">
                            ${item.nama}
                        </div>
                    
                        <div class="text-sm font-semibold text-gray-800">
                            Rp ${(item.harga_jual || 0).toLocaleString()}
                        </div>
                    
                        <div class="text-[11px] text-gray-500">
                            Modal:
                            Rp ${(item.harga_beli || 0).toLocaleString()}
                            •
                            Stok:
                            ${item.stok || 0}
                            ${item.satuan || ''}
                        </div>
                    `;

                    div.onclick = () => {

                        document.getElementById('input-item-nama').value =
                            item.nama;

                        document.getElementById('input-item-harga').value =
                            item.harga_jual || 0;

                        selectedInventori = {
                            key: item.key,
                            kategori: item.kategori
                        };

                        currentTab =
                            item.kategori === 'jasa'
                            ? 'jasa'
                            : 'sparepart';

                        setTab(currentTab);

                        hasilPencarian.innerHTML = '';
                        hasilPencarian.classList.add('hidden');

                    };

                    hasilPencarian.appendChild(div);

                });

                if(hasil.length){
                    hasilPencarian.classList.remove('hidden');
                } else {
                    hasilPencarian.classList.add('hidden');
                }

            });

            document.addEventListener('click', (e) => {

                if(!hasilPencarian.contains(e.target) &&
                e.target !== searchInput){

                    hasilPencarian.classList.add('hidden');

                }

            });
