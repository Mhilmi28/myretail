<?php

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$input = getJsonInput();
$name = $input['name'] ?? '';

if(empty($name)){
    sendError('Nama kategori harus diisi', 422);
}

$stmt = $conn->prepare("INSERT INTO categories (name) VALUES (:name)");
$stmt->execute(['name' => $name]);

sendSuccess([
    'id' => $conn->lastInsertId(),
    'name' => $name
], 'Kategori berhasil ditambahkan', 201);

