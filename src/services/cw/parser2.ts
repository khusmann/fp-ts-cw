// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/ReadonlyArray';
import * as R from 'fp-ts/ReadonlyRecord';
import * as M from 'fp-ts/ReadonlyMap';
import { pipe } from 'fp-ts/function';

// parser-ts
import { parser, char, stream, string } from 'parser-ts';

import { CHAR_LOOKUP, PROSIGN_LOOKUP, LETTER_SEP } from './constants2';

import type { ToneSeq } from './constants2';

const lookupProsign = (s: string): O.Option<ToneSeq> => pipe(
    PROSIGN_LOOKUP,
    R.lookup(s),
);

const lookupSymbol = (s: string): O.Option<ToneSeq> => pipe(
    CHAR_LOOKUP,
    R.lookup(s),
);

const prosignParser = pipe(
    parser.between(char.char("<"), char.char(">"))(char.many1(char.upper)),
    parser.chain((s) => pipe(
        lookupProsign(`<${s}>`),
        O.fold(
            () => parser.fail<string>(),
            (cw) => parser.succeed(cw),
        ),
    )),
);

const charParser = pipe(
    parser.item<string>(),
    parser.chain((s) => pipe(
        lookupSymbol(s.toUpperCase()),
        O.fold(
            () => parser.fail<string>(),
            (cw) => parser.succeed(cw),
        )
    )),
);

const messageParser = pipe(
    parser.many1(parser.either(prosignParser, () => charParser)),
    parser.map(A.flatten),
);

export const parseMessage = (s: string) => pipe(
    stream.stream(s.split('')),
    messageParser,
);

export const stringFromToneSeq = (ts: ToneSeq) => pipe(
    ts,
    A.reduce('', (acc, t) => acc + t),
)