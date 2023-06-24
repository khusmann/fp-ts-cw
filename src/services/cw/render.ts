import * as R from 'fp-ts/Reader';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import { pipe, apply } from 'fp-ts/function';
import { match, P } from 'ts-pattern';

import type { AstEntity } from './ast';

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
  readonly bitRate: BitRate;
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

const buildPulseTrain = (m: AstEntity): R.Reader<CwTimings, PulseTrain> =>
  pipe(
    R.ask<CwTimings>(),
    R.chain((timings) =>
      match(m)
        .with(
          P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'character' }, { _tag: 'prosign' }),
          ({ children }) => pipe(children, RNA.map(buildPulseTrain), RNA.sequence(R.Applicative), R.map(RNA.flatten))
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

const renderSynthEnvelope = (tt: PulseTrain) =>
  pipe(
    tt,
    RNA.map((tone) =>
      match(tone)
        .with({ _tag: 'tone' }, ({ duration }) => renderToneEnvelope(duration))
        .with({ _tag: 'silence' }, ({ duration }) => renderSilenceEnvelope(duration))
        .exhaustive()
    ),
    RNA.sequence(R.Applicative),
    R.map(RNA.flatten)
  );

const padSampleData = (data: RNA.ReadonlyNonEmptyArray<number>) =>
  pipe(
    R.ask<AudioSettings>(),
    R.chain(({ padTime }) =>
      pipe(
        renderSilenceEnvelope(padTime),
        R.map((se) => pipe(se, RNA.concat(data), RNA.concat(se)))
      )
    )
  );

const pcmDataFromSynthEnvelope = (envelope: SynthEnvelope) =>
  pipe(
    R.ask<AudioSettings>(),
    R.map(({ bitRate, freq, sampleRate }) =>
      pipe(
        envelope,
        RNA.mapWithIndex((idx, i) => i * Math.sin((2 * Math.PI * freq * idx) / sampleRate)),
        RNA.map((i) => Math.round(i * ((1 << (bitRate - 1)) - 1)))
      )
    )
  );

export const renderSynthSample = (m: AstEntity): R.Reader<AudioSettings & CwTimings, SynthSample> =>
  pipe(
    R.ask<AudioSettings & CwTimings>(),
    R.map((settings) => ({
      freq: settings.freq,
      sampleRate: settings.sampleRate,
      envelope: pipe(m, buildPulseTrain, R.chainW(renderSynthEnvelope), R.chainW(padSampleData), apply(settings)),
    }))
  );

export const renderAudioSample = (m: AstEntity): R.Reader<AudioSettings & CwTimings, AudioSample> =>
  pipe(
    R.ask<AudioSettings & CwTimings>(),
    R.map((settings) => ({
      bitRate: settings.bitRate,
      sampleRate: settings.sampleRate,
      data: pipe(
        m,
        buildPulseTrain,
        R.chainW(renderSynthEnvelope),
        R.chainW(padSampleData),
        R.chainW(pcmDataFromSynthEnvelope),
        apply(settings)
      ),
    }))
  );
