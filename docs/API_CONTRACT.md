# API Contract — myretail

**Base URL (development):** `http://localhost/myretail/backend/api`
**Format:** JSON
**Auth:** Bearer Token — dikirim di header `Authorization: Bearer <token>`
**Role:** `owner` dan `cashier`

> Versi ini menggantikan API_CONTRACT.md sebelumnya. Sesuai `FUNCTIONAL_REQUIREMENTS.md`.

---

## 1. Response Format Standar

### Sukses
```json
{
  "success": true,
  "data": { },
  "message": "Berhasil"
}
```

### Gagal
```json
{
  "success": false,
  "message": "Pesan error yang jelas",
  "errors": {
    "field_name": ["Field ini wajib diisi"]
  }
}
```

### Status Code yang dipakai
| Code | Arti |
|------|------|
| 200  | OK / Sukses |
| 201  | Data berhasil dibuat |
| 400  | Request tidak valid |
| 401  | Belum login / token invalid |
| 403  | Tidak punya akses (role tidak sesuai) |
| 404  | Data tidak ditemukan |
| 422  | Validasi gagal |
| 500  | Server error |

### Konvensi Penulisan
- Semua field nama pakai `snake_case`
- Semua tanggal pakai format ISO 8601 (`2026-08-20T10:15:00Z`)
- Harga & nominal uang dalam bentuk angka bulat (Rupiah tanpa desimal), bukan string
- Endpoint yang butuh login wajib kirim header `Authorization: Bearer <token>`
- Endpoint bertanda **(owner only)** akan balas `403 Forbidden` kalau diakses role `cashier`

---

## 2. Auth

### POST `/auth/login`
Akses: publik
Request:
```json
{
  "email": "kasir@toko.com",
  "password": "12345678"
}
```
Response 200:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "name": "Budi",
      "email": "kasir@toko.com",
      "role": "cashier"
    }
  },
  "message": "Login berhasil"
}
```
Response 401:
```json
{ "success": false, "message": "Email atau password salah" }
```

### POST `/auth/logout`
Akses: user login (owner & cashier)
Response 200:
```json
{ "success": true, "message": "Logout berhasil" }
```

### GET `/auth/me`
Akses: user login. Buat cek token masih valid & ambil data role saat ini.
Response 200:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Budi",
    "email": "kasir@toko.com",
    "role": "cashier"
  }
}
```
---

## 3. Kategori Produk

### GET `/categories`
Akses: user login
Response 200:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Makanan" },
    { "id": 2, "name": "Minuman" }
  ]
}
```

### POST `/categories` *(owner only)*
Request:
```json
{ "name": "Snack" }
```

---

## 4. Produk

### GET `/products`
Akses: user login (owner & cashier — cashier read-only)
Query params (opsional): `?search=indomie&category_id=1&page=1&limit=20`

Response 200:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Indomie Goreng",
      "sku": "IDM-001",
      "price": 3500,
      "stock": 50,
      "category": { "id": 1, "name": "Makanan" },
      "image_url": "https://example.com/img/indomie.jpg"
    }
  ],
  "meta": {
    "current_page": 1,
    "total_page": 3,
    "total_data": 45
  }
}
```

### GET `/products/:id`
Akses: user login
Response 200: (single object seperti di atas)

### POST `/products` *(owner only)*
Request:
```json
{
  "name": "Aqua 600ml",
  "sku": "AQ-600",
  "price": 4000,
  "stock": 100,
  "category_id": 2,
  "image_url": "https://example.com/img/aqua.jpg"
}
```
Response 201: data produk yang baru dibuat

### PUT `/products/:id` *(owner only)*
Request: sama seperti POST, field yang mau diupdate aja

### DELETE `/products/:id` *(owner only)*
Response 200:
```json
{ "success": true, "message": "Produk berhasil dihapus" }
```

### PATCH `/products/:id/stock` *(owner only)*
Update stok manual (misal saat restock), bukan lewat transaksi.
Request:
```json
{ "stock": 150 }
```
Response 200:
```json
{ "success": true, "message": "Stok berhasil diperbarui", "data": { "id": 2, "stock": 150 } }
```

---

## 5. Transaksi (POS)

### POST `/transactions`
Akses: cashier & owner
Diskon bisa per item (`discount_amount` di tiap item) dan/atau per total transaksi (`discount_total`). Boleh salah satu, boleh dua-duanya, boleh kosong (0).

Request:
```json
{
  "items": [
    { "product_id": 1, "qty": 2, "discount_amount": 500 },
    { "product_id": 3, "qty": 1, "discount_amount": 0 }
  ],
  "discount_total": 1000,
  "payment_method": "cash",
  "cash_received": 20000
}
```
`payment_method` harus salah satu dari: `"cash"`, `"qris"`, `"transfer"`, `"debit"`.
`cash_received` wajib diisi kalau `payment_method` adalah `"cash"`; untuk metode lain boleh dikosongkan/diabaikan.

Response 201 (pembayaran berhasil):
```json
{
  "success": true,
  "data": {
    "transaction_id": "TRX-20260820-001",
    "status": "success",
    "cashier": { "id": 2, "name": "Budi" },
    "items": [
      {
        "product_id": 1,
        "name": "Indomie Goreng",
        "qty": 2,
        "price": 3500,
        "discount_amount": 500,
        "subtotal": 6500
      }
    ],
    "subtotal": 10500,
    "discount_total": 1000,
    "total": 9500,
    "payment_method": "cash",
    "cash_received": 20000,
    "change": 10500,
    "created_at": "2026-08-20T10:15:00Z"
  },
  "message": "Transaksi berhasil"
}
```
Response 400 (stok gak cukup — dicek sebelum proses payment):
```json
{ "success": false, "message": "Stok produk 'Indomie Goreng' tidak mencukupi" }
```
Response 402 (pembayaran gagal, non-cash — kasir bisa retry di frontend dengan kirim ulang request yang sama):
```json
{ "success": false, "message": "Pembayaran QRIS gagal, silakan coba lagi" }
```

### GET `/transactions`
Akses: cashier & owner (kasir bisa lihat semua transaksi toko, bukan cuma miliknya)
Query params: `?date=2026-08-20&start_date=2026-08-01&end_date=2026-08-31&cashier_id=1&page=1`
Response 200: list transaksi ringkas (tanpa detail items per produk)
```json
{
  "success": true,
  "data": [
    {
      "transaction_id": "TRX-20260820-001",
      "cashier": { "id": 2, "name": "Budi" },
      "total": 9500,
      "payment_method": "cash",
      "status": "success",
      "created_at": "2026-08-20T10:15:00Z"
    }
  ],
  "meta": { "current_page": 1, "total_page": 5, "total_data": 98 }
}
```

### GET `/transactions/:id`
Akses: cashier & owner
Response 200: detail lengkap 1 transaksi (format sama seperti response `POST /transactions`) — dipakai juga untuk menampilkan ulang **receipt**.

---

## 6. User Management *(owner only)*

### GET `/users`
Response 200:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Budi", "email": "budi@toko.com", "role": "cashier" }
  ]
}
```

> Untuk membuat user baru, pakai `POST /auth/register` (lihat bagian Auth) — bukan endpoint terpisah di sini, supaya logic pembuatan akun tetap satu tempat.

---

## 7. Piutang (Customer Debt) *(owner only)*

### GET `/debts`
Query params (opsional): `?status=unpaid`
Response 200:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_name": "Pak Joko",
      "transaction_id": "TRX-20260820-002",
      "amount": 25000,
      "status": "unpaid",
      "created_at": "2026-08-20T11:00:00Z"
    }
  ]
}
```

### POST `/debts`
Dicatat manual oleh owner/kasir saat pelanggan belum bayar lunas (terhubung ke transaksi terkait).
Request:
```json
{
  "customer_name": "Pak Joko",
  "transaction_id": "TRX-20260820-002",
  "amount": 25000
}
```
Response 201: data piutang yang baru dibuat, `status` default `"unpaid"`

### PATCH `/debts/:id`
Menandai piutang lunas.
Request:
```json
{ "status": "paid" }
```
Response 200:
```json
{ "success": true, "message": "Piutang ditandai lunas" }
```

---

## 8. Laporan & Dashboard *(owner only)*

### GET `/reports/sales`
Query params: `?period=monthly&year=2026&month=8` atau `?period=yearly&year=2026`
Response 200:
```json
{
  "success": true,
  "data": {
    "period": "2026-08",
    "total_transactions": 340,
    "total_revenue": 15750000,
    "top_products": [
      { "product_id": 1, "name": "Indomie Goreng", "qty_sold": 210 }
    ]
  }
}
```

### GET `/reports/profit`
Query params: `?period=monthly&year=2026&month=8` atau `?period=yearly&year=2026`
Response 200:
```json
{
  "success": true,
  "data": {
    "period": "2026-08",
    "gross_profit": 4200000,
    "total_expenses": 550000,
    "net_profit": 3650000,
    "total_discount_given": 550000
  }
}
```
> **Catatan (v1 — sementara):** `cost_price` (harga modal) belum dicatat di sistem, jadi untuk saat ini `gross_profit` dihitung dari **total penjualan (revenue) dikurangi diskon** — bukan dikurangi harga modal, karena harga modal belum ada datanya. `net_profit` = gross_profit − total biaya operasional (dari `GET /expenses`). Field `cost_price` akan ditambahkan di fase berikutnya (dicatat terpisah dari data produk, kemungkinan lewat halaman/endpoint khusus), dan setelah itu formula `gross_profit` akan diperbarui jadi revenue − harga modal.

### GET `/expenses` *(owner only)*
Biaya operasional toko (listrik, sewa, gaji, dll) — dipakai untuk hitung `net_profit` di laporan.
Query params: `?month=8&year=2026`
Response 200:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Listrik", "amount": 300000, "date": "2026-08-05" },
    { "id": 2, "name": "Sewa toko", "amount": 250000, "date": "2026-08-01" }
  ]
}
```

### POST `/expenses` *(owner only)*
Request:
```json
{
  "name": "Listrik",
  "amount": 300000,
  "date": "2026-08-05"
}
```
Response 201: data biaya yang baru dibuat

### DELETE `/expenses/:id` *(owner only)*
Response 200:
```json
{ "success": true, "message": "Biaya berhasil dihapus" }
```

### GET `/dashboard/summary`
Ringkasan cepat buat halaman Dashboard Owner.
Response 200:
```json
{
  "success": true,
  "data": {
    "today_revenue": 850000,
    "today_transactions": 24,
    "low_stock_products": [
      { "id": 5, "name": "Teh Botol", "stock": 3 }
    ]
  }
}
```

---

## 9. Catatan Penting Buat Kolaborasi

- Semua field nama pakai `snake_case` (contoh: `category_id`, bukan `categoryId`)
- Semua tanggal pakai format ISO 8601 (`2026-08-20T10:15:00Z`)
- Harga dalam bentuk angka bulat (Rupiah tanpa desimal), bukan string
- Endpoint dengan tanda **(owner only)** wajib dicek role-nya di backend, bukan cuma disembunyikan tombolnya di frontend
- Field yang wajib vs opsional harus didiskusikan tiap nambah endpoint baru
- Kalau ada perubahan struktur, update file ini dulu sebelum ubah kode
- Frontend bisa pakai data dummy sesuai format `data` di atas sebelum backend selesai (mock API pakai json-server atau file JS statis)

## 10. Hal yang Masih Perlu Didiskusikan
- `cost_price` (harga modal produk) ditunda — dicatat terpisah di fase berikutnya, belum masuk form tambah/edit produk saat ini. Setelah ada, formula `gross_profit` di `/reports/profit` perlu diperbarui.
- Biaya operasional sekarang dicatat manual lewat `POST /expenses` — perlu didiskusikan kategori biaya apa saja yang standar (listrik, sewa, gaji, dll) biar konsisten saat input.

---

*Dokumen ini adalah living document — update terus seiring project berjalan. Lihat juga `FUNCTIONAL_REQUIREMENTS.md` dan `PROJECT_NOTES.md`.*
