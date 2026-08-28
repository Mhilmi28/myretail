<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn);

$stmt = $conn->query("SELECT p.id, p.name, p.sku, p.price, p.stock, p.image_url,
        c.id AS category_id, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id");

$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

sendSuccess($result);
