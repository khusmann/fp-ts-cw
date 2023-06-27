import { option as O } from 'fp-ts';
import { flow } from 'fp-ts/function';

import {
  stringify,
  stringifyCode,
  stringifyTones,
  message,
  word,
  TOKEN_SPACE,
  WORD_SPACE,
  lookupTokenFromText,
} from '../ast';

describe('stringify', () => {
  const lookup = flow(
    lookupTokenFromText,
    O.getOrElseW(() => TOKEN_SPACE),
  );

  const m = message([word([lookup('A'), TOKEN_SPACE, lookup('E')]), WORD_SPACE]);

  it('outputs tokens', () => expect(stringify(m)).toBe('AE '));

  it('outputs code', () => expect(stringifyCode(m)).toBe('.- . / '));

  it('outputs tones', () => expect(stringifyTones(m)).toBe('.|-/. '));
});
