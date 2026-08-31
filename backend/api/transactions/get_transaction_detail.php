<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn);

$code = $_GET['code'] ?? '';

if(empty($code)){
    sendError("Code harus diisi", 422);
}

$stmt = $conn->prepare("SELECT t.id, t.transaction_code, t.total, t.payment_method, t.status, t.created_at,
                            u.id AS cashier_id, u.name AS cashier_name
                        FROM transactions t
                        JOIN users u ON u.id = t.user_id
                        WHERE t.transaction_code = :code");
$stmt->execute(['code' => $code]);
$transaction = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$transaction){
    sendError("Transaksi tidak ditemukan", 404);
}

$stmt = $conn->prepare("SELECT ti.product_id, ti.qty, ti.price, ti.discount_amount, ti.subtotal, p.name AS product_name
                        FROM transaction_items ti
                        JOIN products p ON p.id = ti.product_id
                        WHERE ti.transaction_id = :transaction_id");
$stmt->execute(['transaction_id' => $transaction['id']]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

$formattedItems = array_map(function ($i) {
    return [
        'product_id' => $i['product_id'],
        'name' => $i['product_name'],
        'qty' => (int) $i['qty'],
        'price' => (int) $i['price'],
        'discount_amount' => (int) $i['discount_amount'],
        'subtotal' => (int) $i['subtotal']
    ];
}, $items);

sendSuccess([
    'transaction_id' => $transaction['transaction_code'],
    'status' => $transaction['status'],
    'cashier' => [
        'id' => $transaction['cashier_id'],
        'name' => $transaction['cashier_name']
    ],
    'items' => $formattedItems,
    'total' => $transaction['total'],
    'payment_method' => $transaction['payment_method'],
    'created_at' => date('c',strtotime($transaction['created_at']))
]);
