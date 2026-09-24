# Superadmin Stage 19

## Perubahan
- Detail Nasabah Admin: Riwayat Pengajuan, Riwayat Pinjaman, dan Jadwal Angsuran kembali menjadi tabel dan masing-masing memiliki area scroll sendiri pada mobile. Tidak lagi berubah menjadi kartu panjang.
- Area riwayat: tinggi dibatasi, scroll vertikal tersedia; tabel tetap dapat di-scroll horizontal jika kolom lebih lebar.
- Superadmin: tabel User/Audit memiliki scroll internal sehingga tidak memperlebar halaman.
- User Management: pemanggilan Edge Function menggunakan `supabaseClient.functions.invoke()` agar session/URL ditangani SDK.
- Ditambahkan tombol `Cek Layanan Akun` untuk menguji apakah Edge Function `manage-user` sudah dapat dihubungi.
- Ditambahkan action `ping` pada Edge Function.
- Perbaikan bug: menyimpan profil User tidak lagi otomatis mengaktifkan kembali akun yang sedang nonaktif.

## Penting: Create User
Create User membutuhkan Edge Function `manage-user` yang sudah benar-benar dideploy ke project Supabase. File function berada di:
`supabase/functions/manage-user/index.ts`

Jika tombol `Cek Layanan Akun` mengatakan layanan belum dapat dihubungi, deploy function tersebut terlebih dahulu. Jangan memasukkan service-role key ke file frontend.

## Tes setelah deploy
1. Login sebagai Superadmin.
2. Buka User.
3. Klik `Cek Layanan Akun` → harus `Layanan akun aktif`.
4. Buat akun dummy Lapangan.
5. Pastikan akun muncul di Daftar Akun.
6. Nonaktifkan → cek status berubah Nonaktif.
7. Edit nama/role → pastikan akun tetap Nonaktif jika sebelumnya Nonaktif.
8. Aktifkan kembali.
9. Hapus akun dummy.
10. Buka Audit dan pastikan CREATE/UPDATE/DISABLE/DELETE tercatat.
11. Buka Admin → Detail Nasabah. Pastikan ketiga riwayat dapat di-scroll secara terpisah dan tidak membuat halaman utama memanjang.
