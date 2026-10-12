<?php
declare(strict_types=1);
require 'db.php';

// ส่งเฉพาะแจ้งเตือนของสมาชิกที่ล็อกอินอยู่ (ใช้ id จาก session ไม่เชื่อค่าจาก URL)
// ถ้ายังไม่ล็อกอินหรือเป็นแอดมิน ตอบเป็นรายการว่าง เพราะหน้าเว็บคาดหวังเป็น array เสมอ
$user = $_SESSION['user'] ?? null;
if (!$user || ($user['role'] ?? '') !== 'member') {
    jsonResponse([]);
}

$stmt = $conn->prepare("SELECT notification_id AS id, message, created_at, is_read, queue_id
                        FROM notification
                        WHERE member_id = ?
                        ORDER BY created_at DESC, notification_id DESC
                        LIMIT 5");
$stmt->bind_param('s', $user['id']);
$stmt->execute();
$result = $stmt->get_result();

$notifications = [];
while ($row = $result->fetch_assoc()) {
    $notifications[] = $row;
}
$stmt->close();

jsonResponse($notifications);
