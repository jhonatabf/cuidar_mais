import { describe, expect, it } from 'vitest';

import { isValidPortugueseNif, normalizePortugueseNif } from './portuguese-nif';

describe('Portuguese NIF validator', () => {
  it.each(['123456789', '245716203', '501964843', '100000002'])(
    'accepts a valid NIF: %s',
    (nif) => {
      expect(isValidPortugueseNif(nif)).toBe(true);
    },
  );

  it.each(['', '12345678', '1234567890', '123456780', '041234567', 'abc456789'])(
    'rejects an invalid NIF: %s',
    (nif) => {
      expect(isValidPortugueseNif(nif)).toBe(false);
    },
  );

  it('normalizes spaces before validation and persistence', () => {
    expect(normalizePortugueseNif('123 456 789')).toBe('123456789');
    expect(isValidPortugueseNif('123 456 789')).toBe(true);
  });
});
