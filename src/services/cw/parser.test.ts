import { parseMessage, stringFromToneSeq, messageParser } from './parser';

import { run } from 'parser-ts/code-frame';

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/lib/Either';

describe('DitDahSeq', () => {
    it("should work", () => {
        pipe(
            parseMessage("HELLO, world 73 <BT> \n"),
            E.map((pr) => stringFromToneSeq(pr.value)),
            E.fold((e) => e.expected.join('\n'), (s) => s),
            console.log,
        )
        
        pipe(
            run(messageParser, "HELLo, + world 73 <BT>  \n"),
            E.map((pr) => stringFromToneSeq(pr)),
            E.fold((e) => e, (s) => s),
            console.log,
        )
    });
});