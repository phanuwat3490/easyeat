import { describe, expect, it } from 'vitest';
import { registrationSchema } from '@/components/easy-eat/registration-schema';
const valid = { firstname: 'ทดสอบ', lastname: 'สมาชิก', email: 'member@example.com', phone: '0812345678', password: 'abcd1234', confirmPassword: 'abcd1234' };
describe('กฎสมัครสมาชิกจาก Register.jsx', () => {
  it('requires at least 8 password characters', () => { expect(registrationSchema.safeParse({...valid,password:'abc1234',confirmPassword:'abc1234'}).success).toBe(false); expect(registrationSchema.safeParse(valid).success).toBe(true); });
  it('requires an English letter', () => {expect(registrationSchema.safeParse({...valid,password:'12345678',confirmPassword:'12345678'}).success).toBe(false);});
  it('requires a digit', () => {expect(registrationSchema.safeParse({...valid,password:'abcdefgh',confirmPassword:'abcdefgh'}).success).toBe(false);});
  it('requires matching confirmation', () => {expect(registrationSchema.safeParse({...valid,confirmPassword:'abcd5678'}).success).toBe(false);});
  it('requires exactly 10 phone digits', () => {for (const phone of ['081234567','08123456789','081234567a']) expect(registrationSchema.safeParse({...valid,phone}).success).toBe(false);expect(registrationSchema.safeParse(valid).success).toBe(true);});
  it('rejects empty names and invalid email', () => {expect(registrationSchema.safeParse({...valid,firstname:' '}).success).toBe(false);expect(registrationSchema.safeParse({...valid,email:'invalid'}).success).toBe(false);});
});
