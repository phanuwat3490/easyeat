<?php
declare(strict_types=1);
require 'db.php';
requireAdmin();

$limit = min(100, max(1, (int)($_GET['limit'] ?? 30)));
$result = $conn->query("SELECT a.audit_id, a.created_at, a.action, a.old_status, a.new_status, a.old_service_datetime, a.new_service_datetime, q.queue_number, CONCAT(ad.firstname, ' ', ad.lastname) AS admin_name FROM queue_audit_log a JOIN queue q ON q.queue_id = a.queue_id JOIN admin ad ON ad.admin_id = a.admin_id ORDER BY a.created_at DESC, a.audit_id DESC LIMIT $limit");
$items = [];
while ($result && ($row = $result->fetch_assoc())) $items[] = $row;
jsonResponse(['success' => true, 'items' => $items]);
