<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$stmt = $conn->prepare("SELECT id, name, email, role, is_active FROM users");
$stmt->execute();
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

$result = array_map(function($u){
    return [
        'id' => (int) $u['id'],
        'name' => $u['name'],
        'email' => $u['email'],
        'role' => $u['role'],
        'is_active' => (int) $u['is_active']
    ];
}, $users);

sendSuccess($result, 'Data user berhasil diambil');
