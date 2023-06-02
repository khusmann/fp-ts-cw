// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/ReadonlyArray';
import * as NEA from 'fp-ts/ReadonlyNonEmptyArray';
import * as R from 'fp-ts/ReadonlyRecord';
import * as RD from 'fp-ts/Reader';
import * as M from 'fp-ts/ReadonlyMap';
import { pipe } from 'fp-ts/function';

import { match, P } from 'ts-pattern';

// parser-ts
import { parser, char, stream } from 'parser-ts';

import { CHAR_LOOKUP, PROSIGN_LOOKUP, LETTER_SEP, WORD_SEP, TONE_SEP, DIT, DAH } from './constants';

import type { ToneSeq, Tone } from './constants';

type Pulse = {
    readonly tone: Tone;
    readonly duration: number;
};

type TimingSeq = NEA.ReadonlyNonEmptyArray<Pulse>;

type CwSettings = {
    readonly wpm: number;
    readonly farnsworth: number;
    readonly ews: number;
};

const ditTime = (wpm: number) => 1.2 / wpm;
const dahTime = (wpm: number) => 3 * ditTime(wpm);
const fditTime = (wpm: number, farnsworth: number) => (60 - farnsworth * 31 * ditTime(wpm)) / (farnsworth * (12+7));
const letterSpaceTime = (wpm: number, farnsworth: number) => farnsworth ? 3*fditTime(wpm, farnsworth): 3*ditTime(wpm);
const wordSpaceTime = (wpm: number, farnsworth: number, ews: number) => 7 * (ews + 1) * (farnsworth ? fditTime(wpm, farnsworth): ditTime(wpm));

const pulseFromTone = (t: Tone): RD.Reader<CwSettings, Pulse> => (settings: CwSettings) => match(t)
    .with(DIT, () => ({ tone: DIT, duration: ditTime(settings.wpm) } as const))
    .with(DAH, () => ({ tone: DAH, duration: dahTime(settings.wpm) } as const))
    .with(LETTER_SEP, () => ({ tone: LETTER_SEP, duration: letterSpaceTime(settings.wpm, settings.farnsworth) } as const))
    .with(WORD_SEP, () => ({ tone: WORD_SEP, duration: wordSpaceTime(settings.wpm, settings.farnsworth, settings.ews) } as const))
    .with(TONE_SEP, () => ({ tone: TONE_SEP, duration: ditTime(settings.wpm) } as const))
    .exhaustive()

export const timingSeqFromToneSeq = (ts: ToneSeq): RD.Reader<CwSettings, TimingSeq> => pipe(
    ts,
    NEA.map(pulseFromTone),
    NEA.sequence(RD.Applicative),
)

const parserUnwrapOption = <I, O>(p: parser.Parser<I, O.Option<O>>) => pipe(
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
    parserUnwrapOption,
);

const charParser = pipe(
    parser.item<string>(),
    parser.map((s) => R.lookup(s.toUpperCase())(CHAR_LOOKUP)),
    parserUnwrapOption,
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