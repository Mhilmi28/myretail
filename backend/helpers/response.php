<?php 
function sendSuccess($data = null, $message = 'berhasil', $code = 200, $meta = null){
    http_response_code($code);

    $response = [
        'success' => true,
        'data' => $data,
        'message' => $message
    ];

    if ($meta !== null) {
        $response['meta'] = $meta;
    }

    echo json_encode($response);
    exit;
}

function sendError($message = 'Terjadi kesalahan', $code = 400, $errors = null){
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'errors' => $errors
    ]);
    exit;
}

function getJsonInput() {
    $data = json_decode(file_get_contents('php://input'), true);
    return $data ?? [];
}