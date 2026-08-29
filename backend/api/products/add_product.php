<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$input = getJsonInput();
$name = trim($input['name'] ?? '');
$sku = trim($input['sku'] ?? '');
$price = $input['price'] ?? '';
$stock = $input['stock'] ?? '';
$category_id = $input['category_id'] ?? '';
$image_url = trim($input['image_url'] ?? '');

//validasi input
if(trim($name) === '' || trim($sku) === '' || $price === '' || $stock === '' || $category_id === ''){
    sendError('Semua field harus diisi', 422);
}

// validasi harga
if(!is_numeric($price) || $price < 0){
    sendError('Harga harus berupa angka dan tidak boleh negatif', 422);
}

// validasi stok
if(filter_var($stock, FILTER_VALIDATE_INT) === false || $stock < 0){
    sendError('Stok harus berupa bilangan bulat dan tidak boleh negatif', 422);
}

// validasi ID kategori
if(filter_var($category_id, FILTER_VALIDATE_INT) === false){
    sendError('ID kategori tidak valid', 422);
}

// validasi URL gambar
if(!empty($image_url) && !filter_var($image_url, FILTER_VALIDATE_URL)){
    sendError('URL gambar tidak valid', 422);
}

//konversi harga dan stok ke integer
$price = (int)$price;
$stock = (int)$stock;
$category_id = (int)$category_id;

//cek sku
$stmt = $conn->prepare("SELECT id FROM products WHERE sku = :sku");
$stmt->execute(['sku' => $sku]);
if($stmt->fetch()){
    sendError('SKU sudah digunakan', 409);
}

//cek kategori
$stmt = $conn->prepare("SELECT id, name FROM categories WHERE id = :category_id");
$stmt->execute(['category_id' => $category_id]);
$category = $stmt->fetch(PDO::FETCH_ASSOC);
if(!$category){
    sendError('Kategori tidak ditemukan', 404);
}

//Insert produk baru
try{
    $stmt = $conn->prepare("INSERT INTO products (name, sku, price, stock, category_id, image_url) VALUES (:name, :sku, :price, :stock, :category_id, :image_url)");
    $stmt->execute([
        'name' => $name,
        'sku' => $sku,
        'price' => $price,
        'stock' => $stock,
        'category_id' => $category_id,
        'image_url' => $image_url !== '' ? $image_url : null
    ]);
}catch(PDOException $e){
    sendError('Gagal menambahkan produk, silahkan coba lagi', 500);
}  

$result = [
    'id' => $conn->lastInsertId(),
    'name' => $name,
    'sku' => $sku,
    'price' => $price,
    'stock' => $stock,
    'category' => [
        'id' => $category['id'],
        'name' => $category['name']
    ],
    'image_url' => $image_url !== '' ? $image_url : null
];

sendSuccess($result, 'Produk berhasil ditambahkan', 201);
