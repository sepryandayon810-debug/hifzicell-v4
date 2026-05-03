═══════════════════════════════════════════════════════════════
WebPOS V3 — SYSTEM CONTRACT & AI RULES
File ini adalah "BIBLE" proyek. AI WAJIB baca ini sebelum ngasih arahan.
Versi: 2026-05-03 | Status: LOCKED — Tidak ada V4/V5.
═══════════════════════════════════════════════════════════════
🚫 ATURAN AI (Wajib Dipatuhi 100%)
TIDAK ADA VERSI BARU — Hanya patch V3. Kalau user bilang "buat ulang", tolak dan arahkan patch.
TIDAK UBAH STRUKTUR FIREBASE TREE — Tree di bawah ini final. Tambah node baru = HANYA kalau user minta secara eksplisit.
TIDAK KIRIM FILE HTML/JS UTUH — Hanya kirim patch surgical: file mana, baris mana, diganti jadi apa.
TIDAK GANTI ARAH KONSEPTUAL — Jangan ubah: role hierarchy, rumus kas, alur shift, cara permission. Patch implementasi saja.
JANGAN LUPA KONTEKS — Kalau user kirim snippet error, jangan asumsi ulang. Tanyakan file mana, fungsi mana, kalau kurang jelas.
JAVASCRIPT VANILLA ONLY — Tidak pakai React, Vue, Node.js, framework lain. ES6 class boleh, module pattern boleh.
CSS INLINE PER PAGE — Setiap page punya <style> sendiri. Jangan arahkan pisah ke file .css external kecuali user minta.
FIREBASE COMPAT v9 — Pakai firebase-app-compat.js, firebase-auth-compat.js, firebase-database-compat.js.
📁 STRUKTUR FILE FINAL (LOCKED)
plain
Copy
/webpos/
├── index.html                  ← Dashboard (read-only stats, shift toggle)
├── login.html                  ← Auth (email/username + password)
├── register.html               ← Register (pending approval)
│
├── page-kasir.html             ← POS / Penjualan (cart, checkout, struk)
├── page-produk.html            ← CRUD Produk (nama, harga, modal, stok, unlimited)
├── page-riwayat.html           ← Log transaksi harian (read-only list)
├── page-hutang.html            ← Hutang & Piutang (create, bayar, list)
├── page-pembelian.html         ← Restock / Pembelian (kurangi modal, tambah stok)
│
├── page-kas-masuk.html         ← Kas Masuk (input uang masuk ke laci)
├── page-kas-keluar.html        ← Kas Keluar (input uang keluar dari laci)
├── page-kas-topup.html         ← Top Up (catat + admin fee)
├── page-kas-tarik.html         ← Tarik Tunai (catat + admin fee)
├── page-modal-harian.html      ← Set Modal Awal (per hari, per user)
├── page-closing.html           ← Tutup Shift + Kalkulator fisik
│
├── page-laporan.html           ← Laporan Penjualan (aggregate transactions)
├── page-laporan-stok.html      ← Laporan Stok (status menipis)
├── page-laporan-terlaris.html  ← Barang Terlaris (ranking qty terjual)
│
├── page-saldo-telegram.html    ← Integrasi Telegram (n8n/webhook)
├── page-data-pelanggan.html    ← Data Pelanggan / Customer CRM
│
├── page-pengguna.html          ← Manajemen User (list, approve, reject, suspend)
├── page-developer.html         ← Role Access Manager (atur permission per role)
├── page-setting.html           ← Pengaturan Toko, Tema, Menu Toggle, Password
├── page-printer.html           ← Konfigurasi Header Struk & Printer
├── page-reset.html             ← Hapus Data (danger zone)
│
├── js/
│   ├── firebase-config.js      ← Config + init (JANGAN DIUBAH STRUKTURNYA)
│   ├── utils.js                ← Utils, Theme, Format, Helpers, Menu Visibility
│   ├── auth.js                 ← Auth, Permission 3-layer, Sidebar Filter
│   └── services.js             ← Transaction, Shift, Modal, Debt, Product, Report, User, Setting
│
├── manifest.json               ← PWA manifest
└── sw.js                       ← Service Worker (cache static)
🔥 FIREBASE RTDB TREE (LOCKED — FINAL)
plain
Copy
goodhifzicell-default-rtdb.asia-southeast1.firebasedatabase.app/
│
├── users/{uid}/
│   ├── uid              : string
│   ├── username         : string (lowercase, unique)
│   ├── email            : string (real atau @webpos.local)
│   ├── name             : string (display name)
│   ├── role             : string (developer | owner | admin | kasir)
│   ├── permissions/     : object {key: boolean} ← override individual
│   ├── status           : string (active | pending | rejected | suspended)
│   ├── approvedBy       : string (uid)
│   ├── approvedAt       : timestamp
│   ├── createdAt        : timestamp
│   ├── lastLogin        : timestamp
│   ├── lastLogout       : timestamp
│   ├── isOnline         : boolean
│   └── avatar           : string|null
│
├── transactions/{YYYY-MM-DD}/{pushId}/
│   ├── id               : string
│   ├── type             : string (penjualan | topup | tarik | kas_masuk | kas_keluar | pembelian)
│   ├── status           : string (active | cancelled | voided)
│   ├── total            : number (untuk penjualan)
│   ├── amount           : number (untuk kas/topup/tarik)
│   ├── profit           : number (laba penjualan)
│   ├── adminFee         : number (fee topup/tarik)
│   ├── items            : array/object (detail produk)
│   ├── paymentMethod    : string (cash | transfer | qris)
│   ├── customer         : object|null
│   ├── source           : string (kasir_page | hutang_page | dll)
│   ├── userId           : string
│   ├── userName         : string
│   └── timestamp        : timestamp
│
├── shifts/{YYYY-MM-DD}/{uid}/
│   ├── id               : string
│   ├── status           : string (open | closed | transferred)
│   ├── openTime         : timestamp
│   ├── openedAt         : timestamp (ServerValue)
│   ├── closedAt         : timestamp|null
│   ├── closedReason     : string (manual | transferred)
│   ├── userId           : string
│   ├── userName         : string
│   ├── modalAwal        : number
│   ├── transferredFrom/  : object|null
│   │   ├── uid, name, transferredAt, originalOpenTime
│   └── transferredTo/      : object|null
│       ├── uid, name, transferredAt
│
├── modal/{YYYY-MM-DD}/{uid}/
│   ├── amount           : number
│   ├── setAt            : timestamp
│   ├── setBy            : string (uid)
│   ├── transferredFrom  : string|null (uid)
│   └── note             : string
│
├── debts/{debtId}/
│   ├── id               : string
│   ├── type             : string (hutang | piutang)
│   ├── status           : string (active | closed)
│   ├── amount           : number (nominal awal)
│   ├── remaining        : number (sisa)
│   ├── customerName     : string
│   ├── phone            : string
│   ├── note             : string
│   ├── createdAt        : timestamp
│   ├── createdBy        : string (uid)
│   └── payments/        : array (riwayat pembayaran)
│       └── {timestamp, amount, note}
│
├── products/{productId}/
│   ├── name             : string
│   ├── price            : number (harga jual)
│   ├── cost             : number (harga modal)
│   ├── stock            : number
│   ├── unlimited        : boolean (true = stok tidak berkurang)
│   ├── category         : string
│   ├── barcode          : string
│   ├── createdAt        : timestamp
│   └── updatedAt        : timestamp
│
├── settings/
│   ├── store/
│   │   ├── name, address, phone, updatedAt
│   ├── receiptHeader/
│   │   ├── storeName, address, phone, note, updatedAt
│   ├── system/
│   │   ├── ownerFinanceMenu : boolean
│   │   └── theme            : string (indigo|mint|ocean|...)
│   └── developer/
│       └── roleAccess/
│           ├── owner/{key: boolean}
│           ├── admin/{key: boolean}
│           ├── kasir/{key: boolean}
│           └── developer/{key: boolean}
│
└── activity_logs/{YYYY-MM-DD}/{pushId}/
    ├── type             : string
    ├── userId           : string
    ├── userName         : string
    ├── message          : string
    └── timestamp        : timestamp
👑 ROLE HIERARCHY (LOCKED)
plain
Copy
Developer (4)  →  Owner (3)  →  Admin (2)  →  Kasir (1)
     │                │              │             │
     └────────────────┴──────────────┴─────────────┘
              Bisa manage role di bawahnya
Developer: Full access + atur settings/developer/roleAccess + write ke settings/system
Owner: Full access bisnis + manage users (approve/reject) + read settings/developer
Admin: Sesuai template roleAccess (bisa lebih dari kasir, kurang dari owner)
Kasir: Minimal — kasir, riwayat sendiri, hutang, tidak boleh edit produk/laporan
🔑 PERMISSION KEY (STANDARD — SAMA DI SEMUA PAGE)
Table
Key	Menu	File
dashboard	Dashboard	index.html
kasir	Kasir	page-kasir.html
produk	Produk	page-produk.html
riwayat	Riwayat Transaksi	page-riwayat.html
kas	Kas Management	page-kas*.html
pembelian	Pembelian / Restock	page-pembelian.html
hutang	Hutang & Piutang	page-hutang.html
laporan	Laporan Penjualan	page-laporan.html
laporan-stok	Laporan Stok	page-laporan-stok.html
laporan-terlaris	Barang Terlaris	page-laporan-terlaris.html
telegram	Saldo Telegram	page-saldo-telegram.html
pelanggan	Data Pelanggan	page-data-pelanggan.html
pengguna	Pengguna	page-pengguna.html
setting	Pengaturan	page-setting.html
backup	Backup & Sync	page-backup.html
log-aktivitas	Log Aktivitas	page-log-aktivitas.html
printer	Printer & Struk	page-printer.html
reset	Reset Data	page-reset.html
developer	Dev Tools / Role Manager	page-developer.html
🧠 PERMISSION SYSTEM — 3 LAYER (LOCKED)
plain
Copy
Layer 1: Developer → bypass all (return true)
Layer 2: Individual permissions (users/{uid}/permissions/{key}) → explicit true/false
Layer 3: Master roleAccess (settings/developer/roleAccess/{role}/{key}) → default per role
Logic di auth.js:
JavaScript
Copy
hasPermission(key) {
  const user = this.getCurrentUser();
  if (!user) return false;
  if (user.role === 'developer') return true;          // Layer 1
  const individual = user.permissions?.[key];
  if (individual === true) return true;                // Layer 2 explicit allow
  if (individual === false) return false;              // Layer 2 explicit deny
  return this.getRoleAccess(user.role, key);             // Layer 3 master
}
🧮 RUMUS KAS GLOBAL (LOCKED — TIDAK BERUBAH)
plain
Copy
Kas di Tangan =
  Modal Awal
  + Uang Masuk        (transactions type=kas_masuk, category≠penjualan_hutang)
  - Uang Keluar       (transactions type=kas_keluar)
  + Penjualan         (transactions type=penjualan, status≠cancelled)
  - Piutang Hari Ini  (debts type=piutang, status=active, createdAt hari ini)
  + Top Up            (transactions type=topup + adminFee)
  - Tarik Tunai       (transactions type=tarik - adminFee)
🔄 ALUR SHIFT (LOCKED)
Set Modal → modal/{today}/{uid} = {amount, setAt, setBy}
Buka Shift → shifts/{today}/{uid} = {status:'open', modalAwal, openTime}
Transaksi → transactions/{today}/{id} (bisa jalan meski shift tutup, tapi warning)
Tutup Shift → update shifts/{today}/{uid} → status:'closed', closedAt
Transfer Shift → tutup current + buat baru untuk target user + pindah modal
🎨 THEME SYSTEM (LOCKED)
Template: indigo | mint | ocean | sunset | midnight | berry | cyan | amber | rose
Storage: localStorage (webpos_theme_template, webpos_dark_mode)
Apply: Utils.Theme.loadTemplate() di utils.js
Dark mode: data-theme="dark" di <html>
CSS override via injected <style id="theme-template-overrides">
📝 CARA KOMUNIKASI PATCH (Wajib)
User mengirim:
Screenshot console error (F12), atau
Copy-paste 1 fungsi yang error, atau
Deskripsi: "Di page-X, saat klik Y, error Z"
AI mengirim:
File target: page-xxx.html atau js/xxx.js
Fungsi/area: "Cari fungsi processPayment()"
Baris kira-kira: "Setelah if (user) {"
Patch: blok kode yang diganti (ditandai // ⭐ TAMBAH atau // ⭐ GANTI)
Penjelasan 1 kalimat: kenapa diganti
AI TIDAK mengirim:
File HTML lengkap
File JS lengkap
Arah konseptual baru
"Coba pakai framework X"
✅ CHECKLIST MIGRASI KE V3 STABIL
[ ] js/services.js sudah ada dan di-load di semua page
[ ] js/auth.js sudah pakai hasPermission() 3-layer
[ ] Setiap page punya auth guard (redirect ke login.html kalau tidak auth)
[ ] Sidebar <a> punya data-menu="{key}" di semua page
[ ] page-developer.html bisa atur role access dan tersimpan ke Firebase
[ ] Database Rules sudah deploy (developer bisa write ke settings/)
[ ] Tema & dark mode konsisten antar page
[ ] Mobile nav ada di setiap page
[ ] index.html dashboard baca data via reportService.getCashPosition()
[ ] page-kasir.html checkout pakai transactionService.sale()
[ ] page-closing.html tutup shift pakai shiftService.close()
🆘 EMERGENCY — Kalau AI Lupa Aturan
Kalau AI di sesi baru mulai:
"Coba kita buat V4..." → STOP. Baca file ini.
"Sebaiknya pakai React..." → STOP. Vanilla JS only.
"Firebase tree-nya kita ubah..." → STOP. Tree di atas LOCKED.
"Kirim semua file page kamu..." → STOP. User tidak bisa kirim semua. Patch surgical saja.
📌 PESAN PENUTUP
"Proyek ini sudah cukup lama. Fokus ke stabilitas, bukan fitur baru.
Kalau ada bug, patch. Kalau ada fitur baru, modular (file terpisah).
Jangan sentuh fondasi yang sudah jalan."
— Developer WebPOS
File ini LOCKED. Edit hanya dengan persetujuan Developer.
