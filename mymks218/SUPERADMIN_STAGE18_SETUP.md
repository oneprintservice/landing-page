# Stage 18 — Superadmin Security & User Management

## Tujuan
Stage ini menambahkan:
- Edit role/nama/status profil Admin/Lapangan.
- Create account Admin/Lapangan melalui Supabase Auth + `ksp_profiles`.
- Disable/enable account.
- Delete account Auth secara permanen (hanya Admin/Lapangan).
- Audit log untuk create/update/disable/delete.
- Restore backup melalui satu RPC atomik, sehingga tidak ada reset lalu insert bertahap dari browser.
- Backup diberi SHA-256 dan restore memverifikasi checksum.

## 1. Jalankan SQL
Setelah Stage 15 sukses, jalankan:
`SUPERADMIN_STAGE18.sql`

Pastikan hasilnya Success. SQL ini tidak menghapus data dan tidak menyentuh `auth.users`.

## 2. Deploy Edge Function
Folder:
`supabase/functions/manage-user/index.ts`

Deploy dengan Supabase CLI dari folder project:
`supabase functions deploy manage-user`

Jangan menaruh `SUPABASE_SERVICE_ROLE_KEY` di frontend. Edge Function memakai secret bawaan Supabase server-side.

Jika project CLI belum terhubung, lakukan link project terlebih dahulu sesuai environment Supabase kamu.

## 3. Tes berurutan
1. Login Superadmin.
2. Ringkas tetap menampilkan data.
3. User → pastikan profil terlihat.
4. Buat satu akun Lapangan dummy.
5. Pastikan profil baru muncul.
6. Nonaktifkan akun tersebut.
7. Aktifkan kembali.
8. Ubah nama/role.
9. Hapus akun dummy.
10. Audit → semua aksi tersebut harus tercatat.
11. Backup → file harus memiliki `sha256`.
12. Jangan restore ke production sebelum backup terverifikasi.

## Catatan arsitektur penting
Login Admin/Lapangan pada aplikasi lama masih menggunakan session `localStorage`, bukan Supabase Auth. Edge Function Stage 18 mengelola akun Auth dengan aman, tetapi agar account management benar-benar menjadi sumber autentikasi Admin/Lapangan, tahap berikutnya sebaiknya memigrasikan login Admin/Lapangan ke Supabase Auth. Jangan menganggap localStorage sebagai mekanisme keamanan database.
