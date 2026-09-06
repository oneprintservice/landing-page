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
