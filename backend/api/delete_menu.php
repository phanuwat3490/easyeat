<?php
declare(strict_types=1);
require 'db.php';
requireAdmin();
requireCsrf();

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? '';

if (empty($id)) {
    echo json_encode(["success" => false, "message" => "ไม่พบรหัสเมนูที่ต้องการลบ"]);
    exit();
}

// ตรวจสอบและดึงไฟล์รูปภาพเก่ามาลบออกจากเซิร์ฟเวอร์เพื่อความสะอาด
$old = $conn->prepare('SELECT image FROM menu WHERE menu_id = ?');
$old->bind_param('s', $id);
$old->execute();
$resOld = $old->get_result();
if ($rowOld = $resOld->fetch_assoc()) {
    $oldImage = $rowOld['image'];
    if (is_string($oldImage) && str_starts_with($oldImage, 'uploads/') && basename($oldImage) === substr($oldImage, strlen('uploads/')) && file_exists(__DIR__ . '/' . $oldImage)) {
        @unlink(__DIR__ . '/' . $oldImage);
    }
}
$old->close();

// ลบข้อมูลเมนูออกจากฐานข้อมูล
$sql = "DELETE FROM menu WHERE menu_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $id);

if ($stmt && $stmt->execute()) {
    echo json_encode(["success" => true, "message" => "ลบเมนูอาหารสำเร็จ"]);
} else {
    echo json_encode(["success" => false, "message" => "เกิดข้อผิดพลาดในการลบข้อมูล: " . $conn->error]);
}

if (isset($stmt)) $stmt->close();
$conn->close();
?>
