import * as O from 'fp-ts/Option';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import { parser as P } from 'parser-ts';

export const parserFromOption = <I>(): (<O>(o: O.Option<O>) => P.Parser<I, O>) =>
  O.fold(
    () => P.fail<I>(),
    (o) => P.succeed(o)
  );

export const PeitherW = <I, A, B>(a: P.Parser<I, A>, b: () => P.Parser<I, B>) =>
  P.either<I, A | B>(a, b);

export const RNAintersperseW =
  <A, B>(a: A) =>
  (b: RNA.ReadonlyNonEmptyArray<B>) =>
    RNA.intersperse<A | B>(a)(b);
