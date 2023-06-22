import { pipe } from 'fp-ts/function';
import { parser as P, char as C } from 'parser-ts';

import * as ast from './ast';
import { parserFromOption, PeitherW, RNAintersperseW } from './util';

const prosignStart = C.char('<');
const prosignEnd = C.char('>');
const wordSpace = C.char(' ');

const parseProsign = pipe(
  P.between(prosignStart, prosignEnd)(C.many1(C.upper)),
  P.map(ast.lookupTokenFromText),
  P.chain(parserFromOption())
);

const parseCharacter = pipe(P.item<string>(), P.map(ast.lookupTokenFromText), P.chain(parserFromOption()));

const parseWordSpace = pipe(
  wordSpace,
  P.map(() => ast.WORD_SPACE)
);

const parseWord = (prosignParser: P.Parser<string, ast.Token>, characterParser: P.Parser<string, ast.Token>) =>
  pipe(
    P.many1(PeitherW(prosignParser, () => characterParser)),
    P.map(RNAintersperseW(ast.TOKEN_SPACE)),
    P.map(ast.word)
  );

export const parseMessage = P.expected(
  pipe(
    P.many1Till(pipe(PeitherW(parseWord(parseProsign, parseCharacter), () => parseWordSpace)), P.eof()),
    P.map(ast.message)
  ),
  'valid character or prosign'
);
