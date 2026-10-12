<?php
declare(strict_types=1);
require 'db.php';
requireAdmin();
requireCsrf();

$data = requestBody();
$firstname = trim((string)($data['firstname'] ?? ''));
$lastname = trim((string)($data['lastname'] ?? ''));
$people = filter_var($data['people'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 20]]);
$serviceDateTime = date('Y-m-d H:i:s'); // คิวหน้างานใช้เวลาปัจจุบันของเซิร์ฟเวอร์เสมอ

if ($firstname === '' || !$people || !isValidServiceDateTime($serviceDateTime)) {
    jsonResponse(['success' => false, 'message' => 'กรุณากรอกข้อมูลคิวหน้างานให้ครบถ้วน'], 422);
}

$date = substr($serviceDateTime, 0, 10);
$conn->begin_transaction();
try {
    $restaurant = $conn->query('SELECT max_queues_per_slot, avg_minutes_per_queue FROM restaurant ORDER BY restaurant_id LIMIT 1');
    $settings = $restaurant ? $restaurant->fetch_assoc() : null;
    $slotCapacity = max(1, (int)($settings['max_queues_per_slot'] ?? 10));
    $minutesPerQueue = max(1, (int)($settings['avg_minutes_per_queue'] ?? 4));
    $slot = $conn->prepare("SELECT COUNT(*) AS queued FROM queue WHERE service_datetime = ? AND status_id IN ('S1', 'S2', 'S5') FOR UPDATE");
    $slot->bind_param('s', $serviceDateTime);
    $slot->execute();
    $queuedAhead = (int)$slot->get_result()->fetch_assoc()['queued'];
    $slot->close();
    if ($queuedAhead >= $slotCapacity) {
        throw new RuntimeException('รอบเวลานี้เต็มแล้ว กรุณาเลือกเวลาอื่น');
    }

    $walkInResult = $conn->query("SELECT COALESCE(MAX(CAST(SUBSTRING(member_id, 2) AS UNSIGNED)), 0) + 1 AS next_id FROM member WHERE member_id LIKE 'W%' FOR UPDATE");
    $walkInNumber = (int)$walkInResult->fetch_assoc()['next_id'];
    $memberId = 'W' . str_pad((string)$walkInNumber, 8, '0', STR_PAD_LEFT);
    $email = strtolower($memberId) . '@walkin.local';
    $blankPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $member = $conn->prepare('INSERT INTO member (member_id, firstname, lastname, email, phone, password, is_active) VALUES (?, ?, ?, ?, ?, ?, 0)');
    $phone = '';
    $member->bind_param('ssssss', $memberId, $firstname, $lastname, $email, $phone, $blankPassword);
    $member->execute();
    $member->close();

    $sequence = $conn->prepare("SELECT COALESCE(MAX(CAST(SUBSTRING(queue_number, 2) AS UNSIGNED)), 0) + 1 AS next_number FROM queue WHERE DATE(service_datetime) = ? FOR UPDATE");
    $sequence->bind_param('s', $date);
    $sequence->execute();
    $nextNumber = (int)$sequence->get_result()->fetch_assoc()['next_number'];
    $sequence->close();

    $idResult = $conn->query("SELECT COALESCE(MAX(CAST(SUBSTRING(queue_id, 2) AS UNSIGNED)), 0) + 1 AS next_id FROM queue FOR UPDATE");
    $nextId = (int)$idResult->fetch_assoc()['next_id'];
    $queueId = 'Q' . str_pad((string)$nextId, 3, '0', STR_PAD_LEFT);
    $queueNumber = 'A' . str_pad((string)$nextNumber, 3, '0', STR_PAD_LEFT);
    $createdAt = date('Y-m-d H:i:s');
    $queue = $conn->prepare("INSERT INTO queue (queue_id, queue_number, member_id, number_of_people, booking_datetime, service_datetime, status_id) VALUES (?, ?, ?, ?, ?, ?, 'S1')");
    $queue->bind_param('sssiss', $queueId, $queueNumber, $memberId, $people, $createdAt, $serviceDateTime);
    $queue->execute();
    $queue->close();

    $conn->commit();
    jsonResponse(['success' => true, 'id' => $queueId, 'queue_number' => $queueNumber, 'queues_ahead' => $queuedAhead, 'estimated_wait_minutes' => $queuedAhead * $minutesPerQueue]);
} catch (Throwable $error) {
    $conn->rollback();
    error_log('add_walkin_queue: ' . $error->getMessage());
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถเพิ่มคิวหน้างานได้'], 500);
}
