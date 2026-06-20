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
