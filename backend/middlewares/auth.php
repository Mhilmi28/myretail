<?php

function getBearerToken(){
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if(preg_match('/Bearer\s(\S+)/', $authHeader, $matches)){
        return $matches[1];
    }
    return null;
}

function requireAuth($conn, $requiredRole = null){
    $token = getBearerToken();

    if(!$token){
        sendError('Token tidak ditemukan', 401);
    }

    $stmt = $conn->prepare(
        "SELECT u.id , u.name, u.email, u.role
        FROM tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token = :token"
    );

    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if(!$user){
        sendError('Token tidak valid atau sudah expired, silahkan login ulang', 401);
    }

    if($requiredRole !== null && $user['role'] !== $requiredRole){
        sendError('Akses ditolak, role tidak sesuai', 403);
    }

    return $user;
}