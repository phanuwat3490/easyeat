<?php
declare(strict_types=1);
require 'db.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $result = $conn->query('SELECT restaurant_id, restaurant_name, open_time, close_time, location, latitude, longitude, max_distance_km, max_queues_per_slot, avg_minutes_per_queue, phone FROM restaurant ORDER BY restaurant_id LIMIT 1');
    $settings = $result ? $result->fetch_assoc() : null;
    if (!$settings) jsonResponse(['success' => false, 'message' => 'ไม่พบข้อมูลร้าน'], 404);
    jsonResponse(['success' => true, 'settings' => $settings]);
}

requireCsrf();
$data = requestBody();
$id = trim((string)($data['restaurant_id'] ?? 'R001'));
$open = trim((string)($data['open_time'] ?? ''));
$close = trim((string)($data['close_time'] ?? ''));
$location = trim((string)($data['location'] ?? ''));
$phone = trim((string)($data['phone'] ?? ''));
$capacity = filter_var($data['max_queues_per_slot'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
$minutes = filter_var($data['avg_minutes_per_queue'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 120]]);
$latitude = filter_var($data['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
$longitude = filter_var($data['longitude'] ?? null, FILTER_VALIDATE_FLOAT);

if ($location === '' || !preg_match('/^\d{2}:\d{2}:\d{2}$/', $open) || !preg_match('/^\d{2}:\d{2}:\d{2}$/', $close) || !isValidThaiPhone($phone) || $capacity === false || $minutes === false || $latitude === false || $longitude === false || $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180 || $open >= $close) {
    jsonResponse(['success' => false, 'message' => 'ข้อมูลตั้งค่าร้านไม่ถูกต้อง'], 422);
}
$stmt = $conn->prepare('UPDATE restaurant SET open_time = ?, close_time = ?, location = ?, latitude = ?, longitude = ?, phone = ?, max_queues_per_slot = ?, avg_minutes_per_queue = ? WHERE restaurant_id = ?');
$stmt->bind_param('sssddsiis', $open, $close, $location, $latitude, $longitude, $phone, $capacity, $minutes, $id);
$stmt->execute();
$stmt->close();
jsonResponse(['success' => true, 'message' => 'บันทึกการตั้งค่าร้านสำเร็จ']);
