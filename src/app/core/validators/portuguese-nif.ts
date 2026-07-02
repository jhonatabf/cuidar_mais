export function normalizePortugueseNif(value: string): string {
  return value.replace(/\s+/g, '');
}

export function isValidPortugueseNif(value: string): boolean {
  const nif = normalizePortugueseNif(value);

  if (!/^(?:[12356789]\d{8}|45\d{7})$/.test(nif)) {
    return false;
  }

  const digits = [...nif].map(Number);
  const weightedSum = digits
    .slice(0, 8)
    .reduce((sum, digit, index) => sum + digit * (9 - index), 0);
  const remainder = 11 - (weightedSum % 11);
  const checkDigit = remainder >= 10 ? 0 : remainder;

  return digits[8] === checkDigit;
}
