<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'DELETE'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$id = $_GET['id'] ?? '';

if(empty($id)) {
    sendError('ID tidak boleh kosong', 422);
}

$sql = "SELECT id FROM expenses WHERE id = :id";
$stmt = $conn->prepare($sql);
$stmt->execute(['id' => $id]);
$expens = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$expens){
    sendError("data pengeluaran tidak ditemukan", 404);
}

$stmt = $conn->prepare("DELETE FROM expenses WHERE id = :id");
$stmt->execute(['id' => $id]);
sendSuccess(null, 'Biaya berhasil dihapus');