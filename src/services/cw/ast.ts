import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
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

export type AstEntity = Message | Word | WordSpace | Token | TokenSpace | Code;

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
  RNA.intersperse<Code>(TONE_SPACE),
);

const tokenFromCode = (str: string, code: string): Token =>
  str.length === 1 ? character(str, pulsesFromCode(code)) : prosign(str, pulsesFromCode(code));

const CW_TOKEN_LOOKUP = pipe(
  CW_SYMBOLS,
  RNA.map(([str, code]: (typeof CW_SYMBOLS)[number]) => [str, tokenFromCode(str, code)] as const),
  RR.fromEntries,
);

const CW_CODE_LOOKUP = pipe(
  CW_SYMBOLS,
  RNA.map(([str, code]: (typeof CW_SYMBOLS)[number]) => [code, tokenFromCode(str, code)] as const),
  RR.fromEntries,
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
      children.map(stringifyCode).join(''),
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
      children.map(stringifyCode).join(''),
    )
    .with({ _tag: 'dot' }, () => '.')
    .with({ _tag: 'dash' }, () => '-')
    .with({ _tag: 'tonespace' }, () => '|')
    .with({ _tag: 'tokenspace' }, () => '/')
    .with({ _tag: 'wordspace' }, () => ' ')
    .exhaustive();
