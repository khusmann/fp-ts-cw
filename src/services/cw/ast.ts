import * as R from 'fp-ts/Reader';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { pipe, flow, apply } from 'fp-ts/function';
import * as S from 'fp-ts/string';
import { match, P } from 'ts-pattern';

import { CW_SYMBOLS } from './constants';

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

export const character = (str: string, children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>): Character => ({
  _tag: 'character',
  str,
  children,
});

export const prosign = (str: string, children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>): Prosign => ({
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
  RNA.intersperse<Dot | Dash | ToneSpace>(TONE_SPACE)
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

export const lookupTokenFromCode = (dot: string, dash: string) => (str: string) =>
  pipe(CW_CODE_LOOKUP, RR.lookup(pipe(str, S.replace(dot, '.'), S.replace(dash, '-'))));

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

export const transformCodeLevel =
  <T>(config: TransformCodeSettings<T>) =>
  (m: Message | Token | Word | WordSpace | TokenSpace | Dot | Dash | ToneSpace): RNA.ReadonlyNonEmptyArray<T> =>
    match(m)
      .with(
        P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'prosign' }, { _tag: 'character' }),
        ({ children }) => pipe(children, RNA.flatMap(transformCodeLevel(config)))
      )
      .with({ _tag: 'wordspace' }, () => RNA.of(config.wordSpace))
      .with({ _tag: 'tokenspace' }, () => RNA.of(config.tokenSpace))
      .with({ _tag: 'dot' }, () => RNA.of(config.dot))
      .with({ _tag: 'dash' }, () => RNA.of(config.dash))
      .with({ _tag: 'tonespace' }, () => RNA.of(config.toneSpace))
      .exhaustive();

export const transformTokenLevel =
  <T>(config: TransformTokenSettings<T>) =>
  (m: Message | Word | WordSpace | TokenSpace | Token): RNA.ReadonlyNonEmptyArray<T> =>
    match(m)
      .with(P.union({ _tag: 'message' }, { _tag: 'word' }), ({ children }) =>
        pipe(children, RNA.flatMap(transformTokenLevel(config)))
      )
      .with({ _tag: 'prosign' }, flow(config.prosign, RNA.of))
      .with({ _tag: 'character' }, flow(config.character, RNA.of))
      .with({ _tag: 'wordspace' }, () => RNA.of(config.wordspace))
      .with({ _tag: 'tokenspace' }, () => RNA.of(config.tokenspace))
      .exhaustive();

export const stringifyTokens = flow(
  transformTokenLevel({
    prosign: ({ str }) => `<${str}>`,
    character: ({ str }) => str,
    wordspace: ' ',
    tokenspace: '',
  }),
  RNA.concatAll(S.Semigroup)
);

export const stringifyCode = flow(
  transformCodeLevel({
    dot: '.',
    dash: '-',
    tokenSpace: ' ',
    toneSpace: '',
    wordSpace: ' / ',
  }),
  RNA.concatAll(S.Semigroup)
);

export const stringifyPulses = flow(
  transformCodeLevel({
    dot: '.',
    dash: '-',
    tokenSpace: '/',
    toneSpace: '|',
    wordSpace: ' ',
  }),
  RNA.concatAll(S.Semigroup)
);

type PulseEnvelope = RNA.ReadonlyNonEmptyArray<number>;

const toneShapeFn = (i: number, rampTime: number) =>
  i < rampTime ? Math.pow(Math.sin((Math.PI * i) / (2 * rampTime)), 2) : 1;

const toneEnvelope =
  (duration: number) =>
  ({ volume, sampleRate, rampTime }: AudioSettings & CwSettings): PulseEnvelope =>
    pipe(
      RNA.range(0, Math.floor(duration * sampleRate)),
      RNA.map((i) => i / sampleRate),
      RNA.map((i) => toneShapeFn(i, rampTime) * toneShapeFn(duration - i, rampTime)),
      RNA.map((i) => i * volume)
      //      RNA.map((i) => i * ((1 << (bitRate - 1)) - 1)),
      //      RNA.map(Math.round)
    );

const silenceEnvelope =
  (duration: number) =>
  ({ sampleRate }: AudioSettings): PulseEnvelope =>
    RNA.replicate(0)(Math.floor(duration * sampleRate));

const padEnvelope = (audioConfig: AudioSettings) => silenceEnvelope(audioConfig.padTime)(audioConfig);

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

export const buildEnvelope = (cwConfig: CwSettings, audioConfig = DEFAULT_AUDIO_SETTINGS) =>
  flow(
    transformCodeLevel(
      pipe(
        {
          dot: R.chain(toneEnvelope)(ditTime),
          dash: R.chain(toneEnvelope)(dahTime),
          tokenSpace: R.chainW(silenceEnvelope)(letterSpaceTime),
          toneSpace: R.chainW(silenceEnvelope)(ditTime),
          wordSpace: R.chainW(silenceEnvelope)(wordSpaceTime),
        },
        RR.map(apply({ ...cwConfig, ...audioConfig }))
      )
    ),
    (a) => [padEnvelope(audioConfig), ...a, padEnvelope(audioConfig)] as const,
    RNA.concatAll(RNA.getSemigroup<number>())
  );
