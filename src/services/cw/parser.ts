// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/ReadonlyArray';
import * as NEA from 'fp-ts/ReadonlyNonEmptyArray';
import * as R from 'fp-ts/ReadonlyRecord';
import * as M from 'fp-ts/ReadonlyMap';
import { pipe } from 'fp-ts/function';

import { match, P } from 'ts-pattern';

// parser-ts
import { parser, char, stream } from 'parser-ts';

import { CHAR_LOOKUP, PROSIGN_LOOKUP, LETTER_SEP, WORD_SEP, TONE_SEP, DIT, DAH } from './constants';

import type { ToneSeq, Tone } from './constants';

const parserLiftOption = <I, O>(p: parser.Parser<I, O.Option<O>>) => pipe(
    p,
    parser.chain((o) => pipe(
        o,
        O.fold(
            () => parser.fail<I>(),
            (o) => parser.of(o),
        ),
    )),
)

const failIfNotEof = <I, O>(p: parser.Parser<I, O>) => pipe(
    p,
    parser.chain((m) => pipe(
        parser.expected(parser.eof<I>(), "failed to parse to end of input"),
        parser.chain(() => parser.succeed(m)),
    )),
)

const prosignParser = pipe(
    parser.between(char.char("<"), char.char(">"))(char.many1(char.upper)),
    parser.map((s) => R.lookup(`<${s}>`)(PROSIGN_LOOKUP)),
    parserLiftOption,
);

const charParser = pipe(
    parser.item<string>(),
    parser.map((s) => R.lookup(s.toUpperCase())(CHAR_LOOKUP)),
    parserLiftOption,
);

const wordParser = pipe(
    parser.many1(charParser),
    parser.map(
        NEA.intercalate(NEA.getSemigroup<Tone>())(NEA.of(LETTER_SEP))
    ),
);

export const messageParser = pipe(
    parser.sepBy1(parser.many1(char.char(' ')), parser.either(prosignParser, () => wordParser)),
    parser.map(
        NEA.intercalate(NEA.getSemigroup<Tone>())(NEA.of(WORD_SEP))
    ),
    failIfNotEof,
);

export const parseMessage = (s: string) => pipe(
    stream.stream(s.split('')),
    messageParser,
);

export const stringFromToneSeq = (ts: ToneSeq) => pipe(
    ts,
    A.map((t) => (
        match(t)
        .with(LETTER_SEP, () => ' ')
        .with(WORD_SEP, () => ' / ')
        .with(TONE_SEP, () => '')
        .with(P.union(DIT, DAH), (t) => t)
        .exhaustive()
    )),
    A.reduce(S.empty, S.Monoid.concat),
)