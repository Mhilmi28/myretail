<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn);

$date = $_GET['date'] ?? '';
$cashierId = $_GET['cashier_id'] ?? '';

$sql = "SELECT t.transaction_code, t.total, t.payment_method, t.status, t.created_at,
            u.id AS cashier_id, u.name AS cashier_name
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        WHERE 1=1";

$params = [];

if(!empty($date)){
    $sql .= " AND DATE(t.created_at) = :date";
    $params['date'] = $date;
}

if(!empty($cashierId)){
    $sql .= " AND t.user_id = :cashier_id";
    $params['cashier_id'] = $cashierId;
}

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

$result = array_map(function($t){
    return[
        'transaction_id' => $t['transaction_code'],
        'cashier' => [
            'id' => $t['cashier_id'],
            'name' => $t['cashier_name']
        ],
        'total' => $t['total'],
        'payment_method' => $t['payment_method'],
        'status' => $t['status'],
        'created_at' => date('c', strtotime($t['created_at']))
    ];
}, $transactions);

sendSuccess($result);
