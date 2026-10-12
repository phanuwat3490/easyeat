<?php
declare(strict_types=1);
require 'db.php';
$admin = requireAdmin();
requireCsrf();

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['email'])) {
    jsonResponse(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"], 422);
}

$admin_id = (string)($admin['id'] ?? '');
$firstname = trim($data['firstname'] ?? '');
$lastname = trim($data['lastname'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$profile_pic = $data['profile_pic'] ?? '';
$password = $data['password'] ?? '';

if ($firstname === '' || $lastname === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !isValidThaiPhone($phone) || (!empty($password) && strlen($password) < 8)) {
    jsonResponse(['success' => false, 'message' => 'ข้อมูลผู้ดูแลระบบไม่ถูกต้อง'], 422);
}

if (!empty($phone)) {
    // 1. ตรวจสอบว่าเบอร์โทรศัพท์นี้ถูกใช้งานโดยตาราง member แล้วหรือไม่
    $checkMember = $conn->prepare("SELECT member_id FROM member WHERE phone = ?");
    $checkMember->bind_param("s", $phone);
    $checkMember->execute();
    if ($checkMember->get_result()->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "เบอร์โทรศัพท์นี้ถูกใช้งานโดยบัญชีสมาชิกแล้ว ไม่สามารถใช้งานซ้ำได้"]);
        $checkMember->close();
        $conn->close();
        exit();
    }
    $checkMember->close();

    // 2. ตรวจสอบว่าเบอร์โทรศัพท์นี้ถูกใช้งานโดยแอดมินคนอื่นแล้วหรือไม่
    $checkAdmin = $conn->prepare("SELECT admin_id FROM admin WHERE phone = ? AND admin_id != ?");
    $checkAdmin->bind_param("ss", $phone, $admin_id);
    $checkAdmin->execute();
    if ($checkAdmin->get_result()->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "เบอร์โทรศัพท์นี้ถูกใช้งานโดยผู้ดูแลระบบท่านอื่นแล้ว"]);
        $checkAdmin->close();
        $conn->close();
        exit();
    }
    $checkAdmin->close();
}

if (!empty($password)) {
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $sql = "UPDATE admin SET firstname = ?, lastname = ?, email = ?, phone = ?, profile_pic = ?, password = ? WHERE admin_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssss", $firstname, $lastname, $email, $phone, $profile_pic, $hashed_password, $admin_id);
} else {
    $sql = "UPDATE admin SET firstname = ?, lastname = ?, email = ?, phone = ?, profile_pic = ? WHERE admin_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssss", $firstname, $lastname, $email, $phone, $profile_pic, $admin_id);
}

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "บันทึกข้อมูลผู้ดูแลระบบสำเร็จ"]);
} else {
    echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกข้อมูลได้: " . $conn->error]);
}

$stmt->close();
$conn->close();
?>
