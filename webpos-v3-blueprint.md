WebPOS V3 — FINAL ARCHITECTURE BLUEPRINT
Versi: 2026-05-03 | LOCKED — Tidak Berubah Lagi
---
1. STRUKTUR FOLDER (WAJIB)
```
/webpos/
├── index.html                 ← Dashboard (read-only stats)
├── login.html                 ← Auth page
├── register.html              ← Register page
├── page-kasir.html            ← POS / Transaksi penjualan
├── page-produk.html           ← CRUD Produk
├── page-riwayat.html          ← Log transaksi harian
├── page-hutang.html           ← Hutang & Piutang
├── page-laporan.html          ← Laporan penjualan
├── page-laporan-stok.html     ← Laporan stok
├── page-laporan-terlaris.html ← Barang terlaris
├── page-kas-masuk.html       ← Kas masuk
├── page-kas-keluar.html      ← Kas keluar
├── page-kas-topup.html       ← Top up
├── page-kas-tarik.html       ← Tarik tunai
├── page-modal-harian.html    ← Set modal awal
├── page-closing.html         ← Tutup shift + kalkulator
├── page-pembelian.html       ← Restock / pembelian
├── page-saldo-telegram.html  ← Integrasi Telegram
├── page-data-pelanggan.html  ← Data customer
├── page-pengguna.html        ← Manage users (Owner/Developer)
├── page-developer.html       ← Role Access Manager (Developer only)
├── page-setting.html         ← Pengaturan toko & tema
├── page-printer.html         ← Konfigurasi struk
├── page-reset.html           ← Hapus data
│
├── js/
│   ├── firebase-config.js    ← Config + init (TIDAK BOLEH DIUBAH STRUKTURNYA)
│   ├── utils.js              ← Utils, Theme, Format, Helpers
│   ├── auth.js               ← Auth + Permission + Sidebar Filter
│   ├── services.js           ← Transaction, Shift, Debt, Setting Services
│   └── sidebar-filter.js     ← (Optional, bisa digabung auth.js)
│
├── css/
│   └── (optional, kalau mau pisah CSS nanti)
│
└── manifest.json / sw.js     ← PWA assets
```
---
2. FIREBASE TREE (FINAL — LOCKED)
```
goodhifzicell-default-rtdb.asia-southeast1.firebasedatabase.app/
│
├── users/{uid}/
│   ├── uid, username, email, name, role, permissions{},
│   ├── status (active|pending|rejected|suspended),
│   ├── approvedBy, approvedAt, createdAt, lastLogin, isOnline
│
├── transactions/{YYYY-MM-DD}/{pushId}/
│   ├── type: penjualan|topup|tarik|kas_masuk|kas_keluar|pembelian
│   ├── status: active|cancelled|voided
│   ├── total/amount, profit, adminFee, items[], userId, timestamp
│
├── shifts/{YYYY-MM-DD}/{uid}/
│   ├── status: open|closed|transferred
│   ├── openTime, closedAt, modalAwal, userId, userName
│   ├── transferredFrom{}, transferredTo{}
│
├── modal/{YYYY-MM-DD}/{uid}/
│   ├── amount, setAt, setBy, note, transferredFrom
│
├── debts/{debtId}/
│   ├── type: hutang|piutang, status: active|closed
│   ├── remaining, customerName, phone, amount, createdAt, createdBy
│
├── products/{productId}/
│   ├── name, price, cost, stock, unlimited (boolean), category, barcode
│
├── settings/
│   ├── store/{name, address, phone, updatedAt}
│   ├── receiptHeader/{storeName, address, phone, note, updatedAt}
│   ├── system/{ownerFinanceMenu: boolean}
│   └── developer/
│       └── roleAccess/
│           ├── owner/{key: boolean}
│           ├── admin/{key: boolean}
│           ├── kasir/{key: boolean}
│           └── developer/{key: boolean}
│
└── activity_logs/{YYYY-MM-DD}/{pushId}/
    ├── type, userId, message, timestamp
```
---
3. ROLE HIERARCHY (TIDAK BOLEH DIUBAH)
```
Developer (4)  →  Owner (3)  →  Admin (2)  →  Kasir (1)
     │                │              │             │
     └────────────────┴──────────────┴─────────────┘
                    Bisa manage role di bawahnya
```
Developer: Full access + bisa atur permission semua role via `settings/developer/roleAccess`
Owner: Full access bisnis, tapi TIDAK bisa ubah role config (kecuali Developer izinkan)
Admin: Akses sesuai template Owner/Developer
Kasir: Minimal access (kasir, riwayat sendiri, hutang)
---
4. PERMISSION KEY (STANDARD — SAMA SEMUA PAGE)
Key	Menu	Page File
dashboard	Dashboard	index.html
kasir	Kasir	page-kasir.html
produk	Produk	page-produk.html
riwayat	Riwayat	page-riwayat.html
kas	Kas Mgmt	page-kas*.html
pembelian	Pembelian	page-pembelian.html
hutang	Hutang	page-hutang.html
laporan	Laporan	page-laporan.html
laporan-stok	Stok	page-laporan-stok.html
laporan-terlaris	Terlaris	page-laporan-terlaris.html
telegram	Telegram	page-saldo-telegram.html
pelanggan	Pelanggan	page-data-pelanggan.html
pengguna	Pengguna	page-pengguna.html
setting	Setting	page-setting.html
backup	Backup	page-backup.html
log-aktivitas	Log	page-log-aktivitas.html
printer	Printer	page-printer.html
reset	Reset	page-reset.html
developer	Dev Tools	page-developer.html
---
5. ATURAN EMBED (WAJIB DI SETIAP PAGE HTML)
Setiap page WAJIB punya di `<head>` atau sebelum `</body>`:
```html
<script src="js/firebase-config.js?v=2"></script>
<script src="js/utils.js?v=3"></script>
<script src="js/auth.js"></script>
<script src="js/services.js"></script>
```
Dan WAJIB ada auth guard:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged((user) => {
    if (!user && !Utils.getStorage('webpos_session')) {
      window.location.href = 'login.html';
      return;
    }
    if (user) {
      Auth.loadUserData(user.uid).then(() => {
        // Init page-specific logic here
        initPage();
      });
    }
  });
});
```
---
6. CSS THEME SYSTEM (FINAL)
Base CSS inline di setiap HTML (copy dari index.html)
Template override via `Utils.Theme.loadTemplate()` di `utils.js`
Data template disimpan di `localStorage` + `settings/system/theme`
Dark mode: `data-theme="dark"` di `<html>`
---
7. KONSEP SHIFT & MODAL (FINAL)
Set Modal → `modal/{today}/{uid}`
Buka Shift → `shifts/{today}/{uid}` status = open
Transaksi → `transactions/{today}/{id}` (bisa jalan meski shift tutup, tapi ada warning)
Tutup Shift → update `shifts/{today}/{uid}` status = closed + hitung fisik
Transfer Shift → tutup current + buat baru untuk target user + pindahkan modal
---
8. KALKULASI KAS GLOBAL (RUMUS FINAL)
```
Kas di Tangan =
  Modal Awal
  + Uang Masuk (kas_masuk)
  - Uang Keluar (kas_keluar)
  + Penjualan (penjualan)
  - Piutang Hari Ini (debts type=piutang, createdAt hari ini)
  + Top Up (topup + adminFee)
  - Tarik Tunai (tarik - adminFee)
```
---
9. PERATURAN AI / DEVELOPER (AGAR TIDAK BERUBAH LAGI)
Tidak ada versi baru (V4, V5, dsb) — hanya patch V3
Struktur Firebase tree di atas LOCKED — tidak tambah node baru tanpa diskusi
Setiap page punya 1 job saja — tidak gabung fungsi (contoh: kasir hanya jual, tidak manage produk)
Services.js adalah tulang punggung — semua write ke Firebase lewat sini, tidak langsung dari HTML
Sidebar menu pakai data-menu attribute — tidak pakai class parsing lagi
Permission system 3-layer: Developer bypass → Individual permissions → Master roleAccess
---
10. CHECKLIST MIGRASI DARI V1/V2 KE V3
[ ] Firebase tree sesuai section 2
[ ] File `services.js` sudah ada dan di-load semua page
[ ] Setiap page punya auth guard (section 5)
[ ] Sidebar punya `data-menu` attribute di setiap `<a>`
[ ] `auth.js` sudah pakai `hasPermission()` 3-layer
[ ] `page-developer.html` bisa atur role access
[ ] Database Rules write ke `settings/` hanya untuk developer
[ ] Tema & dark mode konsisten antar page
[ ] Mobile nav ada di setiap page
[ ] Tidak ada inline script yang write ke Firebase langsung (kecuali lewat services)
---
Blueprint ini LOCKED. Kalau ada bug, patch file-nya, jangan ubah struktur.
