# Functional Requirements — myretail

Versi lengkap requirement, disusun berdasarkan brief awal + flow aplikasi yang sudah didiskusikan.

---

## 1. Authentication
- User dapat login
- User dapat logout
- Sistem memiliki role **Owner** dan **Cashier**
- Cashier hanya dapat mengakses: POS (transaksi) & melihat daftar produk
- Owner dapat mengakses seluruh fitur (Produk, Inventory, Laporan, Piutang, Dashboard)

## 2. Product Management
- Owner dapat menambahkan produk
- Owner dapat mengubah produk
- Owner dapat menghapus produk
- Owner dapat melihat daftar produk
- Owner dapat mengelompokkan produk berdasarkan kategori
- Kasir dapat melihat daftar produk (read-only, tanpa bisa ubah/hapus)

## 3. POS (Point of Sale)
- Kasir dapat mencari produk
- Kasir dapat menambahkan produk ke cart
- Kasir dapat mengatur quantity produk di cart
- Kasir dapat menerapkan diskon per item produk
- Kasir dapat menerapkan diskon per total transaksi
- Kasir dapat melakukan checkout
- Sistem memvalidasi ketersediaan stok sebelum proses pembayaran
  - Jika stok tidak cukup → transaksi ditolak, tampilkan error
  - Jika stok cukup → lanjut ke proses payment

## 4. Payment
- Sistem mendukung metode pembayaran:
  - Cash
  - QRIS
  - Transfer
  - Debit
- Untuk pembayaran Cash: sistem menghitung kembalian otomatis
- Sistem menampilkan status pembayaran: berhasil / gagal
- Jika pembayaran gagal, kasir dapat melakukan retry

## 5. Transaction
- Sistem menyimpan transaksi setelah pembayaran berhasil
- Sistem menyediakan riwayat transaksi (bisa difilter berdasarkan tanggal)
- Sistem membuat receipt (struk) yang ditampilkan di layar setelah transaksi selesai
- Setiap transaksi tercatat: kasir yang melayani, item, jumlah, diskon, total, metode bayar, waktu

## 6. Inventory
- Sistem menyimpan jumlah stok tiap produk
- Stok otomatis berkurang setelah transaksi berhasil
- Owner dapat melihat & memperbarui jumlah stok secara manual (misal saat restock)
- Sistem dapat menampilkan produk dengan stok menipis (low stock alert) — *opsional, fitur tambahan*

## 7. Piutang (Customer Debt)
- Sistem dapat mencatat piutang pelanggan (transaksi belum lunas)
- Sistem menyimpan status piutang: **lunas** / **belum lunas**
- Owner dapat menandai piutang sebagai lunas setelah pelanggan membayar
- *(Tidak perlu histori cicilan bertahap — cukup status akhir)*

## 8. Laporan & Evaluasi Toko
- Sistem menghasilkan laporan penjualan (Sales Report)
- Sistem menghasilkan laporan keuntungan kotor & bersih (Profit Report)
- Owner dapat mencatat biaya operasional toko (listrik, sewa, gaji, dll) untuk menghitung keuntungan bersih (net profit) secara akurat
- Laporan tersedia dalam periode: bulanan & tahunan
- Laporan cukup ditampilkan di dashboard web (tidak perlu export Excel/PDF di versi awal)
- Dashboard menampilkan evaluasi toko, misalnya:
  - Total penjualan per periode
  - Produk terlaris
  - Tren penjualan

> **Catatan:** harga modal produk (cost price) belum dicatat di versi awal — jadi keuntungan kotor (gross profit) untuk saat ini dihitung dari total penjualan dikurangi diskon, bukan dikurangi harga modal. Ini akan disempurnakan di fase berikutnya.

## 9. Dashboard (Owner)
- Ringkasan cepat: total penjualan hari ini, jumlah transaksi, stok menipis, dll
- Akses cepat ke: Produk, Inventory, Laporan

---

## Ringkasan Modul → Role Akses

| Modul | Owner | Cashier |
|---|---|---|
| Auth (login/logout) | Ya | Ya |
| Register | Ya (hanya Owner yang bisa buat akun baru, termasuk akun Kasir) | Tidak (tidak bisa self-register) |
| Product Management (CRUD) | Ya | Read-only |
| POS / Transaksi | Opsional (monitoring) | Ya |
| Payment | - | Ya |
| Riwayat Transaksi | Ya (semua) | Ya (semua transaksi toko) |
| Inventory | Ya | Read-only |
| Piutang | Ya | Tidak |
| Laporan & Dashboard | Ya | Tidak |

> **Catatan implementasi:** karena register tidak publik, endpoint `POST /auth/register` hanya bisa diakses oleh user yang sudah login sebagai Owner (perlu token & pengecekan role di backend). Perlu ada 1 akun Owner awal yang di-set manual langsung di database (lewat file `.sql` seperti yang sudah ada di starter project) sebagai starting point, karena tidak ada jalur publik untuk membuat Owner pertama.

---

*Dokumen ini melengkapi `PROJECT_NOTES.md` dan `API_CONTRACT.md`. Kalau update salah satu, cek juga apakah dua lainnya perlu ikut diubah.*
