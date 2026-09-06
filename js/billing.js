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

                    if(window.recordStockMovement){
                        recordStockMovement({
                            tipe: 'PEMAKAIAN_SERVICE',
                            sumber: 'SERVICE',
                            referensi: (typeof currentServisKey !== 'undefined' && currentServisKey) ? currentServisKey : 'DRAFT',
                            kategori: item.kategori,
                            itemKey: item.key,
                            nama: item.nama,
                            qty: pengurang,
                            delta: -pengurang,
                            stokSebelum: Number(item.stok)||0,
                            stokSesudah: stokBaru,
                            hargaSatuan: Number(item.harga_beli)||0,
                            catatan: 'Sparepart dimasukkan ke nota service'
                        });
                    }

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

                    if(window.recordStockMovement){
                        recordStockMovement({
                            tipe: 'BATAL_PEMAKAIAN',
                            sumber: 'SERVICE',
                            referensi: (typeof currentServisKey !== 'undefined' && currentServisKey) ? currentServisKey : 'DRAFT',
                            kategori: dataInv.kategori,
                            itemKey: dataInv.key,
                            nama: dataInv.nama,
                            qty: pengembali,
                            delta: pengembali,
                            stokSebelum: Number(dataInv.stok)||0,
                            stokSesudah: stokBaru,
                            hargaSatuan: Number(dataInv.harga_beli)||0,
                            catatan: 'Item sparepart dihapus dari nota service'
                        });
                    }

                    dataInv.stok = stokBaru;

                }

            }

            daftarTransaksi[cat].splice(idx,1);

            updateList();

            loadInventori();

        }

