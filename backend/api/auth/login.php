<?php

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    sendError('Metode request tidak diizinkan', 405);
}

$input = getJsonInput();
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

if(empty($email) || empty($password)){
    sendError('Email dan password harus diisi', 422);
}

$stmt = $conn->prepare("SELECT * FROM users WHERE email = :email");
$stmt->execute(['email' => $email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$user){
    sendError('Email atau Password salah', 404);
}

if(!password_verify($password, $user['password'])){
    sendError('Email atau Password salah', 401);
}

$token = bin2hex(random_bytes(32));

$stmt = $conn->prepare("INSERT INTO tokens (user_id, token) VALUES (:user_id, :token)");
$stmt->execute(['user_id' => $user['id'], 'token' => $token]);

sendSuccess([
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role']
    ]
], 'Login berhasil');
