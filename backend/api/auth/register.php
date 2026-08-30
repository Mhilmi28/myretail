<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middlewares/auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Metode request tidak diizinkan', 405);
}

requireAuth($conn, 'owner');

$input = getJsonInput();
$name = trim($input['name'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$role = trim($input['role'] ?? '');

if(trim($name) === '' || trim($email) === '' || $password === '' || trim($role) === '') {
    sendError('Semua field harus diisi', 422);
}

if(!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendError('Email tidak valid', 422);
}

if($role !== 'cashier'){
    sendError('Role harus cashier', 422);
}

$stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
$stmt->execute(['email' => $email]);
if($stmt->fetch()) {
    sendError('Email sudah digunakan', 409);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role)");
$stmt->execute([
    'name' => $name,
    'email' => $email,
    'password' => $passwordHash,
    'role' => $role
]);

$result = [
    'id' => $conn->lastInsertId(),
    'name' => $name,
    'email' => $email,
    'role' => $role
];

sendSuccess($result, 'User berhasil didaftarkan', 201);