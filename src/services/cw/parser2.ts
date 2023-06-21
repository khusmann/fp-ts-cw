import * as O from 'fp-ts/Option';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { pipe } from 'fp-ts/function';
import { parser, char, string } from 'parser-ts';

import {
  CW_TOKEN_LOOKUP,
  WORD_SPACE,
  word,
  message,
  TOKEN_SPACE,
  CW_CODE_LOOKUP,
} from './constants2';
import type { Word, WordSpace, TokenSpace, Token } from './constants2';

type ParseTextSettings = {
  readonly prosignStart: string;
  readonly prosignEnd: string;
  readonly wordSpace: string;
};

export const DEFAULT_PARSE_TEXT_SETTINGS: ParseTextSettings = {
  prosignStart: '<',
  prosignEnd: '>',
  wordSpace: ' ',
};

const parserFromOption = <I>(): (<O>(o: O.Option<O>) => parser.Parser<I, O>) =>
  O.fold(
    () => parser.fail<I>(),
    (o) => parser.succeed(o)
  );

const parseProsignText = (prosignStart: string, prosignEnd: string) =>
  pipe(
    parser.between(char.char(prosignStart), char.char(prosignEnd))(char.many1(char.upper)),
    parser.map((s) => RR.lookup(s)(CW_TOKEN_LOOKUP)),
    parser.chain(parserFromOption())
  );

const parseCharacterText = pipe(
  parser.item<string>(),
  parser.map((s) => RR.lookup(s.toUpperCase())(CW_TOKEN_LOOKUP)),
  parser.chain(parserFromOption())
);

const parseWordSpaceText = (wordSpace: string) =>
  pipe(
    char.char(wordSpace),
    parser.map(() => WORD_SPACE)
  );

const parseWordText = (prosignStart: string, prosignEnd: string) =>
  pipe(
    parser.many1(
      parser.either<string, Token>(
        parseProsignText(prosignStart, prosignEnd),
        () => parseCharacterText
      )
    ),
    parser.map(RNA.intersperse<Token | TokenSpace>(TOKEN_SPACE)),
    parser.map(word)
  );

export const parseMessageText = (settings = DEFAULT_PARSE_TEXT_SETTINGS) =>
  parser.expected(
    pipe(
      parser.many1Till(
        parser.either<string, Word | WordSpace>(
          parseWordText(settings.prosignStart, settings.prosignEnd),
          () => parseWordSpaceText(settings.wordSpace)
        ),
        parser.eof()
      ),
      parser.map(message)
    ),
    'valid character or prosign'
  );

const parseWordSpaceCode = pipe(
  char.char('/'),
  parser.chain(() => parser.succeed(WORD_SPACE))
);

const parseTokenCode = pipe(
  string.many1(parser.either(char.char('.'), () => char.char('-'))),
  parser.map((s) => RR.lookup(s)(CW_CODE_LOOKUP)),
  parser.chain(parserFromOption())
);

const parseWordCode = pipe(
  parser.sepBy1(parser.many(char.space), parseTokenCode),
  parser.map(RNA.intersperse<Token | TokenSpace>(TOKEN_SPACE)),
  parser.map(word)
);

export const parseMessageCode = parser.expected(
  pipe(
    parser.many1Till(
      parser.surroundedBy(parser.many(char.space))(
        parser.either<string, Word | WordSpace>(parseWordCode, () => parseWordSpaceCode)
      ),
      parser.eof()
    ),
    parser.map(message)
  ),
  'valid character or prosign'
);
