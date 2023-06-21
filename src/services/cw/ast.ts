import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as Se from 'fp-ts/Semigroup';
import { pipe, flow } from 'fp-ts/function';
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
  readonly semigroup: Se.Semigroup<T>;
};

export type TransformCodeSettings<T> = {
  readonly dot: T;
  readonly dash: T;
  readonly tokenSpace: T;
  readonly toneSpace: T;
  readonly wordSpace: T;
  readonly semigroup: Se.Semigroup<T>;
};

export const transformCodeLevel =
  <T>(config: TransformCodeSettings<T>) =>
  (m: Message | Token | Word | WordSpace | TokenSpace | Dot | Dash | ToneSpace): T =>
    match(m)
      .with(
        P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'prosign' }, { _tag: 'character' }),
        ({ children }) => pipe(children, RNA.map(transformCodeLevel(config)), RNA.concatAll(config.semigroup))
      )
      .with({ _tag: 'wordspace' }, () => config.wordSpace)
      .with({ _tag: 'tokenspace' }, () => config.tokenSpace)
      .with({ _tag: 'dot' }, () => config.dot)
      .with({ _tag: 'dash' }, () => config.dash)
      .with({ _tag: 'tonespace' }, () => config.toneSpace)
      .exhaustive();

export const transformTokenLevel =
  <T>(config: TransformTokenSettings<T>) =>
  (m: Message | Word | WordSpace | TokenSpace | Token): T =>
    match(m)
      .with(P.union({ _tag: 'message' }, { _tag: 'word' }), ({ children }) =>
        pipe(children, RNA.map(transformTokenLevel(config)), RNA.concatAll(config.semigroup))
      )
      .with({ _tag: 'prosign' }, config.prosign)
      .with({ _tag: 'character' }, config.character)
      .with({ _tag: 'wordspace' }, () => config.wordspace)
      .with({ _tag: 'tokenspace' }, () => config.tokenspace)
      .exhaustive();

export const stringifyTokens = transformTokenLevel({
  prosign: ({ str }) => `<${str}>`,
  character: ({ str }) => str,
  wordspace: ' ',
  tokenspace: '',
  semigroup: S.Semigroup,
});

export const stringifyCode = transformCodeLevel({
  dot: '.',
  dash: '-',
  tokenSpace: ' ',
  toneSpace: '',
  wordSpace: ' / ',
  semigroup: S.Semigroup,
});

export const stringifyPulses = transformCodeLevel({
  dot: '.',
  dash: '-',
  tokenSpace: '/',
  toneSpace: '|',
  wordSpace: ' ',
  semigroup: S.Semigroup,
});

export const stringifyPulsesArr = transformCodeLevel({
  dot: ['.'],
  dash: ['-'],
  tokenSpace: ['/'],
  toneSpace: ['|'],
  wordSpace: [' '],
  semigroup: RNA.getSemigroup<string>(),
});
