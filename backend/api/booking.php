<?php
declare(strict_types=1);
require 'db.php';

$user = requireLogin();
requireCsrf();
if ($user['role'] !== 'member') {
    jsonResponse(['success' => false, 'message' => 'บัญชีผู้ดูแลไม่สามารถจองคิวลูกค้าได้'], 403);
}

$data = requestBody();
$date = trim((string)($data['date'] ?? ''));
$time = trim((string)($data['time'] ?? ''));
$people = filter_var($data['people'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 20]]);
$serviceDateTime = "$date $time:00";

if (!$people || !isValidServiceDateTime($serviceDateTime) || $serviceDateTime < date('Y-m-d H:i:s')) {
    jsonResponse(['success' => false, 'message' => 'ข้อมูลวัน เวลา หรือจำนวนผู้เข้ารับบริการไม่ถูกต้อง'], 422);
}

$restaurant = $conn->query('SELECT open_time, close_time FROM restaurant ORDER BY restaurant_id LIMIT 1');
$hours = $restaurant ? $restaurant->fetch_assoc() : null;
$openTime = substr((string)($hours['open_time'] ?? '10:00:00'), 0, 5);
$closeTime = substr((string)($hours['close_time'] ?? '22:00:00'), 0, 5);
$lastBookableTime = date('H:i', strtotime($closeTime . ':00') - (30 * 60));
// Keep 15-minute slots so capacity and wait-time calculations have one unambiguous slot.
if (!preg_match('/^\d{2}:(00|15|30|45)$/', $time) || $time < $openTime || $time > $lastBookableTime) {
    jsonResponse(['success' => false, 'message' => "เวลาจองอยู่นอกช่วงให้บริการ (จองรอบสุดท้ายได้ $lastBookableTime น.)"], 422);
}

$conn->begin_transaction();
try {
    $active = $conn->prepare("SELECT queue_id FROM queue WHERE member_id = ? AND status_id IN ('S1', 'S2', 'S5') FOR UPDATE");
    $active->bind_param('s', $user['id']);
    $active->execute();
    if ($active->get_result()->num_rows > 0) {
        throw new RuntimeException('คุณมีคิวที่กำลังใช้งานอยู่แล้ว');
    }
    $active->close();

    $restaurant = $conn->query('SELECT max_queues_per_slot, avg_minutes_per_queue FROM restaurant ORDER BY restaurant_id LIMIT 1');
    $settings = $restaurant ? $restaurant->fetch_assoc() : null;
    $slotCapacity = max(1, (int)($settings['max_queues_per_slot'] ?? 10));
    $minutesPerQueue = max(1, (int)($settings['avg_minutes_per_queue'] ?? 4));

    // Lock this 15-minute slot before deciding whether it still has capacity.
    $slot = $conn->prepare("SELECT COUNT(*) AS queued FROM queue WHERE service_datetime = ? AND status_id IN ('S1', 'S2', 'S5') FOR UPDATE");
    $slot->bind_param('s', $serviceDateTime);
    $slot->execute();
    $queuedAhead = (int)$slot->get_result()->fetch_assoc()['queued'];
    $slot->close();
    if ($queuedAhead >= $slotCapacity) {
        throw new RuntimeException('รอบเวลานี้เต็มแล้ว กรุณาเลือกเวลาอื่น');
    }

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
    $insert = $conn->prepare('INSERT INTO queue (queue_id, queue_number, member_id, number_of_people, booking_datetime, service_datetime, status_id) VALUES (?, ?, ?, ?, ?, ?, \'S1\')');
    $insert->bind_param('sssiss', $queueId, $queueNumber, $user['id'], $people, $createdAt, $serviceDateTime);
    $insert->execute();
    $insert->close();

    $conn->commit();
    jsonResponse(['success' => true, 'id' => $queueId, 'queue_number' => $queueNumber, 'queues_ahead' => $queuedAhead, 'estimated_wait_minutes' => $queuedAhead * $minutesPerQueue]);
} catch (RuntimeException $error) {
    $conn->rollback();
    jsonResponse(['success' => false, 'message' => $error->getMessage()], 422);
} catch (Throwable $error) {
    $conn->rollback();
    error_log('booking: ' . $error->getMessage());
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถจองคิวได้'], 500);
}
