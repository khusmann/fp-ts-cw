// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/ReadonlyArray';
import * as NEA from 'fp-ts/ReadonlyNonEmptyArray';
import * as R from 'fp-ts/ReadonlyRecord';
import * as M from 'fp-ts/ReadonlyMap';
import { pipe } from 'fp-ts/function';

import { Semigroup } from 'fp-ts/Semigroup';

import { match, P } from 'ts-pattern';

// parser-ts
import { parser, char, stream, string } from 'parser-ts';

import { CHAR_LOOKUP, PROSIGN_LOOKUP, LETTER_SEP, WORD_SEP, TONE_SEP, DIT, DAH } from './constants2';

import type { ToneSeq, Tone } from './constants2';

const joinToneSeqSemi = (sep: Tone): Semigroup<ToneSeq>=> ({
  concat: (x, y) => pipe(
    x,
    NEA.concat([sep]),
    NEA.concat(y),
  )
})


const lookupProsign = (s: string): O.Option<ToneSeq> => pipe(
    PROSIGN_LOOKUP,
    R.lookup(s),
);

const lookupSymbol = (s: string): O.Option<ToneSeq> => pipe(
    CHAR_LOOKUP,
    R.lookup(s),
);

const prosignParser = pipe(
    parser.between(char.char("<"), char.char(">"))(char.many1(char.upper)),
    parser.chain((s) => pipe(
        lookupProsign(`<${s}>`),
        O.fold(
            () => parser.fail<string>(),
            (cw) => parser.succeed(cw),
        ),
    )),
);

const charParser = pipe(
    parser.item<string>(),
    parser.chain((s) => pipe(
        lookupSymbol(s.toUpperCase()),
        O.fold(
            () => parser.fail<string>(),
            (cw) => parser.succeed(cw),
        )
    )),
);

const wordParser = pipe(
    parser.many1(charParser),
    parser.map(
        NEA.foldMap(joinToneSeqSemi(LETTER_SEP))((s) => s),
    ),
);

const messageParser = pipe(
    parser.sepBy1(parser.many1(char.char(' ')), parser.either(prosignParser, () => wordParser)),
    parser.map(NEA.foldMap(joinToneSeqSemi(WORD_SEP))((s) => s)),
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
    A.reduce('', (acc, t) => acc + t),
)