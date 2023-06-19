// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RT from 'fp-ts/ReadonlyTuple';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as R from 'fp-ts/Reader';
import { pipe, flow } from 'fp-ts/function';

export const DOT = { _tag: 'dot' } as const;

export type Dot = typeof DOT;

export const DASH = { _tag: 'dash' } as const;

export type Dash = typeof DASH;

export const TONE_SPACE = { _tag: 'tonespace' } as const;

export type ToneSpace = typeof TONE_SPACE;

export const LETTER_SPACE = { _tag: 'letterspace' } as const;

export type LetterSpace = typeof LETTER_SPACE;

export const WORD_SPACE = { _tag: 'wordspace' } as const;

export type WordSpace = typeof WORD_SPACE;

export const Character = (str: string, children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>) => ({
    _tag: 'character',
    str,
    children,
} as const);

export type Character = ReturnType<typeof Character>;

export const Prosign = (str: string, children: RNA.ReadonlyNonEmptyArray<Dot | Dash | ToneSpace>) => ({
    _tag: 'prosign',
    str,
    children,
} as const);

export type Prosign = ReturnType<typeof Prosign>;

export type Token = Character | Prosign;

export const Word = (children: RNA.ReadonlyNonEmptyArray<Token | LetterSpace>) => ({
    _tag: 'word',
    children,
} as const);

export type Word = ReturnType<typeof Word>;

export const Message = (children: RNA.ReadonlyNonEmptyArray<Word | WordSpace>) => ({
    _tag: 'message',
    children,
} as const);

export type Message = ReturnType<typeof Message>;

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
    ['\'', '.----.'],
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

const _pulsesFromCode = flow(
    S.split(''),
    RNA.map((c) => c === '.' ? DOT : DASH),
    RNA.intersperse<Dot | Dash | ToneSpace>(TONE_SPACE),
)

const _tokenFromCode = (str: string, code: string): Token => (
    str.length === 1 ? Character(str, _pulsesFromCode(code)) : Prosign(str, _pulsesFromCode(code))
)

export const CW_TOKEN_LOOKUP = pipe(
    CW_SYMBOLS,
    RNA.map(([str, code]) => [str, _tokenFromCode(str, code)] as const),
    RR.fromEntries,
)