/** Store Thai mobile numbers in one local format: 0 followed by 9 digits. */
export function normalizeThaiPhone(value: string): string {
  const compact = value.replace(/[\s()-]/g, '');
  if (compact.startsWith('+66')) return `0${compact.slice(3).replace(/\D/g, '').slice(0, 9)}`;
  return compact.replace(/\D/g, '').slice(0, 10);
}

export function isThaiPhone(value: string): boolean {
  return /^0\d{9}$/.test(value);
}
