<?php 
$host = 'localhost';
$dbname = 'myretail_db';
$username = 'root';
$password = '';

try {
    $conn = new PDO("mysql:host = $host; dbname = $dbname; charset = utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e){
    echo "Koneksi gagal: " . $e->getMessage();
}

echo "Koneksi berhasil!";