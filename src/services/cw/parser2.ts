// fp-ts
import * as S from 'fp-ts/string';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as R from 'fp-ts/Reader';
import { pipe } from 'fp-ts/function';

import { match, P } from 'ts-pattern';

// parser-ts
import { parser, char, stream, string, } from 'parser-ts';

import { CW_TOKEN_LOOKUP, WORD_SPACE, Word, Message, LETTER_SPACE, CW_CODE_LOOKUP } from './constants2';

import type { Character, Prosign, WordSpace, LetterSpace, Dot, Dash, ToneSpace, Token } from './constants2';

const parserFromOption = <I>(): (<O>(o: O.Option<O>) => parser.Parser<I, O>) => (
    O.fold(
        () => parser.fail<I>(),
        (o) => parser.succeed(o),
    )
);

const parseProsignText = pipe(
    parser.between(char.char("<"), char.char(">"))(char.many1(char.upper)),
    parser.map((s) => RR.lookup(s)(CW_TOKEN_LOOKUP)),
    parser.chain(parserFromOption()),
);

const parseCharacterText = pipe(
    parser.item<string>(),
    parser.map((s) => RR.lookup(s.toUpperCase())(CW_TOKEN_LOOKUP)),
    parser.chain(parserFromOption()),
)

const parseWordSpaceText = pipe(
    char.char(' '),
    parser.map(() => WORD_SPACE),
);

const parseTokenText = parser.either<string, Token>(parseProsignText, () => parseCharacterText);

const parseWordText = pipe(
    parser.many1(parseTokenText),
    parser.map(RNA.intersperse<Token | LetterSpace>(LETTER_SPACE)),
    parser.map(Word),
);

export const parseMessageText: parser.Parser<string, Message> = parser.expected(
    pipe(
        parser.many1Till(parser.either<string, Word | WordSpace>(parseWordText, () => parseWordSpaceText), parser.eof()),
        parser.map(Message),
    ),
    "valid character or prosign"
);

const parseWordSpaceCode = pipe(
    char.char('/'),
    parser.chain(() => parser.succeed(WORD_SPACE)),
);

const parseTokenCode = pipe(
    string.many1(parser.either(char.char('.'), () => char.char('-'))),
    parser.map((s) => RR.lookup(s)(CW_CODE_LOOKUP)),
    parser.chain(parserFromOption()),
);

const parseWordCode = pipe(
    parser.sepBy1(parser.many(char.space), parseTokenCode),
    parser.map(RNA.intersperse<Token | LetterSpace>(LETTER_SPACE)),
    parser.map(Word),
);

export const parseMessageCode = parser.expected(
    pipe(
        parser.many1Till(
            parser.surroundedBy(parser.many(char.space))(
                parser.either<string, Word | WordSpace>(parseWordCode, () => parseWordSpaceCode)
            ), parser.eof(),
        ),
        parser.map(Message),
    ),
    "valid character or prosign",
);