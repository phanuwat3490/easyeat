<?php
require 'db.php';
$user = requireLogin();

$member_id = (string)($user['id'] ?? '');

if ($member_id === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "ไม่พบรหัสสมาชิก"]);
    exit();
}

$stmt = $conn->prepare("SELECT is_active FROM member WHERE member_id = ?");
$stmt->bind_param("s", $member_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    jsonResponse([
        "success"   => true,
        "is_active" => (int)$row['is_active'] === 1,
    ]);
} else {
    jsonResponse(["success" => false, "message" => "ไม่พบข้อมูลผู้ใช้"], 404);
}
