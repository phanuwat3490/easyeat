<?php
declare(strict_types=1);
require 'db.php';

// ต้องล็อกอินก่อน: แอดมินเห็นทุกคิว, สมาชิกเห็นเฉพาะคิวของตัวเอง
$user = requireLogin();
$isAdmin = ($user['role'] ?? '') === 'admin';
$memberId = $isAdmin ? trim((string)($_GET['member_id'] ?? '')) : (string)$user['id'];

// จัดเรียงลำดับ: ให้ความสำคัญกับสถานะที่ต้องดำเนินการก่อน (S1, S2, S5) ตามด้วยเวลาเข้ารับบริการ
$sql = "SELECT q.queue_id AS id, q.queue_number, CONCAT(m.firstname, ' ', m.lastname) AS customer_name,
        q.number_of_people AS people, q.service_datetime, q.status_id AS status
        FROM queue q
        LEFT JOIN member m ON q.member_id = m.member_id "
     . ($memberId !== '' ? 'WHERE q.member_id = ? ' : '')
     . "ORDER BY 
        FIELD(q.status_id, 'S1', 'S2', 'S5', 'S3', 'S4'), 
        q.service_datetime ASC, 
        q.queue_id DESC";

$stmt = $conn->prepare($sql);
if ($memberId !== '') {
    $stmt->bind_param('s', $memberId);
}
$stmt->execute();
$result = $stmt->get_result();

$queues = [];
while ($row = $result->fetch_assoc()) {
    $datetime = new DateTime($row['service_datetime']);
    $row['date'] = $datetime->format('Y-m-d');
    $row['time'] = $datetime->format('H:i');
    $queues[] = $row;
}
$stmt->close();

jsonResponse($queues);