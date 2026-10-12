<?php
declare(strict_types=1);
require 'db.php';
requireAdmin();

$from = trim((string)($_GET['from'] ?? date('Y-m-01')));
$to = trim((string)($_GET['to'] ?? date('Y-m-d')));
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to) || $from > $to) {
    jsonResponse(['success' => false, 'message' => 'ช่วงวันที่ไม่ถูกต้อง'], 422);
}
$fromDateTime = "$from 00:00:00";
$toDateTime = "$to 23:59:59";

$statusReport = [];
$status = $conn->prepare("SELECT qs.status_id AS status, COUNT(q.queue_id) AS count
    FROM queue_status qs
    LEFT JOIN queue q ON q.status_id = qs.status_id AND q.service_datetime BETWEEN ? AND ?
    GROUP BY qs.status_id
    ORDER BY qs.status_id");
$status->bind_param('ss', $fromDateTime, $toDateTime);
$status->execute();
$statusResult = $status->get_result();
if ($statusResult === false) {
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถดึงสรุปสถานะคิวได้'], 500);
}
while ($row = $statusResult->fetch_assoc()) {
    $statusReport[] = ['status' => $row['status'], 'count' => (int)$row['count']];
}

$dailyReport = [];
$daily = $conn->prepare('SELECT DATE(service_datetime) AS date, COUNT(*) AS count FROM queue WHERE service_datetime BETWEEN ? AND ? GROUP BY DATE(service_datetime) ORDER BY date ASC');
$daily->bind_param('ss', $fromDateTime, $toDateTime);
$daily->execute();
$dailyResult = $daily->get_result();
if ($dailyResult === false) {
    jsonResponse(['success' => false, 'message' => 'ไม่สามารถดึงสถิติคิวรายวันได้'], 500);
}
while ($row = $dailyResult->fetch_assoc()) {
    $dailyReport[] = ['date' => $row['date'], 'count' => (int)$row['count']];
}

$peak = $conn->prepare("SELECT DATE_FORMAT(service_datetime, '%H:00') AS hour, COUNT(*) AS count FROM queue WHERE service_datetime BETWEEN ? AND ? GROUP BY HOUR(service_datetime) ORDER BY count DESC, hour ASC LIMIT 5");
$peak->bind_param('ss', $fromDateTime, $toDateTime);
$peak->execute();
$peakResult = $peak->get_result();
$peakHours = [];
while ($row = $peakResult->fetch_assoc()) $peakHours[] = ['hour' => $row['hour'], 'count' => (int)$row['count']];

jsonResponse(['success' => true, 'from' => $from, 'to' => $to, 'statusReport' => $statusReport, 'dailyReport' => $dailyReport, 'peakHours' => $peakHours]);
