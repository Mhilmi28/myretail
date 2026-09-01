-- Jalankan file ini di phpMyAdmin (import) atau lewat MySQL CLI
-- Sesuai dengan API_CONTRACT.md & FUNCTIONAL_REQUIREMENTS.md terbaru

CREATE DATABASE IF NOT EXISTS myretail_db;
USE myretail_db;

-- ================================
-- USERS (Owner & Cashier)
-- ================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'cashier') NOT NULL DEFAULT 'cashier',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- TOKENS (auth sederhana, bukan JWT)
-- ================================
CREATE TABLE tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- CATEGORIES
-- ================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- ================================
-- PRODUCTS
-- ================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50),
    price INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category_id INT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
-- Catatan: kolom cost_price (harga modal) sengaja belum ditambahkan.
-- Rencananya ditambahkan di fase berikutnya (lihat PROJECT_NOTES.md bagian 13).

-- ================================
-- TRANSACTIONS
-- ================================
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(30) NOT NULL UNIQUE,
    user_id INT NOT NULL,                 -- kasir yang melayani
    subtotal INT NOT NULL,
    discount_total INT NOT NULL DEFAULT 0,
    total INT NOT NULL,
    payment_method ENUM('cash', 'qris', 'transfer', 'debit', 'debt') NOT NULL,
    cash_received INT DEFAULT NULL,
    change_amount INT DEFAULT NULL,
    status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ================================
-- TRANSACTION ITEMS
-- ================================
CREATE TABLE transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    product_id INT NOT NULL,
    qty INT NOT NULL,
    price INT NOT NULL,               -- harga satuan saat transaksi (bukan harga produk saat ini)
    discount_amount INT NOT NULL DEFAULT 0,
    subtotal INT NOT NULL,             -- (price * qty) - discount_amount
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ================================
-- DEBTS (Piutang Pelanggan)
-- ================================
CREATE TABLE debts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    transaction_id INT DEFAULT NULL,
    amount INT NOT NULL,
    status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- ================================
-- EXPENSES (Biaya Operasional)
-- ================================
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount INT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- DATA AWAL (SEED)
-- ================================

-- Kategori contoh
INSERT INTO categories (name) VALUES ('Makanan'), ('Minuman'), ('Snack');

-- Akun Owner pertama (WAJIB dibuat manual karena register tidak publik)
-- Password di bawah ini adalah hash dari "owner123"
-- Generate ulang pakai: php -r "echo password_hash('owner123', PASSWORD_DEFAULT);"
INSERT INTO users (name, email, password, role)
VALUES ('Owner Toko', 'owner@myretail.com', '$2b$10$PKixhBdpggPmelxExtonDOyqXvafvGTYmXpXKoRgh/MGLuf.KbwzC', 'owner');
-- Login awal: owner@myretail.com / owner123
-- SEGERA GANTI PASSWORD INI setelah login pertama kali.

-- Produk contoh
INSERT INTO products (name, sku, price, stock, category_id) VALUES
('Indomie Goreng', 'IDM-001', 3500, 50, 1),
('Aqua 600ml', 'AQ-600', 4000, 100, 2),
('Chitato 68g', 'CHT-068', 10000, 30, 3);