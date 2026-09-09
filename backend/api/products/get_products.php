<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn);

$search = $_GET['search'] ?? '';
$categoryId = $_GET['category_id'] ?? '';
$page = (int) ($_GET['page'] ?? 1);
$limit = (int) ($_GET['limit'] ?? 10);
$offset = ($page - 1) * $limit;

$searchParam = '%' . $search . '%';

$sql = "SELECT p.id, p.name, p.sku, p.price, p.stock, p.image_url, c.id AS category_id, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.name LIKE :search";

$params = ['search' => $searchParam];

if (!empty($categoryId)) {
    $sql .= " AND p.category_id = :category_id";
    $params['category_id'] = $categoryId;
}

$countSql = "SELECT COUNT(*) AS total FROM products p WHERE p.name LIKE :search" . (!empty($categoryId) ? " AND p.category_id = :category_id" : "");
$countStmt = $conn->prepare($countSql);
$countStmt->execute($params);
$totalData = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

$sql .= " LIMIT :limit OFFSET :offset";

$stmt = $conn->prepare($sql);
$stmt->bindValue(':search', $searchParam);
if (!empty($categoryId)) {
    $stmt->bindValue(':category_id', $categoryId);
}
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalPage = ceil($totalData / $limit);

$result = array_map(function($p) {
    return [
        'id' => $p['id'],
        'name' => $p['name'],
        'sku' => $p['sku'],
        'price' => (int)$p['price'],
        'stock' => (int)$p['stock'],
        'image_url' => $p['image_url'],
        'category' => [
            'id' => $p['category_id'],
            'name' => $p['category_name']
        ]
    ];
}, $products);

sendSuccess($result, 'berhasil', 200, [
    'current_page' => $page,
    'total_page' => $totalPage,
    'total_data' => $totalData
]);