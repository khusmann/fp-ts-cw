
import * as t from 'io-ts';
import * as S from 'fp-ts/string';
import { pipe } from 'fp-ts/function';
import { CW_SYMBOL_DICT } from './constants';

export const DitDahChar = t.keyof({
    '.': null,
    '-': null,
    ' ': null,
})

export const DitDahSeq = t.array(DitDahChar);

type DitDahChar = t.TypeOf<typeof DitDahChar>
type DitDahSeq = t.TypeOf<typeof DitDahSeq>;

export const parseDitDahString = (input: string) => pipe(
    input,
    S.split(''),
    DitDahSeq.decode,
);

export const CwSymbol = t.keyof(CW_SYMBOL_DICT);

export const CwSymbolSeq = t.array(CwSymbol);

type CwSymbol = t.TypeOf<typeof CwSymbol>;
type CwSymbolSeq = t.TypeOf<typeof CwSymbolSeq>;

export const parseCwSymbolString = (input: string) => pipe(
    input,
    S.toUpperCase,
    S.split(''),
    CwSymbolSeq.decode,
);