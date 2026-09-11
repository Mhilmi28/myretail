<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'PATCH'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$id = $_GET['id'] ?? '';

if(empty($id)){
    sendError('ID user tidak boleh kosong', 422);
}

$input = getJsonInput();
$newPassword = $input['new_password'] ?? '';

if(strlen($newPassword) < 8){
    sendError('Password baru minimal 8 karakter', 422);
}

$stmt = $conn->prepare("SELECT id FROM users WHERE id = :id");
$stmt->execute(['id' => $id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$user){
    sendError('data user tidak ditemukan', 404);
}

$passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);   

$stmt = $conn->prepare("UPDATE users SET password = :password WHERE id = :id");
$stmt->execute([
    'password' => $passwordHash,
    'id' => $id
]);

sendSuccess(null, 'Password berhasil direset');