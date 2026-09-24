# KSP Manager — Stage 22 Setup

## Tujuan
Stage 22 membuat Superadmin dapat masuk ke mode operasional seperti Admin, dengan dua kontrol khusus:

1. Edit Credit Score nasabah.
2. Menghapus transaksi yang salah input.

## 1. Jalankan SQL
Di Supabase → SQL Editor, jalankan seluruh isi:

`SUPERADMIN_STAGE22.sql`

SQL ini:
- membuat RPC `ksp_set_credit_score()`;
- mencatat perubahan score ke `ksp_audit_log`;
- memblokir perubahan `credit_score` oleh role selain Superadmin di level database;
- memblokir DELETE data operasional oleh role selain Superadmin di level database.

## 2. Tes mode operasional
Login sebagai Superadmin → Ringkas → **Buka Mode Operasional**.

Superadmin sekarang dapat menggunakan halaman Admin untuk:
- Nasabah
- Pengajuan
- Pinjaman & Angsuran
- Ledger

## 3. Tes Credit Score
Buka detail nasabah sebagai Superadmin.
Di bagian Credit Score akan muncul editor khusus Superadmin 0–10.
Simpan perubahan dan cek Audit Log.

Admin/Lapangan tidak mendapatkan editor tersebut.

## 4. Tes hapus transaksi Ledger
Masuk Mode Operasional → Ledger.
Hanya Superadmin yang melihat tombol **Hapus** pada transaksi.
Penghapusan meminta alasan dan menulis audit `DELETE_LEDGER`.

## 5. Tes hapus pembayaran angsuran
Masuk Mode Operasional → Pinjaman.
Pada angsuran yang sudah dibayar, Superadmin mendapat tombol **Hapus Bayar**.
Ini membatalkan transaksi pembayaran tetapi **tidak menghapus jadwal angsuran**. Sistem kemudian menghitung ulang saldo pinjaman.
Audit menggunakan `DELETE_PAYMENT`.

## Catatan
- Admin/Lapangan tidak mendapat hak DELETE melalui UI.
- Database trigger tetap memblokir DELETE jika dicoba langsung melalui API.
- Jangan menghapus jadwal angsuran untuk membatalkan pembayaran; gunakan **Hapus Bayar**.
