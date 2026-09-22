# OnePrint POS V2

Refactor of the uploaded OnePrint POS codebase.

## What changed
- Admin POS rebuilt into a responsive application shell.
- Firebase access isolated in `js/core/firebase.js`.
- Authentication isolated in `js/core/auth.js`.
- Inventory, customer, service, and receipt logic separated into feature modules.
- Service data and inventory remain compatible with the existing Firebase Realtime Database paths:
  - `pelanggan/*`
  - `inventori/{sparepart,tinta,lisensi,jasa}/*`
  - `servis/*`
- UI is mobile-first and can be packaged later with Capacitor or another mobile wrapper.
- Public website/templates are retained for compatibility.

## Important
Firebase Realtime Database Security Rules were not included in the ZIP, so they must be audited separately before production deployment.

\n## Legacy service compatibility update\n- Reads the original `servis` root first.\n- Detects legacy service records recursively if an extra grouping level exists.\n- Falls back to `services` / `service` only when `servis` has no recognizable records.\n- Preserves the Firebase path for edit/delete.\n- Logs the number of service records discovered to the browser console.\n

## OnePrint POS v4 — revisi operasional
- Scanner barcode/QR terintegrasi di dashboard, form servis, dan daftar servis.
- Pembacaan inventori dibuat kompatibel dengan data bertingkat dan seluruh kategori.
- Logout selalu kembali ke `login.html`.
- Nota dan tanda terima mengikuti struktur cetak asli: kop, data pelanggan, tabel invoice, tracking + QR, catatan, tanda tangan.
- Sidebar diganti menjadi bottom navigation bergaya aplikasi untuk memperluas area kerja di mobile.
- Restock: menambah stok sekaligus membuat catatan pengeluaran.
- Akuntansi sederhana: pemasukan servis saat status `DIAMBIL`, pengeluaran restock, transaksi manual, dan laporan bulanan.
- Filter servis operasional: bulan berjalan + satu bulan sebelumnya. Record lebih lama tetap tampil jika status belum `DIAMBIL`/`CANCEL`.
- Setiap perubahan penting menampilkan toast notifikasi.

## Surface bug fix
- Service table rendering self-creates a missing tbody instead of aborting.
- Added Cetak Ulang Tanda Terima and Cetak Ulang Invoice.
- Reprint only reads the existing Firebase record and prints it. It does not save, change inventory, or create accounting entries.

## Final surface fix
- Service list now self-creates its table/tbody when an old cached app.html lacks it.
- Printing restored to the original OnePrint print layout from the original `js/print.js` + print CSS.
- Reprint remains read-only: it fetches the existing service and prints without saving, stock mutation, or ledger creation.
