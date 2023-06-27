import { readerEither as RE } from 'fp-ts';
import { apply, flow } from 'fp-ts/function';

import { stringify } from './ast';
import { parseTextStr, parseCodeStr, DEFAULT_PARSE_TEXT_SETTINGS, DEFAULT_PARSE_CODE_SETTINGS } from './parser';

describe('parseText', () => {
  const parseText = flow(parseTextStr, RE.map(stringify), apply(DEFAULT_PARSE_TEXT_SETTINGS));

  it('decodes valid text with prosigns', () => expect(parseText('AB <BT> C')).toEqualRight('AB <BT> C'));

  it('catches invalid prosigns', () => expect(parseText('AB <BT C')).toBeLeft());

  it('catches invalid characters', () => expect(parseText('AB <BT> C |')).toBeLeft());
});

describe('parseCode', () => {
  const parseCode = flow(parseCodeStr, RE.map(stringify), apply(DEFAULT_PARSE_CODE_SETTINGS));

  it('decodes valid code with prosigns', () => expect(parseCode('.- -... / -...- / -.-.')).toEqualRight('AB <BT> C'));

  it('catches invalid characters', () => expect(parseCode('.- -... / -...- / -.-. |')).toBeLeft());

  it('catches invalid tokens', () => expect(parseCode('.- -... / -...- / ..-.-.-')).toBeLeft());
});
