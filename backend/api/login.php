<?php
declare(strict_types=1);
require 'db.php';

$data = requestBody();
$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    jsonResponse(['success' => false, 'message' => 'กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง'], 422);
}

$admin = $conn->prepare('SELECT admin_id AS id, firstname, lastname, email, phone, profile_pic, password FROM admin WHERE email = ? LIMIT 1');
$admin->bind_param('s', $email);
$admin->execute();
$user = $admin->get_result()->fetch_assoc();
$admin->close();
$role = 'admin';

if (!$user) {
    $member = $conn->prepare('SELECT member_id AS id, firstname, lastname, email, phone, profile_pic, password, is_active FROM member WHERE email = ? LIMIT 1');
    $member->bind_param('s', $email);
    $member->execute();
    $user = $member->get_result()->fetch_assoc();
    $member->close();
    $role = 'member';

    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'], 401);
    }
    if ((int)$user['is_active'] !== 1) {
        jsonResponse(['success' => false, 'message' => 'บัญชีนี้ถูกระงับการใช้งาน'], 403);
    }
}

if (!password_verify($password, $user['password'])) {
    jsonResponse(['success' => false, 'message' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'], 401);
}

session_regenerate_id(true);
unset($user['password']);
$user['role'] = $role;
$_SESSION['user'] = $user;

jsonResponse(['success' => true, 'user' => $user]);
