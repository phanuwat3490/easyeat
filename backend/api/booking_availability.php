<?php
declare(strict_types=1);
require 'db.php';

$user = requireLogin();
if (($user['role'] ?? '') !== 'member') {
    jsonResponse(['success' => false, 'message' => 'สำหรับบัญชีสมาชิกเท่านั้น'], 403);
}

$date = trim((string)($_GET['date'] ?? ''));
$time = trim((string)($_GET['time'] ?? ''));
$serviceDateTime = "$date $time:00";
if (!isValidServiceDateTime($serviceDateTime)) {
    jsonResponse(['success' => false, 'message' => 'วันหรือเวลาไม่ถูกต้อง'], 422);
}

$restaurant = $conn->query('SELECT open_time, close_time, max_queues_per_slot, avg_minutes_per_queue FROM restaurant ORDER BY restaurant_id LIMIT 1');
$settings = $restaurant ? $restaurant->fetch_assoc() : null;
$openTime = substr((string)($settings['open_time'] ?? '10:00:00'), 0, 5);
$closeTime = substr((string)($settings['close_time'] ?? '22:00:00'), 0, 5);
$lastBookableTime = date('H:i', strtotime($closeTime . ':00') - (30 * 60));
if (!preg_match('/^\d{2}:(00|15|30|45)$/', $time) || $time < $openTime || $time > $lastBookableTime) {
    jsonResponse([
        'success' => true,
        'available' => false,
        'queued' => 0,
        'capacity' => 0,
        'remaining' => 0,
        'estimated_wait_minutes' => 0,
        'message' => "เลือกเวลาได้ตั้งแต่ $openTime ถึง $lastBookableTime น. (ก่อนร้านปิด 30 นาที)",
    ]);
}
$capacity = max(1, (int)($settings['max_queues_per_slot'] ?? 10));
$minutesPerQueue = max(1, (int)($settings['avg_minutes_per_queue'] ?? 4));
$slot = $conn->prepare("SELECT COUNT(*) AS queued FROM queue WHERE service_datetime = ? AND status_id IN ('S1', 'S2', 'S5')");
$slot->bind_param('s', $serviceDateTime);
$slot->execute();
$queued = (int)$slot->get_result()->fetch_assoc()['queued'];
$slot->close();

jsonResponse([
    'success' => true,
    'available' => $queued < $capacity,
    'queued' => $queued,
    'capacity' => $capacity,
    'remaining' => max(0, $capacity - $queued),
    'estimated_wait_minutes' => $queued * $minutesPerQueue,
]);
