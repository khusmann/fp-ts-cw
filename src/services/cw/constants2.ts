import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { pipe, flow } from 'fp-ts/function';
import * as S from 'fp-ts/string';
import { match, P } from 'ts-pattern';

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

export const character = (
  str: string,
  children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>
): Character => ({
  _tag: 'character',
  str,
  children,
});

export const prosign = (
  str: string,
  children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>
): Prosign => ({
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

const CW_SYMBOLS = [
  ['A', '.-'],
  ['B', '-...'],
  ['C', '-.-.'],
  ['D', '-..'],
  ['E', '.'],
  ['F', '..-.'],
  ['G', '--.'],
  ['H', '....'],
  ['I', '..'],
  ['J', '.---'],
  ['K', '-.-'],
  ['L', '.-..'],
  ['M', '--'],
  ['N', '-.'],
  ['O', '---'],
  ['P', '.--.'],
  ['Q', '--.-'],
  ['R', '.-.'],
  ['S', '...'],
  ['T', '-'],
  ['U', '..-'],
  ['V', '...-'],
  ['W', '.--'],
  ['X', '-..-'],
  ['Y', '-.--'],
  ['Z', '--..'],

  ['0', '-----'],
  ['1', '.----'],
  ['2', '..---'],
  ['3', '...--'],
  ['4', '....-'],
  ['5', '.....'],
  ['6', '-....'],
  ['7', '--...'],
  ['8', '---..'],
  ['9', '----.'],

  ['.', '.-.-.-'],
  [',', '--..--'],
  ['?', '..--..'],
  ["'", '.----.'],
  ['\n', '.-.-'],
  ['!', '-.-.--'],
  ['/', '-..-.'],
  ['(', '-.--.'],
  [')', '-.--.-'],
  ['&', '.-...'],
  [':', '---...'],
  [';', '-.-.-.'],
  ['=', '-...-'],
  ['+', '.-.-.'],
  ['-', '-....-'],
  ['_', '..--.-'],
  ['"', '.-..-.'],
  ['$', '...-..-'],
  ['@', '.--.-.'],
  ['#', '...-.-'],

  ['AA', '.-.-'],
  ['AR', '.-.-.'],
  ['AS', '.-...'],
  ['BT', '-...-'],
  ['BK', '-...-.-'],
  ['CL', '-.-..-..'],
  ['CT', '-.-.-'],
  ['DO', '-..---'],
  ['KA', '-.-.-'],
  ['KN', '-.--.'],
  ['SK', '...-.-'],
  ['VA', '...-.-'],
  ['VE', '...-.'],
  ['SOS', '...---...'],
] as const;

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

export const lookupTokenText = (str: string) => RR.lookup(str.toUpperCase())(CW_TOKEN_LOOKUP);

export const lookupTokenCode = (dot: string, dash: string) => (str: string) =>
  pipe(CW_CODE_LOOKUP, RR.lookup(pipe(str, S.replace(dot, '.'), S.replace(dash, '-'))));

export const stringifyTokens = (m: Message | Word | WordSpace | TokenSpace | Token): string =>
  match(m)
    .with(P.union({ _tag: 'message' }, { _tag: 'word' }), ({ children }) =>
      pipe(children, RNA.map(stringifyTokens), RNA.concatAll(S.Semigroup))
    )
    .with({ _tag: 'prosign' }, ({ str }) => `<${str}>`)
    .with({ _tag: 'character' }, ({ str }) => str)
    .with({ _tag: 'wordspace' }, () => ' ')
    .with({ _tag: 'tokenspace' }, () => '')
    .exhaustive();

export const stringifyCode = (
  m: Message | Token | Word | WordSpace | TokenSpace | Dot | Dash | ToneSpace
): string =>
  match(m)
    .with(
      P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'prosign' }, { _tag: 'character' }),
      ({ children }) => pipe(children, RNA.map(stringifyCode), RNA.concatAll(S.Semigroup))
    )
    .with({ _tag: 'wordspace' }, () => ' / ')
    .with({ _tag: 'tokenspace' }, () => ' ')
    .with({ _tag: 'dot' }, () => '.')
    .with({ _tag: 'dash' }, () => '-')
    .with({ _tag: 'tonespace' }, () => '')
    .exhaustive();

export const stringifyPulses = (
  m: Message | Word | WordSpace | TokenSpace | Token | Dot | Dash | ToneSpace
): string =>
  match(m)
    .with(
      P.union({ _tag: 'message' }, { _tag: 'word' }, { _tag: 'prosign' }, { _tag: 'character' }),
      ({ children }) => pipe(children, RNA.map(stringifyPulses), RNA.concatAll(S.Semigroup))
    )
    .with({ _tag: 'wordspace' }, () => ' ')
    .with({ _tag: 'tokenspace' }, () => '/')
    .with({ _tag: 'dot' }, () => '.')
    .with({ _tag: 'dash' }, () => '-')
    .with({ _tag: 'tonespace' }, () => '|')
    .exhaustive();
