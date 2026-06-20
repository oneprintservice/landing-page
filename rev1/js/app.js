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
