import { readerEither as RE } from 'fp-ts';
import { pipe, apply } from 'fp-ts/function';

import { stringify, stringifyCode } from './ast';
import { parseTextStr, parseCodeStr, DEFAULT_PARSE_TEXT_SETTINGS, DEFAULT_PARSE_CODE_SETTINGS } from './parser';

describe('parseText', () => {
  it('decodes valid text with prosigns', () =>
    pipe('AB <BT> C', parseTextStr, RE.map(stringify), apply(DEFAULT_PARSE_TEXT_SETTINGS), expect).toEqualRight(
      'AB <BT> C',
    ));

  it('catches invalid prosigns', () =>
    pipe('AB <BT C', parseTextStr, RE.map(stringify), apply(DEFAULT_PARSE_TEXT_SETTINGS), expect).toBeLeft());

  it('catches invalid characters', () =>
    pipe('AB <BT> | C', parseTextStr, RE.map(stringify), apply(DEFAULT_PARSE_TEXT_SETTINGS), expect).toBeLeft());

  it('translates text to code', () =>
    pipe('AB <BT> C', parseTextStr, RE.map(stringifyCode), apply(DEFAULT_PARSE_TEXT_SETTINGS), expect).toEqualRight(
      '.- -... / -...- / -.-.',
    ));
});

describe('parseCode', () => {
  it('decodes valid code with prosigns', () =>
    pipe(
      '.- -... / -...- / -.-.',
      parseCodeStr,
      RE.map(stringify),
      apply(DEFAULT_PARSE_CODE_SETTINGS),
      expect,
    ).toEqualRight('AB <BT> C'));

  it('catches invalid characters', () =>
    pipe(
      '.- -... / -...- / -.-. |',
      parseCodeStr,
      RE.map(stringify),
      apply(DEFAULT_PARSE_CODE_SETTINGS),
      expect,
    ).toBeLeft());

  it('catches invalid tokens', () =>
    pipe(
      '.- -... / -...- / ..-.-.-',
      parseCodeStr,
      RE.map(stringify),
      apply(DEFAULT_PARSE_CODE_SETTINGS),
      expect,
    ).toBeLeft());
});
