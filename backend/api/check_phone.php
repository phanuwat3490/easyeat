<?php
declare(strict_types=1);
require 'db.php';
$user = requireLogin();

$data = json_decode(file_get_contents("php://input"), true);
$phone = trim($data['phone'] ?? '');
$current_id = (string)($user['id'] ?? '');

if (!isValidThaiPhone($phone)) {
    jsonResponse(["success" => false, "message" => "เบอร์โทรศัพท์ไทยต้องมี 10 หลักและขึ้นต้นด้วย 0"], 422);
}

$exists = false;

// 1. ตรวจสอบว่าเบอร์นี้ถูกใช้งานโดยสมาชิกคนอื่นหรือไม่
$stmtMember = $conn->prepare("SELECT member_id FROM member WHERE phone = ? AND member_id != ?");
$stmtMember->bind_param("ss", $phone, $current_id);
$stmtMember->execute();
if ($stmtMember->get_result()->num_rows > 0) {
    $exists = true;
}
$stmtMember->close();

// 2. ถ้ายังไม่พบในสมาชิก ให้ตรวจสอบว่าเบอร์นี้ถูกใช้งานโดยแอดมินคนอื่นหรือไม่
if (!$exists) {
    $stmtAdmin = $conn->prepare("SELECT admin_id FROM admin WHERE phone = ? AND admin_id != ?");
    $stmtAdmin->bind_param("ss", $phone, $current_id);
    $stmtAdmin->execute();
    if ($stmtAdmin->get_result()->num_rows > 0) {
        $exists = true;
    }
    $stmtAdmin->close();
}

if ($exists) {
    echo json_encode(["success" => false, "exists" => true, "message" => "เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว"]);
} else {
    echo json_encode(["success" => true, "exists" => false]);
}

$conn->close();
?>
