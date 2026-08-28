<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'PUT'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$id = $_GET['id'] ?? '';

if(empty($id)){
    sendError('ID produk tidak boleh kosong', 422);
}

$query = "SELECT * FROM products WHERE id = :id";
$stmt = $conn->prepare($query);
$stmt->execute(['id' => $id]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$product){
    sendError('Produk tidak ditemukan', 404);
}

$input = getJsonInput();
$name = trim($input['name'] ?? $product['name']);
$sku = trim($input['sku'] ?? $product['sku']);
$price = $input['price'] ?? $product['price'];
$stock = $input['stock'] ?? $product['stock'];
$category_id = $input['category_id'] ?? $product['category_id'];
$image_url = $input['image_url'] ?? $product['image_url'];
$image_url = $image_url !== null ? trim($image_url) : null;

$stmt = $conn->prepare("UPDATE products SET name = :name, sku = :sku, price = :price, stock = :stock, category_id = :category_id, image_url = :image_url WHERE id = :id");
$stmt->execute([
    'name' => $name,
    'sku' => $sku,
    'price' => $price,
    'stock' => $stock,
    'category_id' => $category_id,
    'image_url' => $image_url,
    'id' => $id
]);

sendSuccess(null, 'Produk berhasil diperbarui');

