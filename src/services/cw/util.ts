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

const toneShapeFn = (rampTime: number) => (t: number, v: number) =>
  v * (t < rampTime ? Math.pow(Math.sin((Math.PI * t) / (2 * rampTime)), 2) : 1);

export const modulatedSineFn = (freq: number) => (t: number, v: number) => v * Math.sin(2 * Math.PI * freq * t);

export const RNAmapWithTimeIdx =
  (sampleRate: number) =>
  <A, B>(f: (t: number, a: A) => B) =>
    RNA.mapWithIndex<A, B>((idx, v) => f(idx / sampleRate, v));

export const toneEnvelope = (duration: number, volume: number, rampTime: number, sampleRate: number) =>
  pipe(
    constantSamples(volume)(duration, sampleRate),
    RNAmapWithTimeIdx(sampleRate)(toneShapeFn(rampTime)),
    RNAmapWithTimeIdx(sampleRate)((t, v) => toneShapeFn(rampTime)(duration - t, v)),
  );

export const constantSamples = (v: number) => (duration: number, sampleRate: number) =>
  RNA.replicate(v)(Math.floor(duration * sampleRate));

export const silenceEnvelope = constantSamples(0);

export const quantize = (bitDepth: number) => (v: number) => Math.round(v * ((1 << (bitDepth - 1)) - 1));
