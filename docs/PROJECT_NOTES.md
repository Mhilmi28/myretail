# PROJECT NOTES — myretail

> File ini rangkuman project. Paste/upload file ini di awal chat baru dengan Claude
> biar konteksnya langsung nyambung tanpa perlu jelasin ulang dari nol.

---

## 1. Ringkasan Project

**Nama Project:** myretail
**Jenis Bisnis:** Toko retail
**Target Pengguna:** Owner & Kasir
**Solusi:** Sistem POS (Point of Sale) berbasis aplikasi web untuk mengelola toko retail

## 2. Masalah yang Ingin Diselesaikan
- Sistem transaksi masih manual
- Laporan keuangan masih manual
- Sistem stok masih manual
- Pencatatan hutang masih manual
- Tidak ada evaluasi toko dari data penjualan
- Tidak ada laporan keuntungan bersih & kotor (bulanan & tahunan)
- Tidak ada struk transaksi
- Belum ada fitur diskon

## 3. Fitur yang Dibutuhkan (berdasarkan masalah di atas)
- [x] Login dengan role berbeda (Owner vs Kasir)
- [ ] Transaksi penjualan (kasir input, hitung otomatis, kembalian)
- [ ] Cetak / tampilkan struk transaksi
- [ ] Fitur diskon (per item atau per transaksi)
- [ ] Manajemen stok produk (tambah, edit, kurangi otomatis saat transaksi)
- [ ] Pencatatan hutang (piutang pelanggan / hutang ke supplier — perlu diperjelas lagi yang dimaksud)
- [ ] Laporan keuangan: keuntungan kotor & bersih (bulanan, tahunan)
- [ ] Dashboard evaluasi toko (misal: produk terlaris, tren penjualan)
- [ ] Riwayat transaksi

> Catatan: fitur di atas lebih lengkap dari API_CONTRACT.md versi awal (yang baru cover auth, produk, transaksi dasar). Perlu update contract untuk endpoint: discount, debt/hutang, reports.

## 4. Tech Stack
- **Backend:** PHP native (tanpa framework) + MySQL
- **Frontend:** HTML, CSS, JavaScript native (tanpa framework)
- **Tools:** XAMPP/Laragon, Postman, VS Code + Live Server, Git & GitHub

## 5. Pembagian Kerja
- **Backend (PHP + MySQL):** [isi nama kamu]
- **UI/UX (HTML/CSS/JS):** [isi nama temanmu]

## 6. Struktur Folder
```
myretail/
├── backend/
│   ├── config/          # koneksi database
│   ├── api/              # endpoint per fitur (auth, products, transactions, dll)
│   ├── helpers/          # response formatter, CORS
│   └── database/         # file .sql
├── frontend/
│   ├── *.html             # tiap halaman
│   ├── css/
│   ├── js/
│   └── assets/
├── API_CONTRACT.md
├── PROJECT_NOTES.md      # file ini
├── README.md
└── .gitignore
```

## 7. Alur Kerja Git
- Branch per fitur, jangan langsung ngoding di `main`
- Format nama branch: `backend/nama-fitur` atau `frontend/nama-fitur`
- Kerjaan selesai → push → buka Pull Request → review → merge ke `main`
- Selalu `git pull origin main` sebelum mulai kerja baru

## 8. Progress Sejauh Ini
- [x] Diskusi cara kolaborasi
- [x] API Contract versi awal dibuat (auth, produk, transaksi dasar)
- [x] Struktur folder disepakati (PHP native + HTML/CSS/JS native)
- [x] Starter project dibuat (backend dasar: login, get/add produk, create transaksi; frontend: halaman login)
- [x] Brief lengkap project (jenis bisnis, masalah, solusi) sudah didefinisikan
- [x] Update API Contract untuk fitur: diskon, hutang, laporan keuangan, struk
- [ ] Desain database lengkap (tabel discount, debt, dll)
- [ ] Desain UI/UX (Figma) untuk semua halaman
- [ ] Implementasi fitur laporan & dashboard evaluasi

## 9. Keputusan Fitur (sudah dijawab)
- **Hutang/Piutang:** Piutang dari pelanggan (pelanggan belum bayar lunas) — bukan hutang ke supplier
- **Struk:** Cukup ditampilkan di layar (belum perlu print ke thermal printer atau PDF)
- **Diskon:** Dua-duanya — diskon per item produk DAN diskon per total transaksi

## 10. Flow Aplikasi (dari diagram tim)

### Flow A — Dashboard Owner
```
Login
  ↓
Dashboard
  ↓
  ├── Produk    → CRUD (create, read, update, delete produk)
  ├── Inventory → Stock (kelola stok)
  └── Laporan   → Sales → Profit (laporan penjualan & keuntungan)
```

### Flow B — Transaksi POS (Kasir)
```
Login
  ↓
POS
  ↓
Cari Produk
  ↓
Tambah ke Cart
  ↓
Atur Quantity
  ↓
Discount? (opsional, per item/per transaksi)
  ↓
Checkout
  ↓
Pilih Payment: Cash / QRIS / Transfer / Debit
  ↓
Payment Success
  ↓
Stock berkurang (otomatis)
  ↓
Transaction tersimpan
  ↓
Receipt (struk ditampilkan di layar)
```

### Flow C — Detail Checkout & Payment (error handling)
```
Checkout
  ↓
Stock cukup?
  ├── NO  → Error (transaksi dibatalkan/ditolak)
  └── YES → Payment
              ↓
            Berhasil?
              ├── NO  → Retry (coba bayar lagi)
              └── YES → Success
```

**Implikasi teknis dari flow ini:**
- Perlu endpoint search produk (`GET /products?search=`) — sudah ada di contract awal
- Perlu konsep "cart" — kemungkinan dikelola di frontend (state sementara) sebelum dikirim sebagai satu payload ke `POST /transactions`
- `payment_method` perlu didukung 4 jenis: `cash`, `qris`, `transfer`, `debit` (contract awal baru contoh `cash`)
- Perlu validasi stok SEBELUM proses payment (bukan cuma saat submit transaksi) — bisa jadi endpoint terpisah semacam `POST /transactions/validate-stock` sebelum checkout, atau divalidasi di endpoint checkout sekaligus dengan response error yang jelas
- Perlu status transaksi: pending/retry saat payment gagal, baru `success` kalau payment berhasil — artinya tabel `transactions` butuh kolom `status`
- Struk (Receipt) cukup ditampilkan di layar setelah transaksi sukses, ambil dari response `POST /transactions`

## 11. Keputusan Fitur (lanjutan, sudah dijawab)
- **Laporan:** Cukup dilihat di dashboard web (belum perlu export Excel/PDF)
- **Piutang:** Cukup status lunas/belum lunas — tidak perlu histori cicilan bertahap
- **Role akses:**
  - **Kasir:** hanya boleh akses POS (transaksi) & lihat data produk
  - **Owner:** akses semua — Dashboard, Produk (CRUD), Inventory, Laporan, Piutang

## 12. Keputusan Tambahan (Auth & Akses)
- **Register:** TIDAK terbuka untuk publik. Hanya Owner (yang sudah login) yang bisa membuat akun baru, termasuk akun Kasir.
- **Riwayat transaksi:** Kasir bisa lihat SEMUA transaksi toko, bukan cuma miliknya sendiri
- **Akun Owner pertama:** karena tidak ada jalur publik untuk register, akun Owner pertama harus dibuat manual langsung di database (lewat file `.sql`, sudah ada contohnya di starter project — password perlu di-hash pakai `password_hash()` PHP)
- Endpoint `POST /auth/register` nantinya perlu proteksi: hanya bisa diakses kalau request-nya bawa token milik Owner yang valid

## 13. Keputusan Laporan Keuntungan
- **Harga modal (cost price):** ditunda, tidak dicatat di form produk saat ini — akan ditambahkan terpisah di fase berikutnya
- **Biaya operasional:** perlu dicatat (listrik, sewa, gaji, dll) supaya net profit akurat — sudah ditambahkan endpoint `GET/POST/DELETE /expenses` di API_CONTRACT.md
- **Konsekuensi:** untuk versi awal, gross profit dihitung dari revenue − diskon (bukan revenue − harga modal, karena data harga modal belum ada)

## 14. Semua Pertanyaan Sudah Terjawab ✅
Brief & requirement sudah lengkap. Detail requirement per fitur (Authentication, Product Management, POS, Payment, Transaction, Inventory, Piutang, Laporan, Dashboard) ada di file terpisah: **`FUNCTIONAL_REQUIREMENTS.md`**.

Siap lanjut ke: update API Contract lengkap + desain database schema berdasarkan requirement tersebut.

---

*Update file ini tiap ada keputusan baru, biar selalu jadi sumber kebenaran project.*
