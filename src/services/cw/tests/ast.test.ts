import {
  stringify,
  stringifyCode,
  stringifyTones,
  message,
  word,
  CW_TOKEN_LOOKUP,
  TOKEN_SPACE,
  WORD_SPACE,
} from '../ast';

describe('stringify', () => {
  const m = message([word([CW_TOKEN_LOOKUP['A'], TOKEN_SPACE, CW_TOKEN_LOOKUP['E']]), WORD_SPACE]);

  it('outputs tokens', () => expect(stringify(m)).toBe('AE '));

  it('outputs code', () => expect(stringifyCode(m)).toBe('.- . / '));

  it('outputs tones', () => expect(stringifyTones(m)).toBe('.|-/. '));
});
