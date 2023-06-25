import * as O from 'fp-ts/Option';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import { pipe } from 'fp-ts/function';
import { parser as P } from 'parser-ts';

export const parserFromOption = <I>(): (<O>(o: O.Option<O>) => P.Parser<I, O>) =>
  O.fold(
    () => P.fail<I>(),
    (o) => P.succeed(o),
  );

export const PeitherW = <I, A, B>(a: P.Parser<I, A>, b: () => P.Parser<I, B>) => P.either<I, A | B>(a, b);

export const RNAintersperseW =
  <A, B>(a: A) =>
  (b: RNA.ReadonlyNonEmptyArray<B>) =>
    RNA.intersperse<A | B>(a)(b);

const toneShapeFn = (t: number, rampTime: number) =>
  t < rampTime ? Math.pow(Math.sin((Math.PI * t) / (2 * rampTime)), 2) : 1;

const timeSeries = (duration: number, sampleRate: number) =>
  RNA.range(0, Math.floor(duration * sampleRate) / sampleRate);

export const toneEnvelope = (duration: number, volume: number, rampTime: number, sampleRate: number) =>
  pipe(
    timeSeries(duration, sampleRate),
    RNA.map((t) => toneShapeFn(t, rampTime) * toneShapeFn(duration - t, rampTime) * volume),
  );

export const silenceEnvelope = (duration: number, sampleRate: number) =>
  RNA.replicate(0)(Math.floor(duration * sampleRate));

export const modulatedSineFn = (freq: number, sampleRate: number) => (idx: number, v: number) =>
  v * Math.sin((2 * Math.PI * freq * idx) / sampleRate);

export const quantize = (bitDepth: number) => (v: number) => Math.round(v * ((1 << (bitDepth - 1)) - 1));
