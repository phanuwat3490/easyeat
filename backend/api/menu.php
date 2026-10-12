<?php
declare(strict_types=1);
require 'db.php';

// เมนูเป็นข้อมูลสาธารณะ (หน้าหลักและหน้าจองใช้แสดงผล) ไม่ต้องล็อกอิน
$result = $conn->query("SELECT menu_id AS id, menu_name AS name, price, category, image, (menu_status = 'available') AS is_active FROM menu ORDER BY menu_id DESC");

$menus = [];
while ($result && ($row = $result->fetch_assoc())) {
    $row['price'] = (float)$row['price'];
    $row['is_active'] = (bool)$row['is_active'];
    $row['category'] = !empty($row['category']) ? $row['category'] : 'ทั่วไป';
    $menus[] = $row;
}

jsonResponse($menus);
