import * as R from 'fp-ts/Reader';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import { pipe } from 'fp-ts/function';
import { match, P } from 'ts-pattern';

import type { AstEntity } from './ast';
import { constantSamples } from './util';

export type WpmSettings = {
  readonly wpm: number;
  readonly farnsworth: number;
  readonly ews: number;
};

type TimingSettings = {
  readonly dotTime: number;
  readonly dashTime: number;
  readonly tokenSpaceTime: number;
  readonly wordSpaceTime: number;
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

export type SynthSample = {
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

export const calculateTimings = ({ wpm, farnsworth, ews }: WpmSettings): TimingSettings => {
  const dotTime = 1.2 / wpm;
  const dashTime = 3 * dotTime;
  const fdit = (60 - farnsworth * 31 * dotTime) / (farnsworth * (12 + 7));
  const tokenSpaceTime = farnsworth ? 3 * fdit : 3 * dotTime;
  const wordSpaceTime = 7 * (ews + 1) * (farnsworth ? fdit : dotTime);
  return {
    dotTime,
    dashTime,
    tokenSpaceTime,
    wordSpaceTime,
  };
};

export const buildPulseTrain = (m: AstEntity): R.Reader<TimingSettings, PulseTrain> =>
  pipe(
    R.ask<TimingSettings>(),
    R.chain(({ dotTime, dashTime, tokenSpaceTime, wordSpaceTime }) =>
      match(m)
        .with(
          P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'character' }, { _tag: 'prosign' }),
          ({ children }) => pipe(children, RNA.map(buildPulseTrain), RNA.sequence(R.Applicative), R.map(RNA.flatten)),
        )
        .with({ _tag: 'dot' }, () => R.of(RNA.of(tone(dotTime))))
        .with({ _tag: 'dash' }, () => R.of(RNA.of(tone(dashTime))))
        .with({ _tag: 'tonespace' }, () => R.of(RNA.of(silence(dotTime))))
        .with({ _tag: 'tokenspace' }, () => R.of(RNA.of(silence(tokenSpaceTime))))
        .with({ _tag: 'wordspace' }, () => R.of(RNA.of(silence(wordSpaceTime))))
        .exhaustive(),
    ),
  );

const renderToneEnvelope =
  (duration: number) =>
  ({ sampleRate, rampTime, volume }: RampTimeSetting & VolumeSetting & SampleRateSetting) => {
    const toneShapeFn = (t: number, v: number) =>
      v * (t < rampTime ? Math.pow(Math.sin((Math.PI * t) / (2 * rampTime)), 2) : 1);

    return pipe(
      constantSamples(volume)(duration, sampleRate),
      RNA.mapWithIndex((idx, v) => toneShapeFn(idx / sampleRate, v)), // Attack
      RNA.mapWithIndex((idx, v) => toneShapeFn(duration - (idx + 1) / sampleRate, v)), // Decay
    );
  };

const renderSilenceEnvelope =
  (duration: number) =>
  ({ sampleRate }: SampleRateSetting) =>
    constantSamples(0)(duration, sampleRate);

export const renderSynthSample = (tt: PulseTrain) =>
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
    R.bindTo('envelope'),
    R.bindW('freq', () => R.asks(({ freq }: FreqSetting) => freq)),
    R.bindW('sampleRate', () => R.asks(({ sampleRate }: SampleRateSetting) => sampleRate)),
  );

export const synthSampleToPcm = ({ freq, sampleRate, envelope }: SynthSample) =>
  pipe(
    R.ask<BitDepthSetting>(),
    R.map(({ bitDepth }) => {
      const sineFn = (t: number, v: number) => v * Math.sin(2 * Math.PI * freq * t);
      const quantizeFn = (v: number) => Math.round(v * ((1 << (bitDepth - 1)) - 1));

      return pipe(
        envelope,
        RNA.mapWithIndex((idx, v) => sineFn(idx / sampleRate, v)),
        RNA.map(quantizeFn),
      );
    }),
    R.bindTo('data'),
    R.bind('sampleRate', () => R.of(sampleRate)),
    R.bind('bitDepth', () => R.asks(({ bitDepth }: BitDepthSetting) => bitDepth)),
  );
