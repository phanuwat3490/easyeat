export const bookingHours = Array.from({ length: 13 }, (_, index) => String(index + 10).padStart(2, '0'));
export const bookingMinutes = ['00', '15', '30', '45'];
export const partySizes = Array.from({ length: 8 }, (_, index) => index + 1);

export function isPastBooking(date: string, hour: string, minute: string, now: Date) {
  return new Date(`${date}T${hour}:${minute}:00`).getTime() < now.getTime();
}

/**
 * ตรวจสอบว่าใกล้ถึงเวลาเข้ารับบริการน้อยกว่า 30 นาทีหรือไม่ (ไม่อนุญาตให้ยกเลิก)
 */
export function isTooCloseToCancel(serviceDatetime: string | null, now: Date) {
  if (!serviceDatetime) return false;
  const diffMinutes = (new Date(serviceDatetime).getTime() - now.getTime()) / 60000;
  return diffMinutes <= 30;
}

/**
 * ตรวจสอบว่าเวลาที่เลือกจองอยู่ใกล้เวลาร้านปิด (22:00 น.) น้อยกว่า 30 นาทีหรือไม่ (ห้ามจองหลัง 21:30 น.)
 */
export function isTooCloseToClosing(hour: string, minute: string) {
  const selectedHour = parseInt(hour, 10);
  const selectedMinute = parseInt(minute, 10);
  // ร้านปิด 22:00 น. เวลาปิดร้านเป็นนาทีตั้งแต่เที่ยงคืน = 22 * 60 = 1320
  // ก่อนปิด 30 นาที คือ 21:30 น. = 21 * 60 + 30 = 1290 นาที
  const selectedTotalMinutes = selectedHour * 60 + selectedMinute;
  const closingLimitMinutes = 21 * 60 + 30; // 21:30 น.

  return selectedTotalMinutes > closingLimitMinutes;
}

export function passwordsMatch(password: string, confirmation: string) { 
  return !password || password === confirmation; 
}