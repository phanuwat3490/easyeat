import { z } from 'zod';

export const registrationSchema = z.object({
  firstname: z.string().trim().min(1, 'กรุณากรอกชื่อจริง').max(100, 'ชื่อจริงยาวเกินไป'),
  lastname: z.string().trim().min(1, 'กรุณากรอกนามสกุล').max(100, 'นามสกุลยาวเกินไป'),
  email: z.string().trim().email('กรุณากรอกอีเมลให้ถูกต้อง').max(255),
  phone: z.string().regex(/^0\d{9}$/, 'กรุณากรอกเบอร์โทรศัพท์ไทย 10 หลัก โดยขึ้นต้นด้วย 0'),
  password: z.string().max(128).regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวอักษรภาษาอังกฤษกับตัวเลข'),
  confirmPassword: z.string().max(128),
}).refine(data => data.password === data.confirmPassword, {
  path: ['confirmPassword'], message: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
});
export type RegistrationDetails = z.infer<typeof registrationSchema>;
