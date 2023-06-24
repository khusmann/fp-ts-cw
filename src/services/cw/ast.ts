import * as R from 'fp-ts/Reader';
import * as RA from 'fp-ts/ReadonlyArray';
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

export type AstEntity = Message | Word | WordSpace | Token | TokenSpace | Code;

export type CwSettings = {
  readonly wpm: number;
  readonly farnsworth: number;
  readonly ews: number;
};

type CwTimings = {
  readonly dit: number;
  readonly dah: number;
  readonly tokenSpace: number;
  readonly wordSpace: number;
};

type SampleRate = 8000 | 16000 | 32000 | 44100 | 48000;
type BitRate = 8 | 16 | 24;

export type AudioSettings = {
  readonly sampleRate: SampleRate;
  readonly bitRate: BitRate;
  readonly padTime: number;
  readonly rampTime: number;
  readonly volume: number;
  readonly freq: number;
};

type Tone = {
  readonly _tag: 'tone';
  readonly duration: number;
};

type Silence = {
  readonly _tag: 'silence';
  readonly duration: number;
};

type ToneTrain = RNA.ReadonlyNonEmptyArray<Tone | Silence>;

type PcmData = RNA.ReadonlyNonEmptyArray<number>;

export type AudioSample = {
  readonly sampleRate: SampleRate;
  readonly bitRate: BitRate;
  readonly data: PcmData;
};

type SynthToneEnvelope = RNA.ReadonlyNonEmptyArray<number>;

type SynthTone = {
  readonly freq: number;
  readonly sampleRate: SampleRate;
  readonly envelope: SynthToneEnvelope;
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

export const stringify = (m: Message | Word | WordSpace | TokenSpace | Token): string =>
  match(m)
    .with(P.union({ _tag: 'message' }, { _tag: 'word' }), ({ children }) => children.map(stringify).join(''))
    .with({ _tag: 'prosign' }, ({ str }) => `<${str}>`)
    .with({ _tag: 'character' }, ({ str }) => str)
    .with({ _tag: 'wordspace' }, () => ' ')
    .with({ _tag: 'tokenspace' }, () => '')
    .exhaustive();

export const stringifyCode = (m: AstEntity): string =>
  match(m)
    .with(P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'character' }, { _tag: 'prosign' }), ({ children }) =>
      children.map(stringifyCode).join('')
    )
    .with({ _tag: 'dot' }, () => '.')
    .with({ _tag: 'dash' }, () => '-')
    .with({ _tag: 'tonespace' }, () => '')
    .with({ _tag: 'tokenspace' }, () => ' ')
    .with({ _tag: 'wordspace' }, () => ' / ')
    .exhaustive();

export const stringifyTones = (m: AstEntity) =>
  match(m)
    .with(P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'character' }, { _tag: 'prosign' }), ({ children }) =>
      children.map(stringifyCode).join('')
    )
    .with({ _tag: 'dot' }, () => '.')
    .with({ _tag: 'dash' }, () => '-')
    .with({ _tag: 'tonespace' }, () => '|')
    .with({ _tag: 'tokenspace' }, () => '/')
    .with({ _tag: 'wordspace' }, () => ' ')
    .exhaustive();

const tone = (duration: number): Tone => ({ _tag: 'tone', duration });

const silence = (duration: number): Silence => ({ _tag: 'silence', duration });

export const calculateTimings = ({ wpm, farnsworth, ews }: CwSettings): CwTimings => {
  const dit = 1.2 / wpm;
  const dah = 3 * dit;
  const fdit = (60 - farnsworth * 31 * dit) / (farnsworth * (12 + 7));
  const tokenSpace = farnsworth ? 3 * fdit : 3 * dit;
  const wordSpace = 7 * (ews + 1) * (farnsworth ? fdit : dit);
  return {
    dit,
    dah,
    tokenSpace,
    wordSpace,
  };
};

const buildToneTrain = (m: AstEntity): R.Reader<CwTimings, ToneTrain> =>
  pipe(
    R.ask<CwTimings>(),
    R.chain((timings) =>
      match(m)
        .with(
          P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'character' }, { _tag: 'prosign' }),
          ({ children }) => pipe(children, RNA.map(buildToneTrain), RNA.sequence(R.Applicative), R.map(RNA.flatten))
        )
        .with({ _tag: 'dot' }, () => R.of(RNA.of(tone(timings.dit))))
        .with({ _tag: 'dash' }, () => R.of(RNA.of(tone(timings.dah))))
        .with({ _tag: 'tonespace' }, () => R.of(RNA.of(silence(timings.dit))))
        .with({ _tag: 'tokenspace' }, () => R.of(RNA.of(silence(timings.tokenSpace))))
        .with({ _tag: 'wordspace' }, () => R.of(RNA.of(silence(timings.wordSpace))))
        .exhaustive()
    )
  );

const toneShapeFn = (t: number, rampTime: number) =>
  t < rampTime ? Math.pow(Math.sin((Math.PI * t) / (2 * rampTime)), 2) : 1;

const renderToneEnvelope = (duration: number) =>
  pipe(
    R.ask<AudioSettings>(),
    R.map(({ sampleRate, rampTime, volume }) =>
      pipe(
        RNA.range(0, Math.floor(duration * sampleRate)),
        RNA.map((i) => i / sampleRate),
        RNA.map((t) => toneShapeFn(t, rampTime) * toneShapeFn(duration - t, rampTime) * volume)
      )
    )
  );

const renderSilenceEnvelope = (duration: number) =>
  pipe(
    R.ask<AudioSettings>(),
    R.map(({ sampleRate }) => RNA.replicate(0)(Math.floor(duration * sampleRate)))
  );

const renderSynthToneEnvelope = (tt: ToneTrain) =>
  pipe(
    R.ask<AudioSettings>(),
    R.chain(({ padTime }) =>
      pipe(
        tt,
        RNA.map((tone) =>
          match(tone)
            .with({ _tag: 'tone' }, ({ duration }) => renderToneEnvelope(duration))
            .with({ _tag: 'silence' }, ({ duration }) => renderSilenceEnvelope(duration))
            .exhaustive()
        ),
        RA.append(renderSilenceEnvelope(padTime)),
        RA.prepend(renderSilenceEnvelope(padTime)),
        RNA.sequence(R.Applicative),
        R.map(RNA.flatten)
      )
    )
  );

const renderPcmData = flow(
  renderSynthToneEnvelope,
  R.chain((envelope) =>
    pipe(
      R.ask<AudioSettings>(),
      R.map(({ bitRate, freq, sampleRate }) =>
        pipe(
          envelope,
          RNA.mapWithIndex((idx, i) => i * Math.sin((2 * Math.PI * freq * idx) / sampleRate)),
          RNA.map((i) => Math.round(i * ((1 << (bitRate - 1)) - 1)))
        )
      )
    )
  )
);

export const renderSynthTone = (m: AstEntity): R.Reader<AudioSettings & CwTimings, SynthTone> =>
  pipe(
    R.ask<AudioSettings & CwTimings>(),
    R.map((settings) => ({
      freq: settings.freq,
      sampleRate: settings.sampleRate,
      envelope: pipe(m, buildToneTrain, R.chainW(renderSynthToneEnvelope), apply(settings)),
    }))
  );

export const renderAudioSample = (m: AstEntity): R.Reader<AudioSettings & CwTimings, AudioSample> =>
  pipe(
    R.ask<AudioSettings & CwTimings>(),
    R.map((settings) => ({
      bitRate: settings.bitRate,
      sampleRate: settings.sampleRate,
      data: pipe(m, buildToneTrain, R.chainW(renderPcmData), apply(settings)),
    }))
  );
