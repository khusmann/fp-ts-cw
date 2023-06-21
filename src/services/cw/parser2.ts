import * as RR from 'fp-ts/ReadonlyRecord';
import { pipe } from 'fp-ts/function';
import { parser as P, char as C, string as S } from 'parser-ts';

import {
  CW_TOKEN_LOOKUP,
  WORD_SPACE,
  word,
  message,
  TOKEN_SPACE,
  CW_CODE_LOOKUP,
} from './constants2';
import type { Token } from './constants2';
import { parserFromOption, PeitherW, RNAintersperseW } from './util';

type ParseTextSettings = {
  readonly prosignStart: string;
  readonly prosignEnd: string;
  readonly wordSpace: string;
};

type ParseCodeSettings = {
  readonly dot: string;
  readonly dash: string;
  readonly tokenSpace: string;
  readonly wordSpace: string;
};

export const DEFAULT_PARSE_TEXT_SETTINGS: ParseTextSettings = {
  prosignStart: '<',
  prosignEnd: '>',
  wordSpace: ' ',
};

export const DEFAULT_PARSE_CODE_SETTINGS: ParseCodeSettings = {
  dot: '.',
  dash: '-',
  tokenSpace: ' ',
  wordSpace: '/',
};

const parseProsignText = (prosignStart: string, prosignEnd: string) =>
  pipe(
    P.between(C.char(prosignStart), C.char(prosignEnd))(C.many1(C.upper)),
    P.map((s) => RR.lookup(s)(CW_TOKEN_LOOKUP)),
    P.chain(parserFromOption())
  );

const parseCharacterText = pipe(
  P.item<string>(),
  P.map((s) => RR.lookup(s.toUpperCase())(CW_TOKEN_LOOKUP)),
  P.chain(parserFromOption())
);

const parseWordSpaceText = (wordSpace: string) =>
  pipe(
    C.char(wordSpace),
    P.map(() => WORD_SPACE)
  );

const parseWordText = (
  prosignParser: P.Parser<string, Token>,
  characterParser: P.Parser<string, Token>
) =>
  pipe(
    P.many1(P.either<string, Token>(prosignParser, () => characterParser)),
    P.map(RNAintersperseW(TOKEN_SPACE)),
    P.map(word)
  );

export const parseMessageText = (settings = DEFAULT_PARSE_TEXT_SETTINGS) =>
  P.expected(
    pipe(
      P.many1Till(
        PeitherW(
          parseWordText(
            parseProsignText(settings.prosignStart, settings.prosignEnd),
            parseCharacterText
          ),
          () => parseWordSpaceText(settings.wordSpace)
        ),
        P.eof()
      ),
      P.map(message)
    ),
    'valid character or prosign'
  );

const parseWordSpaceCode = (wordSpace: string) =>
  pipe(
    C.char(wordSpace),
    P.chain(() => P.succeed(WORD_SPACE))
  );

const parseTokenCode = (dot: string, dash: string) =>
  pipe(
    S.many1(P.either(C.char('.'), () => C.char('-'))),
    P.map((s) => RR.lookup(s)(CW_CODE_LOOKUP)),
    P.chain(parserFromOption())
  );

const parseWordCode = (tokenCodeParser: P.Parser<string, Token>, tokenSpace: string) =>
  pipe(
    P.sepBy1(P.many(C.char(tokenSpace)), tokenCodeParser),
    P.map(RNAintersperseW(TOKEN_SPACE)),
    P.map(word)
  );

export const parseMessageCode = (config = DEFAULT_PARSE_CODE_SETTINGS) =>
  P.expected(
    pipe(
      P.many1Till(
        P.surroundedBy(P.many(C.space))(
          PeitherW(parseWordCode(parseTokenCode(config.dot, config.dash), config.tokenSpace), () =>
            parseWordSpaceCode(config.wordSpace)
          )
        ),
        P.eof()
      ),
      P.map(message)
    ),
    'valid character or prosign'
  );
