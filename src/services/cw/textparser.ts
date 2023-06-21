import { pipe } from 'fp-ts/function';
import { parser as P, char as C } from 'parser-ts';

import * as ast from './ast';
import { parserFromOption, PeitherW, RNAintersperseW } from './util';

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
    P.map(ast.lookupTokenFromText),
    P.chain(parserFromOption())
  );

const parseCharacter = pipe(P.item<string>(), P.map(ast.lookupTokenFromText), P.chain(parserFromOption()));

const parseWordSpace = (wordSpace: string) =>
  pipe(
    C.char(wordSpace),
    P.map(() => ast.WORD_SPACE)
  );

const parseWord = (prosignParser: P.Parser<string, ast.Token>, characterParser: P.Parser<string, ast.Token>) =>
  pipe(
    P.many1(P.either<string, ast.Token>(prosignParser, () => characterParser)),
    P.map(RNAintersperseW(ast.TOKEN_SPACE)),
    P.map(ast.word)
  );

export const parseMessage = (settings = DEFAULT_SETTINGS) =>
  P.expected(
    pipe(
      P.many1Till(
        PeitherW(parseWord(parseProsign(settings.prosignStart, settings.prosignEnd), parseCharacter), () =>
          parseWordSpace(settings.wordSpace)
        ),
        P.eof()
      ),
      P.map(ast.message)
    ),
    'valid character or prosign'
  );
