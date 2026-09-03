<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Metode request tidak diizinkan', 405);
}

$period = $_GET['period'] ?? '';
$year   = $_GET['year'] ?? '';
$month  = $_GET['month'] ?? '';

if (empty($year)) {
    sendError('Tahun wajib diisi', 422);
}

if ($period === 'monthly') {

    if (empty($month)) {
        sendError('Bulan wajib diisi untuk laporan bulanan', 422);
    }
        $whereTrx = "WHERE MONTH(created_at) = :month AND YEAR(created_at) = :year";
        $whereExp = "WHERE MONTH(date) = :month AND YEAR(date) = :year";
        $params = ['month' => $month,'year' => $year];
        $periodLabel = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT);
    } else {
        $whereTrx = "WHERE YEAR(created_at) = :year";
        $whereExp = "WHERE YEAR(date) = :year";
        $params = ['year' => $year];
        $periodLabel = (string) $year;
}

$stmt = $conn->prepare("SELECT COUNT(*) AS total_transactions, COALESCE(SUM(total), 0) AS revenue, COALESCE(SUM(discount_total), 0) AS total_discount
                        FROM transactions $whereTrx
                        AND status = 'success'");
$stmt->execute($params);
$transactionData = $stmt->fetch(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) AS total_expenses
                        FROM expenses $whereExp");
$stmt->execute($params);
$expenseData = $stmt->fetch(PDO::FETCH_ASSOC);

$revenue = (float) $transactionData['revenue'];
$totalExpenses = (float) $expenseData['total_expenses'];

$profit = $revenue - $totalExpenses;

sendSuccess([
    'period' => $periodLabel,
    'total_transactions' => (int) $transactionData['total_transactions'],
    'revenue' => $revenue,
    'total_discount' => (float) $transactionData['total_discount'],
    'total_expenses' => $totalExpenses,
    'profit' => $profit
], 'Laporan berhasil diambil');