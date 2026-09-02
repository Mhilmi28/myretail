<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$input = getJsonInput();
$customerName = trim($input['customer_name'] ?? '') ;
$transactionId = $input['transaction_id'] ?? '';
$amount = $input['amount'] ?? '';

if(empty($customerName)){
    sendError("Nama customer harus diisi", 422);
}

if(!is_numeric($amount ) || $amount <= 0){
    sendError("Harga harus berupa bilangan bulat dan lebih dari 0", 422);
}

$dbTransactionId = null;

if($transactionId){
    $stmt = $conn->prepare("SELECT id FROM transactions WHERE transaction_code = :code");
    $stmt->execute(['code' => $transactionId]);
    $trx = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$trx) {
        sendError('Transaksi terkait tidak ditemukan', 404);
    }
    
    $dbTransactionId = $trx['id'];
}

$stmt = $conn->prepare("INSERT INTO debts (customer_name, transaction_id, amount, status)
                        VALUES (:customer_name, :transaction_id, :amount, 'unpaid')");
$stmt->execute([
    'customer_name' => $customerName,
    'transaction_id' => $dbTransactionId,
    'amount' => $amount
]);

$debtId = $conn->lastInsertId();

sendSuccess([
    'id' => $debtId,
    'customer_name' => $customerName,
    'transaction_id' => $transactionId ?: null,
    'amount' => $amount,
    'status' => 'unpaid'
], 'Piutang berhasil dicatat', 201);
