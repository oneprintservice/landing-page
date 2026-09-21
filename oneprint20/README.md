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
