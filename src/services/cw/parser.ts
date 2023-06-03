// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as R from 'fp-ts/Reader';
import { pipe } from 'fp-ts/function';

import { match, P } from 'ts-pattern';

// parser-ts
import { parser, char, stream } from 'parser-ts';

import { CHAR_LOOKUP, PROSIGN_LOOKUP, LETTER_SEP, WORD_SEP, TONE_SEP, DIT, DAH } from './constants';

import type { PulseSeq, PulseType, Pulse } from './constants';

// Pulse { type: PulseType }, PulseSeq
// PulseTiming, PulseTimingSeq
// PulseEnvelope
// play(envelope: PulseEnvelope, freq: number)

type PulseTiming = {
    readonly tone: PulseType;
    readonly duration: number;
};

type PulseTimingSeq = RNA.ReadonlyNonEmptyArray<PulseTiming>;

type PulseEnvelope = RNA.ReadonlyNonEmptyArray<number>;

type AudioSettings = {
    readonly sampleRate: number;
    readonly bitRate: number;
    readonly padTime: number;
    readonly rampTime: number;
}

type CwSettings = {
    readonly freq: number;
    readonly wpm: number;
    readonly farnsworth: number;
    readonly ews: number;
};

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
    sampleRate: 8000,
    bitRate: 16,
    padTime: 0.05,
    rampTime: 0.005, // Recommended by ARRL. See Section 2.202 of FCC rules and CCIR Radio regulations.
}

const ditTime = (s: CwSettings) => 1.2 / s.wpm;
const dahTime = (s: CwSettings) => 3 * ditTime(s);
const fditTime = (s: CwSettings) => (60 - s.farnsworth * 31 * ditTime(s)) / (s.farnsworth * (12+7));
const letterSpaceTime = (s: CwSettings) => s.farnsworth ? 3*fditTime(s): 3*ditTime(s);
const wordSpaceTime = (s: CwSettings) => 7 * (s.ews + 1) * (s.farnsworth ? fditTime(s): ditTime(s));

const pulseTimingFromPulse = (p: Pulse) => (s: CwSettings) => match(p.type)
    .with(DIT, () => ({ tone: DIT, duration: ditTime(s) } as const))
    .with(DAH, () => ({ tone: DAH, duration: dahTime(s) } as const))
    .with(LETTER_SEP, () => ({ tone: LETTER_SEP, duration: letterSpaceTime(s) } as const))
    .with(WORD_SEP, () => ({ tone: WORD_SEP, duration: wordSpaceTime(s) } as const))
    .with(TONE_SEP, () => ({ tone: TONE_SEP, duration: ditTime(s) } as const))
    .exhaustive()

export const pulseTimingFromPulseSeq = (ts: PulseSeq) => pipe(
    ts,
    RNA.map(pulseTimingFromPulse),
    RNA.sequence(R.Applicative),
)

export const pulseEnvelopeFromPulseTiming = (ts: PulseTimingSeq) => (s: AudioSettings) => pipe(
    s, // TODO
);

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
    parser.map((s) => RR.lookup(`<${s}>`)(PROSIGN_LOOKUP)),
    parserUnwrapOption,
);

const charParser = pipe(
    parser.item<string>(),
    parser.map((s) => RR.lookup(s.toUpperCase())(CHAR_LOOKUP)),
    parserUnwrapOption,
);

const wordParser = pipe(
    parser.many1(charParser),
    parser.map(
        RNA.intercalate(RNA.getSemigroup<Pulse>())(RNA.of({ type: LETTER_SEP }))
    ),
);

export const messageParser = pipe(
    parser.sepBy1(parser.many1(char.char(' ')), parser.either(prosignParser, () => wordParser)),
    parser.map(
        RNA.intercalate(RNA.getSemigroup<Pulse>())(RNA.of({ type: WORD_SEP }))
    ),
    failIfNotEof,
);

export const parseMessage = (s: string) => pipe(
    stream.stream(s.split('')),
    messageParser,
);

export const stringFromPulseSeq = (ts: PulseSeq) => pipe(
    ts,
    RA.map(({ type }) => (
        match(type)
        .with(LETTER_SEP, () => ' ')
        .with(WORD_SEP, () => ' / ')
        .with(TONE_SEP, () => '')
        .with(P.union(DIT, DAH), (t) => t)
        .exhaustive()
    )),
    RA.reduce(S.empty, S.Monoid.concat),
)