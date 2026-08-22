<?php

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    sendError('Metode request tidak diizinkan', 405);
}

$token = getBearerToken();

if(!$token){
    sendError('Token tidak ditemukan', 401);
}

$stmt = $conn->prepare("DELETE FROM tokens WHERE token = :token");
$stmt->execute(['token' => $token]);

sendSuccess(null, 'Logout berhasil');