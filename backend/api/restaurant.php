<?php
declare(strict_types=1);
require 'db.php';

$result = $conn->query('SELECT restaurant_name, open_time, close_time, location, latitude, longitude, phone, max_distance_km, max_queues_per_slot, avg_minutes_per_queue FROM restaurant ORDER BY restaurant_id LIMIT 1');
$restaurant = $result ? $result->fetch_assoc() : null;
if (!$restaurant) jsonResponse(['success' => false, 'message' => 'ไม่พบข้อมูลร้าน'], 404);
jsonResponse(['success' => true, 'restaurant' => $restaurant]);
