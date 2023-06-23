import * as Num from 'fp-ts/number';
import * as R from 'fp-ts/Reader';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { pipe, flow, identity } from 'fp-ts/function';
import * as S from 'fp-ts/string';
import { match, P } from 'ts-pattern';

import { CW_SYMBOLS } from './constants';
import { transform } from 'typescript';

export type Dot = { readonly _tag: 'dot' };
export type Dash = { readonly _tag: 'dash' };
export type ToneSpace = { readonly _tag: 'tonespace' };
export type TokenSpace = { readonly _tag: 'tokenspace' };
export type WordSpace = { readonly _tag: 'wordspace' };

export type Code = Dot | Dash | ToneSpace;
export type Token = Character | Prosign;

export type Character = {
  readonly _tag: 'character';
  readonly str: string;
  readonly children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>;
};

export type Prosign = {
  readonly _tag: 'prosign';
  readonly str: string;
  readonly children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>;
};

export type Word = {
  readonly _tag: 'word';
  readonly children: RNA.ReadonlyNonEmptyArray<Token | TokenSpace>;
};

export type Message = {
  readonly _tag: 'message';
  readonly children: RNA.ReadonlyNonEmptyArray<Word | WordSpace>;
};

export const DOT: Dot = { _tag: 'dot' };
export const DASH: Dash = { _tag: 'dash' };
export const TONE_SPACE: ToneSpace = { _tag: 'tonespace' };
export const WORD_SPACE: WordSpace = { _tag: 'wordspace' };
export const TOKEN_SPACE: TokenSpace = { _tag: 'tokenspace' };

export const character = (str: string, children: RNA.ReadonlyNonEmptyArray<Code>): Character => ({
  _tag: 'character',
  str,
  children,
});

export const prosign = (str: string, children: RNA.ReadonlyNonEmptyArray<Code>): Prosign => ({
  _tag: 'prosign',
  str,
  children,
});

export const word = (children: RNA.ReadonlyNonEmptyArray<Token | TokenSpace>): Word => ({
  _tag: 'word',
  children,
});

export const message = (children: RNA.ReadonlyNonEmptyArray<Word | WordSpace>): Message => ({
  _tag: 'message',
  children,
});

const pulsesFromCode = flow(
  S.split(''),
  RNA.map((c) => (c === '.' ? DOT : DASH)),
  RNA.intersperse<Code>(TONE_SPACE)
);

const tokenFromCode = (str: string, code: string): Token =>
  str.length === 1 ? character(str, pulsesFromCode(code)) : prosign(str, pulsesFromCode(code));

const CW_TOKEN_LOOKUP = pipe(
  CW_SYMBOLS,
  RNA.map(([str, code]: (typeof CW_SYMBOLS)[number]) => [str, tokenFromCode(str, code)] as const),
  RR.fromEntries
);

const CW_CODE_LOOKUP = pipe(
  CW_SYMBOLS,
  RNA.map(([str, code]: (typeof CW_SYMBOLS)[number]) => [code, tokenFromCode(str, code)] as const),
  RR.fromEntries
);

export const lookupTokenFromText = (str: string) => RR.lookup(str.toUpperCase())(CW_TOKEN_LOOKUP);

export const lookupTokenFromCode = (str: string) => RR.lookup(str)(CW_CODE_LOOKUP);

export type TransformTokenSettings<T> = {
  readonly prosign: (p: Prosign) => T;
  readonly character: (c: Character) => T;
  readonly wordspace: T;
  readonly tokenspace: T;
};

export type TransformCodeSettings<T> = {
  readonly dot: T;
  readonly dash: T;
  readonly tokenSpace: T;
  readonly toneSpace: T;
  readonly wordSpace: T;
};

export const transformCodeLevel = <T>(
  m: Message | Word | WordSpace | Token | TokenSpace | Code
): R.Reader<TransformCodeSettings<T>, RNA.ReadonlyNonEmptyArray<T>> =>
  pipe(
    R.ask<TransformCodeSettings<T>>(),
    R.chain(({ wordSpace, tokenSpace, dot, dash, toneSpace }) => {
      switch (m._tag) {
        case 'message':
          return pipe(
            m.children,
            RNA.map((i) => transformCodeLevel<T>(i)),
            RNA.sequence(R.Applicative),
            R.map(RNA.flatten)
          );
        case 'word':
          return pipe(
            m.children,
            RNA.map((i) => transformCodeLevel<T>(i)),
            RNA.sequence(R.Applicative),
            R.map(RNA.flatten)
          );
        case 'prosign':
          return pipe(
            m.children,
            RNA.map((i) => transformCodeLevel<T>(i)),
            RNA.sequence(R.Applicative),
            R.map(RNA.flatten)
          );
        case 'character':
          return pipe(
            m.children,
            RNA.map((i) => transformCodeLevel<T>(i)),
            RNA.sequence(R.Applicative),
            R.map(RNA.flatten)
          );
        case 'wordspace':
          return R.of(RNA.of(wordSpace));
        case 'tokenspace':
          return R.of(RNA.of(tokenSpace));
        case 'dot':
          return R.of(RNA.of(dot));
        case 'dash':
          return R.of(RNA.of(dash));
        case 'tonespace':
          return R.of(RNA.of(toneSpace));
      }
    })
  );

export const transformTokenLevel = <T>(
  m: Message | Word | WordSpace | TokenSpace | Token
): R.Reader<TransformTokenSettings<T>, RNA.ReadonlyNonEmptyArray<T>> =>
  pipe(
    R.ask<TransformTokenSettings<T>>(),
    R.chain(({ prosign, character, wordspace, tokenspace }) => {
      switch (m._tag) {
        case 'message':
          return pipe(
            m.children,
            RNA.map((i) => transformTokenLevel<T>(i)),
            RNA.sequence(R.Applicative),
            R.map(RNA.flatten)
          );
        case 'word':
          return pipe(
            m.children,
            RNA.map((i) => transformTokenLevel<T>(i)),
            RNA.sequence(R.Applicative),
            R.map(RNA.flatten)
          );
        case 'prosign':
          return R.of(RNA.of(prosign(m)));
        case 'character':
          return R.of(RNA.of(character(m)));
        case 'wordspace':
          return R.of(RNA.of(wordspace));
        case 'tokenspace':
          return R.of(RNA.of(tokenspace));
      }
    })
  );

export const stringifyTokens = (m: Message | Word | WordSpace | TokenSpace | Token) =>
  pipe(
    transformTokenLevel<string>(m)({
      prosign: ({ str }) => `<${str}>`,
      character: ({ str }) => str,
      wordspace: ' ',
      tokenspace: '',
    }),
    RNA.concatAll(S.Semigroup)
  );

export const stringifyCode = (m: Message | Word | WordSpace | TokenSpace | Token | Code) =>
  pipe(
    transformCodeLevel<string>(m)({
      dot: '.',
      dash: '-',
      tokenSpace: ' ',
      toneSpace: '',
      wordSpace: ' / ',
    }),
    RNA.concatAll(S.Semigroup)
  );

export const stringifyPulses = (m: Message | Word | WordSpace | TokenSpace | Token | Code) =>
  pipe(
    transformCodeLevel<string>(m)({
      dot: '.',
      dash: '-',
      tokenSpace: '/',
      toneSpace: '|',
      wordSpace: ' ',
    }),
    RNA.concatAll(S.Semigroup)
  );

type PulseEnvelope = RNA.ReadonlyNonEmptyArray<number>;

type Tone = {
  readonly _tag: 'tone';
  readonly duration: number;
};

type Silence = {
  readonly _tag: 'silence';
  readonly duration: number;
};

const tone = (duration: number): Tone | Silence => ({ _tag: 'tone', duration });
const silence = (duration: number): Silence | Tone => ({ _tag: 'silence', duration });

type PulseTrain = RNA.ReadonlyNonEmptyArray<Tone | Silence>;

const toneShapeFn =
  (i: number) =>
  ({ rampTime }: CwSettings & AudioSettings) =>
    i < rampTime ? Math.pow(Math.sin((Math.PI * i) / (2 * rampTime)), 2) : 1;

const toneEnvelopeFn = (duration: number) => (i: number) =>
  pipe([i, duration - i] as const, RNA.map(toneShapeFn), RNA.sequence(R.Applicative));

const toneEnvelope = (duration: number) =>
  pipe(
    R.ask<AudioSettings & CwSettings>(),
    R.chain(({ sampleRate, volume }) =>
      pipe(
        RNA.range(0, Math.floor(duration * sampleRate)),
        RNA.map((i) => i / sampleRate),
        RNA.map(toneEnvelopeFn(duration)),
        RNA.sequence(R.Applicative),
        R.map(
          flow(
            RNA.map(RNA.foldMap(Num.MonoidProduct)(identity)),
            RNA.map((i) => i * volume)
          )
        )
      )
    )
  );

const silenceEnvelope =
  (duration: number) =>
  ({ sampleRate }: CwSettings & AudioSettings): PulseEnvelope =>
    RNA.replicate(0)(Math.floor(duration * sampleRate));

type AudioSettings = {
  readonly sampleRate: number;
  readonly bitRate: number;
  readonly padTime: number;
  readonly rampTime: number;
};

type CwSettings = {
  readonly freq: number;
  readonly wpm: number;
  readonly farnsworth: number;
  readonly ews: number;
  readonly volume: number;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  sampleRate: 8000,
  bitRate: 16,
  padTime: 0.05,
  rampTime: 0.005, // Recommended by ARRL. See Section 2.202 of FCC rules and CCIR Radio regulations.
};

const ditTime = (s: CwSettings) => 1.2 / s.wpm;
const dahTime = (s: CwSettings) => 3 * ditTime(s);
const fditTime = (s: CwSettings) => (60 - s.farnsworth * 31 * ditTime(s)) / (s.farnsworth * (12 + 7));
const letterSpaceTime = (s: CwSettings) => (s.farnsworth ? 3 * fditTime(s) : 3 * ditTime(s));
const wordSpaceTime = (s: CwSettings) => 7 * (s.ews + 1) * (s.farnsworth ? fditTime(s) : ditTime(s));

export const buildPulseTrain = (m: Message | Word | WordSpace | TokenSpace | Token | Code) =>
  pipe(
    transformCodeLevel<R.Reader<CwSettings, Tone | Silence>>(m)({
      dot: flow(ditTime, tone),
      dash: flow(dahTime, tone),
      toneSpace: flow(ditTime, silence),
      tokenSpace: flow(letterSpaceTime, silence),
      wordSpace: flow(wordSpaceTime, silence),
    }),
    RNA.sequence(R.Applicative)
  );

export const envelopeFromPulseTrain = (train: PulseTrain) =>
  pipe(
    R.ask<AudioSettings & CwSettings>(),
    R.chain(({ padTime }) =>
      pipe(
        train,
        RNA.map((p) =>
          match(p)
            .with({ _tag: 'tone' }, ({ duration }) => toneEnvelope(duration))
            .with({ _tag: 'silence' }, ({ duration }) => silenceEnvelope(duration))
            .exhaustive()
        ),
        RA.append(silenceEnvelope(padTime)),
        RA.prepend(silenceEnvelope(padTime)),
        RNA.sequence(R.Applicative),
        R.map(RNA.concatAll(RNA.getSemigroup<number>()))
      )
    )
  );

export const pcmFromPulseTrain = (train: PulseTrain) =>
  pipe(
    R.ask<AudioSettings & CwSettings>(),
    R.chain(({ sampleRate, bitRate, freq }) =>
      pipe(
        envelopeFromPulseTrain(train),
        R.map(
          flow(
            RNA.mapWithIndex((idx, i) => i * Math.sin((2 * Math.PI * freq * idx) / sampleRate)),
            RNA.map((i) => i * ((1 << (bitRate - 1)) - 1)),
            RNA.map(Math.round)
          )
        )
      )
    )
  );
