# Step 14 — Superadmin Auth Test

Baseline: Step 13 payment redistribution.

## Tujuan tahap ini
- Mempertahankan login Admin/Lapangan lama agar workflow yang sudah PASS tidak rusak.
- Menambahkan jalur Superadmin terpisah yang menggunakan Supabase Auth.
- Memverifikasi `public.ksp_profiles` + RPC `ksp_current_role()`.
- Superadmin area belum melakukan delete/reset/backup/restore.

## Cara tes
1. Upload isi folder `mymks` ke hosting sesuai struktur yang sekarang.
2. Buka `/mymks/superadmin/login.html` secara langsung.
3. Login menggunakan akun Superadmin yang dibuat di Supabase.
4. Jika benar, diarahkan ke `/mymks/superadmin/dashboard.html` dan terlihat Role: superadmin.
5. Jangan mengubah/delete data operasional pada tahap ini.

Login biasa Admin/Lapangan tetap melalui `/mymks/login.html` dan belum diubah.
