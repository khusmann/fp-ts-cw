import * as R from 'fp-ts/Reader';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import { pipe, flow } from 'fp-ts/function';
import { match, P } from 'ts-pattern';

import type { AstEntity } from './ast';
import { silenceEnvelope, toneEnvelope, quantize as quantizeFn, modulatedSineFn } from './util';

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
type BitDepth = 8 | 16 | 24;

export type RampTimeSetting = {
  readonly rampTime: number;
};

export type VolumeSetting = {
  readonly volume: number;
};

export type FreqSetting = {
  readonly freq: number;
};

export type PadTimeSetting = {
  readonly padTime: number;
};

export type SampleRateSetting = {
  readonly sampleRate: SampleRate;
};

export type BitDepthSetting = {
  readonly bitDepth: BitDepth;
};

type Tone = {
  readonly _tag: 'tone';
  readonly duration: number;
};

type Silence = {
  readonly _tag: 'silence';
  readonly duration: number;
};

type PulseTrain = RNA.ReadonlyNonEmptyArray<Tone | Silence>;

type SynthEnvelope = RNA.ReadonlyNonEmptyArray<number>;

type SynthSample = {
  readonly freq: number;
  readonly sampleRate: SampleRate;
  readonly envelope: SynthEnvelope;
};

type PcmData = RNA.ReadonlyNonEmptyArray<number>;

export type AudioSample = {
  readonly sampleRate: SampleRate;
  readonly bitDepth: BitDepth;
  readonly data: PcmData;
};

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

export const buildPulseTrain = (m: AstEntity): R.Reader<CwTimings, PulseTrain> =>
  pipe(
    R.ask<CwTimings>(),
    R.chain((timings) =>
      match(m)
        .with(
          P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'character' }, { _tag: 'prosign' }),
          ({ children }) => pipe(children, RNA.map(buildPulseTrain), RNA.sequence(R.Applicative), R.map(RNA.flatten)),
        )
        .with({ _tag: 'dot' }, () => R.of(RNA.of(tone(timings.dit))))
        .with({ _tag: 'dash' }, () => R.of(RNA.of(tone(timings.dah))))
        .with({ _tag: 'tonespace' }, () => R.of(RNA.of(silence(timings.dit))))
        .with({ _tag: 'tokenspace' }, () => R.of(RNA.of(silence(timings.tokenSpace))))
        .with({ _tag: 'wordspace' }, () => R.of(RNA.of(silence(timings.wordSpace))))
        .exhaustive(),
    ),
  );

const renderToneEnvelope = (duration: number) =>
  pipe(
    R.ask<RampTimeSetting & VolumeSetting & SampleRateSetting>(),
    R.map(({ sampleRate, rampTime, volume }) => toneEnvelope(duration, volume, rampTime, sampleRate)),
  );

const renderSilenceEnvelope = (duration: number) =>
  pipe(
    R.ask<SampleRateSetting>(),
    R.map(({ sampleRate }) => silenceEnvelope(duration, sampleRate)),
  );

const renderSynthEnvelope = (tt: PulseTrain) =>
  pipe(
    tt,
    RNA.map((tone) =>
      match(tone)
        .with({ _tag: 'tone' }, ({ duration }) => renderToneEnvelope(duration))
        .with({ _tag: 'silence' }, ({ duration }) => renderSilenceEnvelope(duration))
        .exhaustive(),
    ),
    RNA.sequence(R.Applicative),
    R.map(RNA.flatten),
  );

const padSynthEnvelope =
  (data: SynthEnvelope) =>
  ({ sampleRate, padTime }: SampleRateSetting & PadTimeSetting) =>
    pipe(silenceEnvelope(padTime, sampleRate), (p) => pipe(p, RNA.concat(data), RNA.concat(p)));

type SynthSettings = FreqSetting & SampleRateSetting & RampTimeSetting & PadTimeSetting & VolumeSetting;

export const renderSynthSample: (tt: PulseTrain) => R.Reader<SynthSettings, SynthSample> = flow(
  renderSynthEnvelope,
  R.chainW(padSynthEnvelope),
  R.bindTo('envelope'),
  R.bindW('freq', () => R.asks(({ freq }: FreqSetting) => freq)),
  R.bindW('sampleRate', () => R.asks(({ sampleRate }: SampleRateSetting) => sampleRate)),
);

export const synthSampleToPcm = ({ freq, sampleRate, envelope }: SynthSample) =>
  pipe(
    R.ask<BitDepthSetting>(),
    R.map(({ bitDepth }) =>
      pipe(envelope, RNA.mapWithIndex(modulatedSineFn(freq, sampleRate)), RNA.map(quantizeFn(bitDepth))),
    ),
    R.bindTo('data'),
    R.bind('sampleRate', () => R.of(sampleRate)),
    R.bind('bitDepth', () => R.asks(({ bitDepth }: BitDepthSetting) => bitDepth)),
  );
