<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn);

$productId = $_GET['id'] ?? '';

if(empty($productId)){
    sendError('ID produk harus diisi', 422);
}

$stmt = $conn->prepare("SELECT p.id, p.name, p.sku, p.price, p.stock, p.image_url,
        c.id AS category_id, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = :id");
$stmt->execute(['id' => $productId]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$product){
    sendError('Produk tidak ditemukan', 404);
}

$result = [
    'id' => $product['id'],
    'name' => $product['name'],
    'sku' => $product['sku'],
    'price' => (int)$product['price'],
    'stock' => (int)$product['stock'],
    'image_url' => $product['image_url'],
    'category' => [
        'id' => $product['category_id'],
        'name' => $product['category_name']
    ]
];

sendSuccess($result);