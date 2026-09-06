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

