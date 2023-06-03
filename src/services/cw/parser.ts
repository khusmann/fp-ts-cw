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

type AudioSettings = {
    readonly sampleRate: number;
    readonly bitRate: number;
    readonly padTime: number;
}

type CwSettings = {
    readonly freq: number;
    readonly wpm: number;
    readonly farnsworth: number;
    readonly ews: number;
};

const AUDIO_SETTINGS: AudioSettings = {
    sampleRate: 8000,
    bitRate: 16,
    padTime: 0.05,
}

const ditTime = (s: CwSettings) => 1.2 / s.wpm;
const dahTime = (s: CwSettings) => 3 * ditTime(s);
const fditTime = (s: CwSettings) => (60 - s.farnsworth * 31 * ditTime(s)) / (s.farnsworth * (12+7));
const letterSpaceTime = (s: CwSettings) => s.farnsworth ? 3*fditTime(s): 3*ditTime(s);
const wordSpaceTime = (s: CwSettings) => 7 * (s.ews + 1) * (s.farnsworth ? fditTime(s): ditTime(s));
const rampTime = (s: CwSettings) => 1 / s.freq * 2; // Two period ramp

const pulseFromTone = (t: Tone): RD.Reader<CwSettings, Pulse> => (s: CwSettings) => match(t)
    .with(DIT, () => ({ tone: DIT, duration: ditTime(s) } as const))
    .with(DAH, () => ({ tone: DAH, duration: dahTime(s) } as const))
    .with(LETTER_SEP, () => ({ tone: LETTER_SEP, duration: letterSpaceTime(s) } as const))
    .with(WORD_SEP, () => ({ tone: WORD_SEP, duration: wordSpaceTime(s) } as const))
    .with(TONE_SEP, () => ({ tone: TONE_SEP, duration: ditTime(s) } as const))
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