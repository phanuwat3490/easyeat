<?php
declare(strict_types=1);
require 'db.php';

// ต้องล็อกอิน: แอดมินแก้ได้ทุกคน, สมาชิกแก้ได้เฉพาะข้อมูลของตัวเอง
$user = requireLogin();
requireCsrf();
$isAdmin = ($user['role'] ?? '') === 'admin';

$data = requestBody();
$id = trim((string)($data['id'] ?? ''));
$firstname = trim((string)($data['firstname'] ?? ''));
$lastname = trim((string)($data['lastname'] ?? ''));
$email = strtolower(trim((string)($data['email'] ?? '')));
$phone = trim((string)($data['phone'] ?? ''));
$password = (string)($data['password'] ?? '');
$profilePic = (string)($data['profile_pic'] ?? ($data['image'] ?? ''));

if ($id === '' || (!$isAdmin && $id !== (string)$user['id'])) {
    jsonResponse(['success' => false, 'message' => 'คุณไม่มีสิทธิ์แก้ไขข้อมูลสมาชิกนี้'], 403);
}
if ($firstname === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['success' => false, 'message' => 'กรุณากรอกชื่อและอีเมลให้ถูกต้อง'], 422);
}
if (!isValidThaiPhone($phone)) {
    jsonResponse(['success' => false, 'message' => 'เบอร์โทรศัพท์ไทยต้องมี 10 หลักและขึ้นต้นด้วย 0'], 422);
}
if ($profilePic !== '' && (strpos($profilePic, 'data:image/') !== 0 || strlen($profilePic) > 4000000)) {
    jsonResponse(['success' => false, 'message' => 'รูปโปรไฟล์ไม่ถูกต้องหรือมีขนาดใหญ่เกินไป'], 422);
}

$fields = ['firstname = ?', 'lastname = ?', 'email = ?', 'phone = ?'];
$types = 'ssss';
$params = [$firstname, $lastname, $email, $phone];

if ($password !== '') {
    $fields[] = 'password = ?';
    $types .= 's';
    $params[] = password_hash($password, PASSWORD_DEFAULT);
}

// [ปรับปรุง] รองรับการอัปเดตหรือลบรูปภาพ (หากส่งค่ามา จะทำการอัปเดตทันที ทั้งกรณีเปลี่ยนรูปใหม่หรือลบรูปออกเป็นค่าว่าง)
if (array_key_exists('profile_pic', $data) || array_key_exists('image', $data)) {
    $fields[] = 'profile_pic = ?';
    $types .= 's';
    $params[] = ($profilePic !== '') ? $profilePic : null;
}

// เปลี่ยนสถานะบัญชีได้เฉพาะแอดมิน และต้องส่งค่ามาจริงเท่านั้น
if ($isAdmin && array_key_exists('is_active', $data)) {
    $fields[] = 'is_active = ?';
    $types .= 'i';
    $params[] = $data['is_active'] ? 1 : 0;
}

$types .= 's';
$params[] = $id;

try {
    $stmt = $conn->prepare('UPDATE member SET ' . implode(', ', $fields) . ' WHERE member_id = ?');
    $stmt->bind_param($types, ...$params);
    $ok = $stmt->execute();
    $errno = $stmt->errno;
    $stmt->close();
} catch (mysqli_sql_exception $error) {
    $ok = false;
    $errno = $error->getCode();
    error_log('update_member: ' . $error->getMessage());
}

if (!$ok) {
    if ($errno === 1062) {
        jsonResponse(['success' => false, 'message' => 'อีเมลนี้ถูกใช้งานแล้ว'], 409);
    }
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถอัปเดตข้อมูลสมาชิกได้'], 500);
}

// สมาชิกแก้ข้อมูลตัวเอง ให้ session ตรงกับข้อมูลใหม่
if (!$isAdmin) {
    $_SESSION['user']['firstname'] = $firstname;
    $_SESSION['user']['lastname'] = $lastname;
    $_SESSION['user']['email'] = $email;
    $_SESSION['user']['phone'] = $phone;
    if (array_key_exists('profile_pic', $data) || array_key_exists('image', $data)) {
        $_SESSION['user']['profile_pic'] = ($profilePic !== '') ? $profilePic : null;
    }
}

jsonResponse(['success' => true, 'message' => 'อัปเดตข้อมูลสมาชิกสำเร็จ']);
