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
import { parser, char, stream } from 'parser-ts';

import { CW_TOKEN_LOOKUP, WORD_SPACE, Word, Message, LETTER_SPACE } from './constants2';

import type { Character, Prosign, WordSpace, LetterSpace, Dot, Dash, ToneSpace, Token } from './constants2';

const parserFromOption = <I>(): (<O>(o: O.Option<O>) => parser.Parser<I, O>) => (
    O.fold(
        () => parser.fail<I>(),
        (o) => parser.succeed(o),
    )
);

const prosignParser = pipe(
    parser.between(char.char("<"), char.char(">"))(char.many1(char.upper)),
    parser.map((s) => RR.lookup(s)(CW_TOKEN_LOOKUP)),
    parser.chain(parserFromOption()),
);

const charParser = pipe(
    parser.item<string>(),
    parser.map((s) => RR.lookup(s.toUpperCase())(CW_TOKEN_LOOKUP)),
    parser.chain(parserFromOption()),
)

const wordSpaceParser = pipe(
    char.char(' '),
    parser.map(() => WORD_SPACE),
);

const tokenParser = parser.either<string, Token>(prosignParser, () => charParser);

const wordParser = pipe(
    parser.many1(tokenParser),
    parser.map(RNA.intersperse<Token | LetterSpace>(LETTER_SPACE)),
    parser.map(Word),
);

export const messageParser: parser.Parser<string, Message> = parser.expected(
    pipe(
        parser.many1Till(parser.either<string, Word | WordSpace>(wordParser, () => wordSpaceParser), parser.eof()),
        parser.map(Message),
    ),
    "valid character or prosign"
);

export const stringifyTokens = (m: Message | Prosign | Character | Word | WordSpace | LetterSpace | Prosign) => (
    match(m)
    .with(P.union(
        { _tag: 'message' },
        { _tag: 'word' },
    ), ({ children }) => pipe(
        children,
        RNA.map(stringifyTokens),
        RNA.concatAll(S.Semigroup),
    ))
    .with({ _tag: 'prosign' }, ({ str }) => `<${str}>`)
    .with({ _tag: 'character' }, ({ str }) => str)
    .with({ _tag: 'wordspace' }, () => ' ')
    .with({ _tag: 'letterspace' }, () => '')
    .exhaustive()
)

export const stringifyCode = (m: Message | Prosign | Character | Word | WordSpace | LetterSpace | Prosign | Dot | Dash | ToneSpace) => (
    match(m)
    .with(P.union(
        { _tag: 'message' },
        { _tag: 'word' },
        { _tag: 'prosign' },
        { _tag: 'character' },
    ), ({ children }) => pipe(
        children,
        RNA.map(stringifyCode),
        RNA.concatAll(S.Semigroup),
    ))
    .with({ _tag: 'wordspace' }, () => ' / ')
    .with({ _tag: 'letterspace' }, () => ' ')
    .with({ _tag: 'dot' }, () => '.')
    .with({ _tag: 'dash' }, () => '-')
    .with({ _tag: 'tonespace' }, () => '')
    .exhaustive()
);

export const stringifyPulses = (m: Message | Prosign | Character | Word | WordSpace | LetterSpace | Prosign | Dot | Dash | ToneSpace) => (
    match(m)
    .with(P.union(
        { _tag: 'message' },
        { _tag: 'word' },
        { _tag: 'prosign' },
        { _tag: 'character' },
    ), ({ children }) => pipe(
        children,
        RNA.map(stringifyPulses),
        RNA.concatAll(S.Semigroup),
    ))
    .with({ _tag: 'wordspace' }, () => ' ')
    .with({ _tag: 'letterspace' }, () => '/')
    .with({ _tag: 'dot' }, () => '.')
    .with({ _tag: 'dash' }, () => '-')
    .with({ _tag: 'tonespace' }, () => '|')
    .exhaustive()
);


