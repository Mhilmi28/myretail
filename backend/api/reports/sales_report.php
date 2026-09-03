<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$period = $_GET['period'] ?? '';
$year = $_GET['year'] ?? '';
$month = $_GET['month'] ?? '';

if ($period === 'monthly') {
    $where = "WHERE MONTH(created_at) = :month AND YEAR(created_at) = :year";
    $params = ['month' => $month, 'year' => $year];
    $periodLabel = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT);
} else {
    $where = "WHERE YEAR(created_at) = :year";
    $params = ['year' => $year];
    $periodLabel = (string) $year;
}

$stmt = $conn->prepare(
    "SELECT COUNT(*) as total_transactions, COALESCE(SUM(total), 0) as total_revenue
     FROM transactions $where AND status = 'success'");
$stmt->execute($params);
$summary = $stmt->fetch(PDO::FETCH_ASSOC);

$topProductsWhere = str_replace('created_at', 't.created_at', $where);

$stmt = $conn->prepare(
    "SELECT p.id as product_id, p.name, SUM(ti.qty) as qty_sold
     FROM transaction_items ti
     JOIN products p ON p.id = ti.product_id
     JOIN transactions t ON t.id = ti.transaction_id
     $topProductsWhere AND t.status = 'success'
     GROUP BY p.id, p.name
     ORDER BY qty_sold DESC
     LIMIT 5"
);
$stmt->execute($params);
$topProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

$result = array_map(function($tp){
    return[
        'product_id' => (int) $tp['product_id'],
        'name' => $tp['name'],
        'qty_sold' => (int) $tp['qty_sold']
    ];
}, $topProducts);

sendSuccess([
    'period' => $periodLabel,
    'total_transactions' => (int) $summary['total_transactions'],
    'total_revenue' => (int) $summary['total_revenue'],
    'top_products' => $result
]);