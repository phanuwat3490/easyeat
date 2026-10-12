<?php
declare(strict_types=1);
require 'db.php';

$user = requireLogin();
requireCsrf();
if ($user['role'] !== 'member') {
    jsonResponse(['success' => false, 'message' => 'เฉพาะสมาชิกเท่านั้นที่ยกเลิกคิวของตนเองได้'], 403);
}

// รับ id จาก body (POST) เท่านั้น ไม่รับจาก GET เพื่อกันการยกเลิกคิวผ่านลิงก์
$data = requestBody();
$queueId = trim((string)($data['id'] ?? ''));
if ($queueId === '') {
    jsonResponse(['success' => false, 'message' => 'ไม่พบรหัสคิว'], 422);
}

$find = $conn->prepare("SELECT service_datetime FROM queue WHERE queue_id = ? AND member_id = ? AND status_id IN ('S1', 'S2', 'S5') LIMIT 1");
$find->bind_param('ss', $queueId, $user['id']);
$find->execute();
$queue = $find->get_result()->fetch_assoc();
$find->close();

if (!$queue) {
    jsonResponse(['success' => false, 'message' => 'ไม่พบคิวที่ยกเลิกได้'], 404);
}
if (strtotime($queue['service_datetime']) - time() < 1800) {
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถยกเลิกคิวภายใน 30 นาทีก่อนเวลาเข้ารับบริการ'], 422);
}

$update = $conn->prepare("UPDATE queue SET status_id = 'S4', cancel_datetime = NOW(), cancelled_by = 'member' WHERE queue_id = ? AND member_id = ? AND status_id IN ('S1', 'S2', 'S5')");
$update->bind_param('ss', $queueId, $user['id']);
$update->execute();
$changed = $update->affected_rows;
$update->close();

if ($changed < 1) {
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถยกเลิกคิวได้'], 409);
}
jsonResponse(['success' => true, 'cancelled' => true]);
