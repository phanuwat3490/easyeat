import { describe, expect, it } from 'vitest';
import { bookingHours, bookingMinutes, isPastBooking, isTooCloseToCancel, partySizes, passwordsMatch } from '@/components/easy-eat/booking-rules';
describe('Original Easy Eat booking rules', () => {
  it('retains booking hours 10 through 22 inclusive', () => {expect(bookingHours).toEqual(['10','11','12','13','14','15','16','17','18','19','20','21','22']);});
  it('retains 15 minute slots', () => {expect(bookingMinutes).toEqual(['00','15','30','45']);});
  it('retains party sizes 1 through 8', () => {expect(partySizes).toEqual([1,2,3,4,5,6,7,8]);});
  it('rejects past booking times but allows future ones', () => {const now = new Date('2026-10-10T11:00:00');expect(isPastBooking('2026-10-10','10','45',now)).toBe(true);expect(isPastBooking('2026-10-10','11','15',now)).toBe(false);});
  it('blocks cancellation below 30 minutes but allows exactly 30', () => {const now = new Date('2026-10-10T11:00:00');expect(isTooCloseToCancel('2026-10-10T11:29:59',now)).toBe(true);expect(isTooCloseToCancel('2026-10-10T11:30:00',now)).toBe(false);});
  it('requires new password confirmation to match', () => {expect(passwordsMatch('new-pass','different')).toBe(false);expect(passwordsMatch('new-pass','new-pass')).toBe(true);expect(passwordsMatch('','')).toBe(true);});
});