<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    sendError('Metode request tidak diizinkan', 405);
}

$user = requireAuth($conn);

$input = getJsonInput();
$items = $input['items'] ?? [];
$discount = $input['discount_total'] ?? 0;
$payment = $input['payment_method'] ?? '';
$cash = $input['cash_received'] ?? 0;

if(empty($items)){
    sendError('Item transaksi tidak boleh kosong', 422);
}

$validPaymentMethods = ['cash', 'qris', 'transfer', 'debit'];
if(!in_array($payment, $validPaymentMethods)){
    sendError("Metode pembayaran harus salah satu dari: " . implode(', ', $validPaymentMethods), 422);
}

if($payment === 'cash' && $cash <= 0){
    sendError('Nominal uang yang diterima wajib diisi untuk pembayaran cash', 422);
}

try{
    $conn->beginTransaction();

    $subtotal = 0;
    $detailItems = [];

    foreach ($items as $item){
        $productId = $item['product_id'] ?? null;
        $qty = (int) ($item['qty'] ?? 0);
        $itemDiscount = (int) ($item['discount_amount'] ?? 0);

        $stmt = $conn->prepare("SELECT * FROM products WHERE id = :id FOR UPDATE");
        $stmt->execute(['id' => $productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if(!$product){
            throw new Exception("Produk dengan id {$productId} tidak ditemukan");
        }

        if($product['stock'] < $qty){
            throw new Exception("Stok produk '{$product['name']}' tidak mencukupi");
        }

        $itemSubtotal = $product['price'] * $qty - $itemDiscount;
        $subtotal += $itemSubtotal;

        $detailItems[] = [
            'product_id' => $productId,
            'name' => $product['name'],
            'qty' => $qty,
            'price' => $product['price'],
            'discount_amount' => $itemDiscount,
            'subtotal' => $itemSubtotal
        ];
    }

    $total = $subtotal - $discount;
    if($total < 0) $total = 0;

    if($payment === 'cash' && $cash < $total){
        throw new Exception('Uang yang diterima kurang dari total belanja');
    }

    $change = $payment === 'cash' ? ($cash - $total) : 0;
    $transactionCode = 'TRX-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));

    $stmt = $conn->prepare("INSERT INTO transactions 
                                (transaction_code, user_id, subtotal, discount_total, total, payment_method, cash_received, change_amount, status) 
                            VALUES 
                                (:code, :user_id, :subtotal, :discount_total, :total, :method, :cash, :change, 'success')");
    $stmt->execute([
        'code' => $transactionCode,
        'user_id' => $user['id'],
        'subtotal' => $subtotal,
        'discount_total' => $discount,
        'total' => $total,
        'method' => $payment,
        'cash' => $payment === 'cash' ? $cash : null,
        'change' => $payment === 'cash' ? $change : null
    ]);

    $transactionId = $conn->lastInsertId();

    foreach ($detailItems as $d){
        $stmt = $conn->prepare("INSERT INTO transaction_items
                                    (transaction_id, product_id, qty, price, discount_amount, subtotal)
                                VALUES 
                                    (:transaction_id, :product_id, :qty, :price, :discount_amount, :subtotal)");
        $stmt->execute([
            'transaction_id' => $transactionId,
            'product_id' => $d['product_id'],
            'qty' => $d['qty'],
            'price' => $d['price'],
            'discount_amount' => $d['discount_amount'],
            'subtotal' => $d['subtotal']
        ]);

        $stmt = $conn->prepare("UPDATE products SET stock = stock - :qty WHERE id = :id");
        $stmt->execute([
            'id' => $d['product_id'],
            'qty' => $d['qty']
            ]);
    }
    
    $conn->commit();

        sendSuccess([
        'transaction_id' => $transactionCode,
        'status' => "success",
        'cashier' => [
            'id' => $user['id'],
            'name' => $user['name']
        ],
        'items' => $detailItems,
        'subtotal' => $subtotal,
        'discount_total' => $discount,
        'total' => $total,
        'payment_method' => $payment,
        'cash_received' => $payment === 'cash' ? $cash : null,
        'change' => $payment === 'cash' ? $change : null,
        'created_at' => date('c')
    ],"Transaksi Berhasil");

}catch(Exception $e){
    $conn->rollback();
    sendError($e->getMessage(), 400);
}
