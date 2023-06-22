import * as R from 'fp-ts/Reader';
import * as RT from 'fp-ts/ReaderT';
import { pipe } from 'fp-ts/function';
import { parser as P, char as C, string as S } from 'parser-ts';

import * as ast from './ast';
import { parserFromOption, PeitherW, RNAintersperseW } from './util';

const dot = C.char('.');
const dash = C.char('-');
const wordSpace = C.char('/');
const tokenSpace = C.char(' ');

const parseWordSpace = pipe(
  wordSpace,
  P.chain(() => P.succeed(ast.WORD_SPACE))
);

const parseToken = pipe(
  S.many1(P.either(dot, () => dash)),
  P.map(ast.lookupTokenFromCode),
  P.chain(parserFromOption())
);

const parseWord = (tokenParser: P.Parser<string, ast.Token>) =>
  pipe(P.sepBy1(P.many(tokenSpace), tokenParser), P.map(RNAintersperseW(ast.TOKEN_SPACE)), P.map(ast.word));

export const parseMessage = P.expected(
  pipe(
    P.many1Till(P.surroundedBy(P.many(C.space))(PeitherW(parseWord(parseToken), () => parseWordSpace)), P.eof()),
    P.map(ast.message)
  ),
  'valid character or prosign'
);
