<?php
declare(strict_types=1);
require 'db.php';
$user = requireLogin();

// ดึงฟิลด์ profile_pic และตรวจสอบเผื่อกรณีฐานข้อมูลใช้ชื่อคอลัมน์ image
$members = [];
if (($user['role'] ?? '') === 'member') {
    $stmt = $conn->prepare('SELECT member_id AS id, firstname, lastname, email, phone, profile_pic, is_active FROM member WHERE member_id = ? LIMIT 1');
    $stmt->bind_param('s', $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    requireAdmin();
    $result = $conn->query("SELECT member_id AS id, firstname, lastname, email, phone, profile_pic, is_active FROM member WHERE member_id NOT LIKE 'W%' ORDER BY member_id DESC");
}

if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $row['is_active'] = (bool)$row['is_active'];
        // รองรับทั้งฟิลด์ profile_pic และ image
        if (empty($row['profile_pic']) && isset($row['image'])) {
            $row['profile_pic'] = $row['image'];
        }
        $members[] = $row;
    }
}

if (isset($stmt)) {
    $stmt->close();
}

jsonResponse($members);
