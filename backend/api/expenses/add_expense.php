<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$input = getJsonInput();
$name = trim($input['name'] ?? '');
$amount = $input['amount'] ?? '';
$date = $input['date'] ?? '';

if(empty($name)){
    sendError("kolom nama wajib diisi", 422);
}

if(!is_numeric($amount) || $amount <= 0){
    sendError("angka harus berupa bilangan bulat dan lebih dari 0", 422);
}

if(!strtotime($date)){
    sendError("Format tanggal tidak sesuai", 422);
}

$stmt = $conn->prepare("INSERT INTO expenses (name, amount, date) VALUES (:name, :amount, :date)");
$stmt->execute([
    'name' => $name,
    'amount' => $amount,
    'date' => $date
]);

sendSuccess([
    'id' => $conn->lastInsertId(),
    'name' => $name,
    'amount' => $amount,
    'date' => $date
], 'Biaya berhasil dicatat', 201);