<?php
declare(strict_types=1);
require 'db.php';
$admin = requireAdmin();
requireCsrf();

$data = requestBody();
$queueId = trim((string)($data['id'] ?? ''));
$status = trim((string)($data['status'] ?? ''));
$newTime = trim((string)($data['new_time'] ?? ''));

if ($queueId === '' || !in_array($status, ['S1', 'S2', 'S3', 'S4', 'S5'], true)) {
    jsonResponse(['success' => false, 'message' => 'ข้อมูลคิวหรือสถานะไม่ถูกต้อง'], 422);
}
if ($status === 'S5') {
    if (!isValidServiceDateTime($newTime)) {
        jsonResponse(['success' => false, 'message' => 'กรุณาระบุวันและเวลาใหม่ให้ถูกต้อง'], 422);
    }
    if ($newTime < date('Y-m-d H:i:s')) {
        jsonResponse(['success' => false, 'message' => 'ไม่สามารถเลื่อนคิวไปยังเวลาที่ผ่านมาแล้วได้'], 422);
    }
}

$conn->begin_transaction();
try {
    $find = $conn->prepare('SELECT member_id, queue_number, status_id, service_datetime FROM queue WHERE queue_id = ? FOR UPDATE');
    $find->bind_param('s', $queueId);
    $find->execute();
    $queue = $find->get_result()->fetch_assoc();
    $find->close();

    if (!$queue) {
        $conn->rollback();
        jsonResponse(['success' => false, 'message' => 'ไม่พบคิวที่ต้องการอัปเดต'], 404);
    }
    // คิวที่ใช้บริการแล้วหรือยกเลิกแล้วถือว่าปิด ห้ามเปลี่ยนสถานะต่อ
    if (in_array($queue['status_id'], ['S3', 'S4'], true)) {
        $conn->rollback();
        jsonResponse(['success' => false, 'message' => 'คิวนี้ปิดแล้ว (ใช้บริการแล้วหรือยกเลิกแล้ว) ไม่สามารถเปลี่ยนสถานะได้'], 409);
    }
    // กดสถานะเดิมซ้ำ ไม่ถือเป็นข้อผิดพลาด
    if ($status !== 'S5' && $queue['status_id'] === $status) {
        $conn->rollback();
        jsonResponse(['success' => true, 'message' => 'อัปเดตสถานะคิวสำเร็จ']);
    }

    $finalNumber = (string)$queue['queue_number'];

    if ($status === 'S5') {
        $oldDate = substr((string)$queue['service_datetime'], 0, 10);
        $newDate = substr($newTime, 0, 10);
        if ($newDate !== $oldDate) {
            // ย้ายไปวันอื่น ต้องออกหมายเลขคิวใหม่ของวันนั้น ไม่ให้ซ้ำกับคิวอื่น
            $seq = $conn->prepare("SELECT COALESCE(MAX(CAST(SUBSTRING(queue_number, 2) AS UNSIGNED)), 0) + 1 AS next_number FROM queue WHERE DATE(service_datetime) = ? FOR UPDATE");
            $seq->bind_param('s', $newDate);
            $seq->execute();
            $next = (int)$seq->get_result()->fetch_assoc()['next_number'];
            $seq->close();
            $queueNumber = 'A' . str_pad((string)$next, 3, '0', STR_PAD_LEFT);
            $finalNumber = $queueNumber;
            $stmt = $conn->prepare('UPDATE queue SET status_id = ?, service_datetime = ?, queue_number = ?, admin_id = ? WHERE queue_id = ?');
            $stmt->bind_param('sssss', $status, $newTime, $queueNumber, $admin['id'], $queueId);
        } else {
            $stmt = $conn->prepare('UPDATE queue SET status_id = ?, service_datetime = ?, admin_id = ? WHERE queue_id = ?');
            $stmt->bind_param('ssss', $status, $newTime, $admin['id'], $queueId);
        }
    } elseif ($status === 'S4') {
        $stmt = $conn->prepare("UPDATE queue SET status_id = ?, cancel_datetime = NOW(), cancelled_by = 'admin', admin_id = ? WHERE queue_id = ?");
        $stmt->bind_param('sss', $status, $admin['id'], $queueId);
    } else {
        $stmt = $conn->prepare('UPDATE queue SET status_id = ?, admin_id = ? WHERE queue_id = ?');
        $stmt->bind_param('sss', $status, $admin['id'], $queueId);
    }
    $stmt->execute();
    $stmt->close();

    $actionNames = ['S2' => 'เรียกคิว', 'S3' => 'ปิดคิว: ใช้บริการแล้ว', 'S4' => 'ยกเลิกคิว', 'S5' => 'เลื่อนคิว'];
    $audit = $conn->prepare('INSERT INTO queue_audit_log (queue_id, admin_id, action, old_status, new_status, old_service_datetime, new_service_datetime) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $action = $actionNames[$status] ?? 'เปลี่ยนสถานะคิว';
    $newServiceDateTime = $status === 'S5' ? $newTime : $queue['service_datetime'];
    $audit->bind_param('sssssss', $queueId, $admin['id'], $action, $queue['status_id'], $status, $queue['service_datetime'], $newServiceDateTime);
    $audit->execute();
    $audit->close();

    // แจ้งเตือนสมาชิก (คิวหน้างานรหัสขึ้นต้นด้วย W ไม่มีผู้รับ จึงข้าม)
    $messages = [
        'S2' => "คิวของคุณ ({$finalNumber}) กำลังถูกเรียกเข้ารับบริการ กรุณาติดต่อหน้าร้าน",
        'S3' => "คิวของคุณ ({$finalNumber}) ใช้บริการเรียบร้อยแล้ว ขอบคุณที่ใช้บริการครับ",
        'S4' => "คิวของคุณ ({$finalNumber}) ถูกยกเลิกโดยผู้ดูแลระบบ",
    ];
    if ($status === 'S5') {
        $messages['S5'] = "คิวของคุณ ({$finalNumber}) ถูกเลื่อนเวลาบริการเป็น " . date('d/m/Y เวลา H:i น.', strtotime($newTime));
    }
    if (isset($messages[$status]) && strpos((string)$queue['member_id'], 'W') !== 0) {
        $nid = $conn->query("SELECT COALESCE(MAX(CAST(SUBSTRING(notification_id, 2) AS UNSIGNED)), 0) + 1 AS next_id FROM notification FOR UPDATE");
        $notificationId = 'N' . str_pad((string)(int)$nid->fetch_assoc()['next_id'], 4, '0', STR_PAD_LEFT);
        $noti = $conn->prepare('INSERT INTO notification (notification_id, message, queue_id, member_id) VALUES (?, ?, ?, ?)');
        $noti->bind_param('ssss', $notificationId, $messages[$status], $queueId, $queue['member_id']);
        $noti->execute();
        $noti->close();
    }

    $conn->commit();
} catch (Throwable $error) {
    $conn->rollback();
    error_log('update_queue_status: ' . $error->getMessage());
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถอัปเดตสถานะคิวได้'], 500);
}
jsonResponse(['success' => true, 'message' => 'อัปเดตสถานะคิวสำเร็จ']);
