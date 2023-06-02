import { parseMessage, stringFromToneSeq } from './parser';

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/lib/Either';

describe('DitDahSeq', () => {
    it("should work", () => {
        const result = pipe(
            parseMessage("HELLO, world  73 <BT> \n"),
            E.map((pr) => stringFromToneSeq(pr.value))
        )
        
        console.log(result);
    });
});