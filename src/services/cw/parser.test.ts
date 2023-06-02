import { parseMessage, parseDitDahString, ditDahSeqFromCwSymbolSeq } from './parser';

import { parseMessage as parseMessage2, stringFromToneSeq } from './parser2';

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/lib/Either';

describe('DitDahSeq', () => {
    it("should work", () => {

        const result = pipe(
            parseMessage2("HELLO, world 73 <BT> \n"),
            E.map((pr) => stringFromToneSeq(pr.value))
        )
        
        console.log(result);
        /*
        const dec = parseDitDahString("--- -.-");
        console.log(dec);
        expect(dec).toEqualRight(['-', '-', '-', ' ', '-', '.', '-']);

        const symDec = parseMessage("HELLO, world 73 <BT> \n");
        console.log(symDec);
        console.log(E.map(ditDahSeqFromCwSymbolSeq)(symDec)); */
    });
});