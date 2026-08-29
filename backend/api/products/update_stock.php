<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$id = $_GET['id'] ?? '';

if(empty($id)) {
    sendError('ID produk tidak boleh kosong', 422);
}

$query = "SELECT * FROM products WHERE id = :id";
$stmt = $conn->prepare($query);
$stmt->execute(['id' => $id]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$product) {
    sendError('Produk tidak ditemukan', 404);
}

$input = getJsonInput();
$stock = $input['stock'] ?? '';

if(filter_var($stock, FILTER_VALIDATE_INT) === false || $stock < 0){
    sendError('Stok harus berupa bilangan bulat dan tidak boleh negatif', 422);
}

$stmt = $conn->prepare("UPDATE products SET stock = :stock WHERE id = :id");
$stmt->execute(['stock' => $stock, 'id' => $id]);

sendSuccess(['id' => $id, 'stock' => $stock], 'Stok produk berhasil diperbarui');