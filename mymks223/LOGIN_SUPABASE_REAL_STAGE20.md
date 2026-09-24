# Stage 20 — Login Admin/Lapangan via Supabase Auth

Perubahan:
- Login operasional sekarang menggunakan Supabase Auth `signInWithPassword`.
- Tidak ada lagi pilihan role di halaman login; role diambil dari `ksp_profiles.role`.
- Login ditolak jika profil tidak ada, `is_active=false`, atau role bukan `admin`/`lapangan`.
- Session aplikasi tetap memakai batas pukul 05.00, tetapi juga ditautkan ke Supabase Auth.
- Logout membersihkan local session dan Supabase Auth session.
- Halaman Admin/Lapangan yang memuat `common.js` melakukan verifikasi Auth + `ksp_profiles.is_active` secara berkala.
- Akun yang dinonaktifkan akan dikeluarkan dari aplikasi saat pemeriksaan berikutnya.

Catatan:
- `ksp_profiles_self_read` harus tetap mengizinkan user membaca profilnya sendiri.
- `SUPABASE_KEY` yang digunakan browser adalah publishable key, bukan service role key.
