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
