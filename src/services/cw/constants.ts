import * as NEA from 'fp-ts/ReadonlyNonEmptyArray';

export const WORD_SEP = '/';
export const LETTER_SEP = '|';
export const TONE_SEP = ' ';
export const DIT = '.';
export const DAH = '-';

export type PulseType = typeof WORD_SEP | typeof LETTER_SEP | typeof TONE_SEP | typeof DIT | typeof DAH;

export type Pulse = {
    readonly type: PulseType;
}

export type PulseSeq = NEA.ReadonlyNonEmptyArray<Pulse>;

const _CHAR_LOOKUP = {
    'A': '.-',
    'B': '-...',
    'C': '-.-.',
    'D': '-..',
    'E': '.',
    'F': '..-.',
    'G': '--.',
    'H': '....',
    'I': '..',
    'J': '.---',
    'K': '-.-',
    'L': '.-..',
    'M': '--',
    'N': '-.',
    'O': '---',
    'P': '.--.',
    'Q': '--.-',
    'R': '.-.',
    'S': '...',
    'T': '-',
    'U': '..-',
    'V': '...-',
    'W': '.--',
    'X': '-..-',
    'Y': '-.--',
    'Z': '--..',
    
    '0': '-----',
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
    '6': '-....',
    '7': '--...',
    '8': '---..',
    '9': '----.',

    '.': '.-.-.-',
    ',': '--..--',
    '?': '..--..',
    '\'': '.----.',
    '\n': '.-.-',
    '!': '-.-.--',
    '/': '-..-.',
    '(': '-.--.',
    ')': '-.--.-',
    '&': '.-...',
    ':': '---...',
    ';': '-.-.-.',
    '=': '-...-',
    '+': '.-.-.',
    '-': '-....-',
    '_': '..--.-',
    '"': '.-..-.',
    '$': '...-..-',
    '@': '.--.-.',
    '#': '...-.-',
};

const _PROSIGN_LOOKUP = {
    '<AA>': '.-.-',
    '<AR>': '.-.-.',
    '<AS>': '.-...',
    '<BT>': '-...-',
    '<BK>': '-...-.-',
    '<CL>': '-.-..-..',
    '<CT>': '-.-.-',
    '<DO>': '-..---',
    '<KA>': '-.-.-',
    '<KN>': '-.--.',
    '<SK>': '...-.-',
    '<VA>': '...-.-',
    '<VE>': '...-.',
    '<SOS>': '...---...',
};

const _reformatLookup = (lookup: Record<string, string>) => Object.entries(lookup).reduce(
    (acc, [k, v]) => ({...acc, [k]: v.split('').join(TONE_SEP).split('').map((p) => ({ type: p })) as unknown as PulseSeq }),
    {} as Record<string, PulseSeq>,
)

export const CHAR_LOOKUP = _reformatLookup(_CHAR_LOOKUP);
export const PROSIGN_LOOKUP = _reformatLookup(_PROSIGN_LOOKUP);