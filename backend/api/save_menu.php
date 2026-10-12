<?php
declare(strict_types=1);
require 'db.php';
requireAdmin();
requireCsrf();

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['name']) || !isset($data['price'])) {
    echo json_encode(["success" => false, "message" => "กรุณากรอกข้อมูลให้ครบถ้วน"]);
    exit();
}

$id = $data['id'] ?? '';
$name = $data['name'] ?? '';
$category = $data['category'] ?? 'ทั่วไป';
$price = (float)($data['price'] ?? 0);
$image = $data['image'] ?? '';
$is_active = isset($data['is_active']) && $data['is_active'] ? 'available' : 'sold_out';

if (!is_string($name) || trim($name) === '' || mb_strlen($name) > 100 || !is_string($category) || mb_strlen($category) > 50 || $price < 0 || $price > 999999.99) {
    jsonResponse(['success' => false, 'message' => 'ข้อมูลเมนูไม่ถูกต้อง'], 422);
}

// จัดการแปลง Base64 หากมีการอัปโหลดรูปภาพใหม่
if (!empty($image) && strpos($image, 'data:image/') === 0) {
    $imageParts = explode(',', $image);
    if (count($imageParts) > 1) {
        $decodedImage = base64_decode($imageParts[1]);
        $imageInfo = $decodedImage === false ? false : @getimagesizefromstring($decodedImage);
        $allowedTypes = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
        if ($imageInfo !== false && strlen($decodedImage) <= 5 * 1024 * 1024 && isset($allowedTypes[$imageInfo[2]])) {
            $uploadDir = __DIR__ . '/uploads/';
            if (!file_exists($uploadDir)) {
                @mkdir($uploadDir, 0777, true);
            }
            $filename = 'uploads/menu_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $allowedTypes[$imageInfo[2]];
            $filePath = __DIR__ . '/' . $filename;
            if (@file_put_contents($filePath, $decodedImage)) {
                $image = $filename;
            }
        } else {
            jsonResponse(['success' => false, 'message' => 'รูปภาพต้องเป็น JPEG, PNG หรือ WebP และมีขนาดไม่เกิน 5 MB'], 422);
        }
    }
} else if ($image === '' && !empty($id)) {
    // กรณีผู้ใช้กดลบรูปภาพออก ให้เซ็ตค่าเป็นค่าว่างจริง ๆ
    $image = '';
} else if (empty($image) && !empty($id)) {
    $old = $conn->prepare('SELECT image FROM menu WHERE menu_id = ?');
    $old->bind_param('s', $id);
    $old->execute();
    $resOld = $old->get_result();
    if ($rowOld = $resOld->fetch_assoc()) {
        $image = $rowOld['image'];
    }
    $old->close();
}

if (!empty($id)) {
    $sql = "UPDATE menu SET menu_name = ?, category = ?, price = ?, image = ?, menu_status = ? WHERE menu_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdsss", $name, $category, $price, $image, $is_active, $id);
} else {
    $resId = $conn->query("SELECT menu_id FROM menu ORDER BY menu_id DESC LIMIT 1");
    $nextId = "MN001";
    if ($resId && $rowId = $resId->fetch_assoc()) {
        $num = (int)str_replace("MN", "", $rowId['menu_id']) + 1;
        $nextId = "MN" . sprintf("%03d", $num);
    }

    $sql = "INSERT INTO menu (menu_id, menu_name, category, price, image, menu_status) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssdss", $nextId, $name, $category, $price, $image, $is_active);
}

if ($stmt && $stmt->execute()) {
    echo json_encode(["success" => true, "message" => "บันทึกข้อมูลเมนูสำเร็จ"]);
} else {
    echo json_encode(["success" => false, "message" => "เกิดข้อผิดพลาดฐานข้อมูล: " . ($conn->error ?: 'Unknown error')]);
}

if (isset($stmt)) $stmt->close();
$conn->close();
?>
