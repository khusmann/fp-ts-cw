import { reader as R, readonlyRecord as RR, readerEither as RE } from 'fp-ts';
import { pipe, apply } from 'fp-ts/function';
import { parser as P, char as C, string as S, stream } from 'parser-ts';
import type { ParseError } from 'parser-ts/ParseResult';

import * as ast from './ast';
import { parserFromOption, PeitherW, RNAintersperseW } from './util';

type CodeParseError = {
  type: 'CodeParseError';
  input: string;
  idx: number;
  expected: string;
};

const codeParseError = ({ expected, input }: ParseError<string>): CodeParseError => ({
  type: 'CodeParseError',
  expected: expected.join(', '),
  input: input.buffer.join(''),
  idx: input.cursor,
});

type ParseCodeSettings = {
  dotC: string;
  dashC: string;
  wordSpaceC: string;
  tokenSpaceC: string;
};

export const DEFAULT_PARSE_CODE_SETTINGS: ParseCodeSettings = {
  dotC: '.',
  dashC: '-',
  wordSpaceC: '/',
  tokenSpaceC: ' ',
};

const codeParser = (settings: ParseCodeSettings) => {
  const { dotC, dashC, wordSpaceC, tokenSpaceC } = RR.map(C.char)(settings);

  const wordSpace = pipe(
    wordSpaceC,
    P.chain(() => P.succeed(ast.WORD_SPACE)),
  );

  const token = pipe(S.many1(P.either(dotC, () => dashC)), P.map(ast.lookupTokenFromCode), P.chain(parserFromOption()));

  const word = (tokenParser: P.Parser<string, ast.Token>) =>
    pipe(P.sepBy1(P.many(tokenSpaceC), tokenParser), P.map(RNAintersperseW(ast.TOKEN_SPACE)), P.map(ast.word));

  const message = P.expected(
    pipe(
      P.many1Till(P.surroundedBy(P.many(C.space))(PeitherW(word(token), () => wordSpace)), P.eof()),
      P.map(ast.message),
    ),
    'valid character or prosign',
  );

  return message;
};

export const parseCodeStr = (str: string) =>
  pipe(
    codeParser,
    R.map(apply(stream.stream(str.split('')))),
    RE.bimap(codeParseError, (s) => s.value),
  );

//////

type ParseTextError = {
  type: 'ParseTextError';
  input: string;
  idx: number;
  expected: string;
};

const textParseError = ({ expected, input }: ParseError<string>): ParseTextError => ({
  type: 'ParseTextError',
  expected: expected.join(', '),
  input: input.buffer.join(''),
  idx: input.cursor,
});

type ParseTextSettings = {
  prosignStartC: string;
  prosignEndC: string;
  wordSpaceC: string;
};

export const DEFAULT_PARSE_TEXT_SETTINGS: ParseTextSettings = {
  prosignStartC: '<',
  prosignEndC: '>',
  wordSpaceC: ' ',
};

const textParser = (settings: ParseTextSettings) => {
  const { prosignStartC, prosignEndC, wordSpaceC } = RR.map(C.char)(settings);

  const prosign = pipe(
    P.between(prosignStartC, prosignEndC)(C.many1(C.upper)),
    P.map(ast.lookupTokenFromText),
    P.chain(parserFromOption()),
  );

  const character = pipe(P.item<string>(), P.map(ast.lookupTokenFromText), P.chain(parserFromOption()));

  const wordSpace = pipe(
    wordSpaceC,
    P.map(() => ast.WORD_SPACE),
  );

  const word = (prosignParser: P.Parser<string, ast.Token>, characterParser: P.Parser<string, ast.Token>) =>
    pipe(
      P.many1(PeitherW(prosignParser, () => characterParser)),
      P.map(RNAintersperseW(ast.TOKEN_SPACE)),
      P.map(ast.word),
    );

  const message = P.expected(
    pipe(P.many1Till(pipe(PeitherW(word(prosign, character), () => wordSpace)), P.eof()), P.map(ast.message)),
    'valid character or prosign',
  );

  return message;
};

export const parseTextStr = (str: string) =>
  pipe(
    textParser,
    R.map(apply(stream.stream(str.split('')))),
    RE.bimap(textParseError, (s) => s.value),
  );
