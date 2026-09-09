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
$startDate = $_GET['start_date'] ?? ''; 
$endDate = $_GET['end_date'] ?? '';
$page = (int) ($_GET['page'] ?? 1);
$limit = (int) ($_GET['limit'] ?? 10);
$offset = ($page - 1) * $limit;

$whereClause = " WHERE 1=1";
$params = [];

if(!empty($date)){
    $whereClause .= " AND DATE(t.created_at) = :date";
    $params['date'] = $date;
}

if (!empty($startDate)) {
    $whereClause .= " AND DATE(t.created_at) >= :start_date";
    $params['start_date'] = $startDate;
}

if (!empty($endDate)) {
    $whereClause .= " AND DATE(t.created_at) <= :end_date";
    $params['end_date'] = $endDate;
}

if(!empty($cashierId)){
    $whereClause .= " AND t.user_id = :cashier_id";
    $params['cashier_id'] = $cashierId;
}

// Query hitung total data (pakai WHERE yang sama, tanpa JOIN karena tidak perlu nama kasir)
$countSql = "SELECT COUNT(*) AS total FROM transactions t" . $whereClause;
$countStmt = $conn->prepare($countSql);
$countStmt->execute($params);
$totalData = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

// Query utama
$sql = "SELECT t.transaction_code, t.total, t.payment_method, t.status, t.created_at,
            u.id AS cashier_id, u.name AS cashier_name
        FROM transactions t
        JOIN users u ON u.id = t.user_id"
        . $whereClause
        . " ORDER BY t.created_at DESC
        LIMIT :limit OFFSET :offset";

$stmt = $conn->prepare($sql);
foreach ($params as $key => $value) {
    $stmt->bindValue(':' . $key, $value);
}
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalPage = ceil($totalData / $limit);

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

sendSuccess($result, 'berhasil', 200, [
    'current_page' => $page,
    'total_page' => $totalPage,
    'total_data' => $totalData
]);