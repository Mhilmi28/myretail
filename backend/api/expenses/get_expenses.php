<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$month = $_GET['month'] ?? '';
$year = $_GET['year'] ?? '';

$sql = "SELECT id, name, amount, date FROM expenses WHERE 1=1";

$params = [];

if(!empty($month) && !empty($year)){
    $sql .= " AND MONTH(date) = :month AND YEAR(date) = :year";
    $params['month'] = $month;
    $params['year'] = $year;
}elseif (!empty($year)){
    $sql .= " AND YEAR(date) = :year";
    $params['year'] = $year;
}

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$expense = $stmt->fetchAll(PDO::FETCH_ASSOC);

$result = array_map(function($e){
    return[
        'id' => $e['id'],
        'name' => $e['name'],
        'amount' => $e['amount'],
        'date' => $e['date']
    ];
}, $expense);

sendSuccess($result);