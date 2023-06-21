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

export namespace TextParser {
  export type Settings = {
    readonly prosignStart: string;
    readonly prosignEnd: string;
    readonly wordSpace: string;
  };

  export const DEFAULT_SETTINGS: Settings = {
    prosignStart: '<',
    prosignEnd: '>',
    wordSpace: ' ',
  };

  const parseProsign = (prosignStart: string, prosignEnd: string) =>
    pipe(
      P.between(C.char(prosignStart), C.char(prosignEnd))(C.many1(C.upper)),
      P.map((s) => RR.lookup(s)(CW_TOKEN_LOOKUP)),
      P.chain(parserFromOption())
    );

  const parseCharacter = pipe(
    P.item<string>(),
    P.map((s) => RR.lookup(s.toUpperCase())(CW_TOKEN_LOOKUP)),
    P.chain(parserFromOption())
  );

  const parseWordSpace = (wordSpace: string) =>
    pipe(
      C.char(wordSpace),
      P.map(() => WORD_SPACE)
    );

  const parseWord = (
    prosignParser: P.Parser<string, Token>,
    characterParser: P.Parser<string, Token>
  ) =>
    pipe(
      P.many1(P.either<string, Token>(prosignParser, () => characterParser)),
      P.map(RNAintersperseW(TOKEN_SPACE)),
      P.map(word)
    );

  export const parseMessage = (settings = DEFAULT_SETTINGS) =>
    P.expected(
      pipe(
        P.many1Till(
          PeitherW(
            parseWord(parseProsign(settings.prosignStart, settings.prosignEnd), parseCharacter),
            () => parseWordSpace(settings.wordSpace)
          ),
          P.eof()
        ),
        P.map(message)
      ),
      'valid character or prosign'
    );
}

export namespace CodeParser {
  type Settings = {
    readonly dot: string;
    readonly dash: string;
    readonly tokenSpace: string;
    readonly wordSpace: string;
  };

  export const DEFAULT_SETTINGS: Settings = {
    dot: '.',
    dash: '-',
    tokenSpace: ' ',
    wordSpace: '/',
  };

  const parseWordSpace = (wordSpace: string) =>
    pipe(
      C.char(wordSpace),
      P.chain(() => P.succeed(WORD_SPACE))
    );

  const parseToken = (dot: string, dash: string) =>
    pipe(
      S.many1(P.either(C.char(dot), () => C.char(dash))),
      P.map((s) => RR.lookup(s)(CW_CODE_LOOKUP)),
      P.chain(parserFromOption())
    );

  const parseWord = (tokenParser: P.Parser<string, Token>, tokenSpace: string) =>
    pipe(
      P.sepBy1(P.many(C.char(tokenSpace)), tokenParser),
      P.map(RNAintersperseW(TOKEN_SPACE)),
      P.map(word)
    );

  export const parseMessage = (config = DEFAULT_SETTINGS) =>
    P.expected(
      pipe(
        P.many1Till(
          P.surroundedBy(P.many(C.space))(
            PeitherW(parseWord(parseToken(config.dot, config.dash), config.tokenSpace), () =>
              parseWordSpace(config.wordSpace)
            )
          ),
          P.eof()
        ),
        P.map(message)
      ),
      'valid character or prosign'
    );
}
