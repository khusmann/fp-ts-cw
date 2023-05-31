// io-ts
import * as t from 'io-ts';

// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/ReadonlyArray';
import * as R from 'fp-ts/ReadonlyRecord';
import * as M from 'fp-ts/ReadonlyMap';
import { pipe } from 'fp-ts/function';

// parser-ts
import * as P from 'parser-ts/Parser';
import * as PC from 'parser-ts/char'
import * as PS from 'parser-ts/string'
import { run } from 'parser-ts/code-frame'

// local
import { CW_SYMBOLS, CwSymbolInfo } from './constants';

const prosignParser = PS.fold([
    P.succeed('<'),
    pipe(
        PC.many1(PC.upper),
        P.between(PC.char("<"), PC.char(">")),
    ),
    P.succeed('>'),
]);

const messageTokenizer = pipe(
    P.either(prosignParser, P.item<string>),
    P.many1,
)

export const DitDahChar = t.keyof({
    '.': null,
    '-': null,
    ' ': null,
    '/': null,
})

export const DitDahSeq = t.array(DitDahChar);

type DitDahChar = t.TypeOf<typeof DitDahChar>
type DitDahSeq = t.TypeOf<typeof DitDahSeq>;

export const CwSymbol = t.keyof(CW_SYMBOLS);

export const CwSymbolSeq = t.array(CwSymbol);

type CwSymbol = t.TypeOf<typeof CwSymbol>;
type CwSymbolSeq = t.TypeOf<typeof CwSymbolSeq>;

const STR_TO_CW_SYMBOL = pipe(
    CW_SYMBOLS,
    R.foldMapWithIndex(S.Ord)(A.getMonoid<[string, CwSymbol]>())(
        (k, v) => pipe(
            v.str,
            A.map((s) => ([s, k as CwSymbol])),
        ),
    ),
    R.fromEntries,
);

const CW_SYMBOL_MAP = new Map(Object.entries(CW_SYMBOLS)) as ReadonlyMap<CwSymbol, CwSymbolInfo>;

export const ditDahFromCwSymbol = (sym: CwSymbol) => pipe(
    CW_SYMBOL_MAP,
    M.lookup(S.Eq)(sym),
    O.map((symInfo) => symInfo.cw.split('') as DitDahSeq),
    O.getOrElse(() => [] as DitDahSeq),
);

export const ditDahSeqFromCwSymbolSeq = (symSeq: CwSymbolSeq) => pipe(
    symSeq,
    A.flatMap(ditDahFromCwSymbol),
);

export const parseDitDahString = (input: string) => pipe(
    input,
    S.split(''),
    DitDahSeq.decode,
);

export const parseCwString = (input: string) => pipe(
    input,
    S.split(''),
    CwSymbolSeq.decode,
);

export const parseMessageToken = (input: string) => pipe(
    STR_TO_CW_SYMBOL,
    R.lookup(input),
    O.fold(
        () => t.failure(input, [], `Could not find symbol for "${input}"`),
        t.success<CwSymbol>,
    )
)

export const parseMessage = (input: string) => pipe(
    run(messageTokenizer, input.toUpperCase()),
    E.fold(
        (strErr) => t.failure(input, [], strErr),
        t.success<readonly string[]>,
    ),
    E.chain(E.traverseArray(parseMessageToken)),
    E.chain(CwSymbolSeq.decode),
);