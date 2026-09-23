# Stage 15 — Superadmin Tools

1. Keep Stage 14 database setup already applied.
2. In Supabase SQL Editor, review and run `SUPERADMIN_STAGE15.sql`.
3. Upload this package to hosting.
4. Open `/mymks/superadmin/login.html` and login as the Superadmin.
5. Verify Ringkas shows counts.
6. Verify Tools → Reset requires typing `RESET DEMO 2`.
7. Verify Backup creates a JSON file.
8. Do NOT test Restore against production data until a backup has been downloaded and verified.

Important: account creation/deletion for Auth users still requires a server-side Edge Function using the service-role key. Never put that key in frontend JavaScript. The current UI intentionally lists profiles but does not expose a fake client-side user-creation mechanism.
