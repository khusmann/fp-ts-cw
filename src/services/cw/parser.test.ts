import { parseMessage, parseDitDahString, ditDahSeqFromCwSymbolSeq } from './parser';

import * as E from 'fp-ts/lib/Either';

describe('DitDahSeq', () => {
    it("should work", () => {
        const dec = parseDitDahString("--- -.-");
        console.log(dec);
        expect(dec).toEqualRight(['-', '-', '-', ' ', '-', '.', '-']);

        const symDec = parseMessage("HELLO, world 73 <BT> \n");
        console.log(symDec);
        console.log(E.map(ditDahSeqFromCwSymbolSeq)(symDec));
    });
});