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

