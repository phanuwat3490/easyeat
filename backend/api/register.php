<?php
declare(strict_types=1);
require 'db.php';

$data = requestBody();
$firstname = trim((string)($data['firstname'] ?? ''));
$lastname = trim((string)($data['lastname'] ?? ''));
$phone = trim((string)($data['phone'] ?? ''));
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
$profilePic = (string)($data['profile_pic'] ?? '');

if ($firstname === '' || $lastname === '' || !isValidThaiPhone($phone) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
    jsonResponse(['success' => false, 'message' => 'ข้อมูลสมัครสมาชิกไม่ถูกต้อง'], 422);
}
if ($profilePic !== '' && (strpos($profilePic, 'data:image/') !== 0 || strlen($profilePic) > 4000000)) {
    jsonResponse(['success' => false, 'message' => 'รูปโปรไฟล์ไม่ถูกต้องหรือมีขนาดใหญ่เกินไป'], 422);
}

$conn->begin_transaction();
try {
    $duplicate = $conn->prepare('SELECT member_id FROM member WHERE email = ? OR phone = ? LIMIT 1 FOR UPDATE');
    $duplicate->bind_param('ss', $email, $phone);
    $duplicate->execute();
    if ($duplicate->get_result()->num_rows > 0) {
        throw new RuntimeException('อีเมลหรือเบอร์โทรศัพท์นี้ถูกใช้งานแล้ว');
    }
    $duplicate->close();

    $next = $conn->query("SELECT COALESCE(MAX(CAST(SUBSTRING(member_id, 2) AS UNSIGNED)), 0) + 1 AS next_id FROM member WHERE member_id LIKE 'M%' FOR UPDATE");
    $memberId = 'M' . str_pad((string)(int)$next->fetch_assoc()['next_id'], 3, '0', STR_PAD_LEFT);
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare('INSERT INTO member (member_id, firstname, lastname, phone, email, password, profile_pic, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
    $stmt->bind_param('sssssss', $memberId, $firstname, $lastname, $phone, $email, $hash, $profilePic);
    $stmt->execute();
    $stmt->close();

    $conn->commit();
    jsonResponse(['success' => true, 'message' => 'สมัครสมาชิกสำเร็จ', 'member_id' => $memberId], 201);
} catch (Throwable $error) {
    $conn->rollback();
    jsonResponse(['success' => false, 'message' => $error->getMessage() ?: 'ไม่สามารถสมัครสมาชิกได้'], 422);
}
