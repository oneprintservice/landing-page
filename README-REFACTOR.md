# OnePrint Refactor v4

## Prinsip
- Workflow service existing dipertahankan.
- Pemakaian sparepart dari inventori pada nota tetap mengurangi stok seperti sebelumnya.
- Penghapusan item dari nota mengembalikan stok.
- Penghapusan service mengembalikan stok sparepart yang tercatat.
- Pembelanjaan menambah stok secara otomatis.
- Pergerakan stok sekarang memiliki audit trail di `stock_movements`.

## Modul baru
- `js/inventory-ledger.js` — helper bersama untuk pencatatan mutasi stok.
- `js/inventory-page.js` — halaman inventori baru yang lebih ringan dan fokus pada inventory management.
- `css/inventory-page.css` — UI inventory responsive.

## Struktur inventory
`inventori/<kategori>/<item>` tetap dipertahankan agar kompatibel dengan data lama.

Mutasi baru dicatat pada:
`stock_movements/<push-key>`

Jenis utama:
- `PEMBELIAN`
- `PEMAKAIAN_SERVICE`
- `BATAL_PEMAKAIAN`
- `BATAL_SERVICE`
- `PENYESUAIAN_MASUK`
- `PENYESUAIAN_KELUAR`

## Catatan kompatibilitas
Halaman `inventori.html` tidak lagi memuat `inventori-page.js` lama yang merupakan salinan besar logic dashboard/service. Halaman inventori sekarang memakai controller khusus sehingga tidak membawa dependency service yang tidak diperlukan.

Baseline original tetap tidak diubah dan v3 menjadi checkpoint sebelumnya.


## V6 — Trial-ready Service App UI
- Service workspace redesigned as an app-like command center.
- Added quick actions: Service Baru, Aktif, Menunggu Sparepart, Selesai, Rekap.
- Existing service workflow and DOM IDs are preserved.
- Added responsive mobile command bar and desktop workspace presentation.
- Fixed public landing-page Brand Support asset path.
- No Firebase data schema migration is required for this UI checkpoint.

### Trial checklist
1. Upload ZIP contents to HTTPS hosting / GitHub Pages.
2. Open `login.html` and verify authentication.
3. Test create service, add jasa, add sparepart, save/update, print, edit, delete.
4. Verify sparepart stock decreases exactly as before.
5. Test purchase and verify stock increases.
6. Test inventory and stock movement history.
7. Test mobile viewport before Android packaging.
