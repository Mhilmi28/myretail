<?php

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$input = getJsonInput();

$id = $_GET['id'] ?? '';
$status = $input['status'] ?? null;

if (empty($id)) {
    sendError('ID piutang tidak boleh kosong', 422);
}

$validStatus = ['paid', 'unpaid'];

if (!in_array($status, $validStatus)) {
    sendError("Status harus 'paid' atau 'unpaid'", 422);
}

$query = "SELECT * FROM debts WHERE id = :id";

$stmt = $conn->prepare($query);
$stmt->execute(['id' => $id]);
$debt = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$debt) {
    sendError('Data piutang tidak ditemukan', 404);
}

$stmt = $conn->prepare("UPDATE debts SET status = :status WHERE id = :id");
$stmt->execute([
    'status' => $status,
    'id' => $id
]);

sendSuccess([
    'id' => $id,
    'status' => $status
], 'Status piutang berhasil diperbarui');