<?php
declare(strict_types=1);
require 'db.php';

$user = requireLogin();
if ($user['role'] !== 'member') {
    jsonResponse(['success' => false, 'message' => 'สำหรับบัญชีสมาชิกเท่านั้น'], 403);
}

$active = $conn->prepare("SELECT q.queue_id AS id, q.queue_number, CONCAT(m.firstname, ' ', m.lastname) AS customer_name, q.number_of_people AS people, q.service_datetime, q.status_id AS status
    FROM queue q JOIN member m ON m.member_id = q.member_id
    WHERE q.member_id = ? AND q.status_id IN ('S1', 'S2', 'S5')
    ORDER BY q.service_datetime ASC LIMIT 1");
$active->bind_param('s', $user['id']);
$active->execute();
$current = $active->get_result()->fetch_assoc();
$active->close();

if ($current) {
    $current['date'] = substr($current['service_datetime'], 0, 10);
    $current['time'] = substr($current['service_datetime'], 11, 5);
    unset($current['service_datetime']);
}

$history = $conn->prepare("SELECT q.queue_id AS id, q.queue_number, CONCAT(m.firstname, ' ', m.lastname) AS customer_name, q.number_of_people AS people, q.service_datetime, q.status_id AS status
    FROM queue q JOIN member m ON m.member_id = q.member_id
    WHERE q.member_id = ? AND q.status_id IN ('S3', 'S4')
    ORDER BY q.service_datetime DESC");
$history->bind_param('s', $user['id']);
$history->execute();
$rows = $history->get_result();
$queues = [];
while ($row = $rows->fetch_assoc()) {
    $row['date'] = substr($row['service_datetime'], 0, 10);
    $row['time'] = substr($row['service_datetime'], 11, 5);
    unset($row['service_datetime']);
    $queues[] = $row;
}
$history->close();

$menus = [];
$menuResult = $conn->query("SELECT menu_id AS id, menu_name AS name, price, category, image, (menu_status = 'available') AS is_active FROM menu WHERE menu_status = 'available' ORDER BY menu_id DESC");
while ($row = $menuResult->fetch_assoc()) {
    $row['price'] = (float)$row['price'];
    $row['is_active'] = (bool)$row['is_active'];
    $menus[] = $row;
}

jsonResponse(['success' => true, 'currentQueue' => $current, 'history' => $queues, 'menuItems' => $menus]);
