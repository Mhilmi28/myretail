<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$today = date('Y-m-d');

$stmt = $conn->prepare(
    "SELECT COUNT(*) as total_transactions, COALESCE(SUM(total), 0) as total_revenue
     FROM transactions
     WHERE DATE(created_at) = :today AND status = 'success'"
);
$stmt->execute(['today' => $today]);
$summary = $stmt->fetch(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("SELECT id, name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 10");
$stmt->execute();
$lowStockProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

$result = array_map(function($p){
    return [
        'id' => (int) $p['id'],
        'name' => $p['name'],
        'stock' => (int) $p['stock']
    ];
}, $lowStockProducts);

sendSuccess([
    'today_revenue' => (int) $summary['total_revenue'],
    'today_transactions' => (int) $summary['total_transactions'],
    'low_stock_products' => $result
]);

