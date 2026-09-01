<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$searchName = $_GET['customer_name'] ?? '';
$status = $_GET['status'] ?? '';

$sql = "SELECT d.id, d.customer_name, t.transaction_code, d.amount, d.status, d.created_at
        FROM debts d
        LEFT JOIN transactions t ON t.id = d.transaction_id
        WHERE 1=1";

$params = [];

if (!empty($searchName)) {
    $sql .= " AND d.customer_name LIKE :search_name";
    $params['search_name'] = '%' . $searchName . '%';
}

if(!empty($status)){
    $sql .= " AND d.status = :status";
    $params['status'] = $status;
}

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$debts = $stmt->fetchAll(PDO::FETCH_ASSOC);

$result = array_map(function($d){
    return[
        'id' => $d['id'],
        'customer_name' => $d['customer_name'],
        'transaction_id' => $d['transaction_code'],
        'amount' => $d['amount'],
        'status' => $d['status'],
        'created_at' => date('c', strtotime($d['created_at']))
    ];
}, $debts);

sendSuccess($result);

