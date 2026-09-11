<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'PATCH'){
    sendError('Metode request tidak diizinkan', 405);
}

$currentUser = requireAuth($conn, 'owner');

$id = $_GET['id'] ?? '';

if(empty($id)){
    sendError('ID user tidak boleh kosong', 422);
}

// Owner tidak boleh nonaktifkan akun sendiri.
if((int) $id === (int) $currentUser['id']){
    sendError('Anda tidak dapat menonaktifkan akun Anda sendiri', 403);
}

$stmt = $conn->prepare("SELECT id, is_active FROM users WHERE id = :id");
$stmt->execute(['id' => $id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$user){
    sendError('Data user tidak ditemukan', 404);
}

// Toggle: kalau sekarang aktif (1) jadi nonaktif (0), dan sebaliknya.
$newStatus = (int) $user['is_active'] === 1 ? 0 : 1;

$stmt = $conn->prepare("UPDATE users SET is_active = :is_active WHERE id = :id");
$stmt->execute(['is_active' => $newStatus, 'id' => $id]);

sendSuccess([
    'id' => (int) $id,
    'is_active' => $newStatus
], $newStatus === 1 ? 'Akun berhasil diaktifkan' : 'Akun berhasil dinonaktifkan');