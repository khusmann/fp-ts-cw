import { pipe } from 'fp-ts/function';
import { parser as P, char as C, string as S } from 'parser-ts';

import * as ast from './ast';
import { parserFromOption, PeitherW, RNAintersperseW } from './util';

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
    P.chain(() => P.succeed(ast.WORD_SPACE))
  );

const parseToken = (dot: string, dash: string) =>
  pipe(
    S.many1(P.either(C.char(dot), () => C.char(dash))),
    P.map(ast.lookupTokenFromCode(dot, dash)),
    P.chain(parserFromOption())
  );

const parseWord = (tokenParser: P.Parser<string, ast.Token>, tokenSpace: string) =>
  pipe(
    P.sepBy1(P.many(C.char(tokenSpace)), tokenParser),
    P.map(RNAintersperseW(ast.TOKEN_SPACE)),
    P.map(ast.word)
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
      P.map(ast.message)
    ),
    'valid character or prosign'
  );
