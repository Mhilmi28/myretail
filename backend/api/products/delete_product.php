<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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

$stmt = $conn->prepare("DELETE FROM products WHERE id = :id");
$stmt->execute(['id' => $id]);
sendSuccess(null, 'Produk berhasil dihapus');