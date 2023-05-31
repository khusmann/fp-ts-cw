import { parseMessage, parseDitDahString } from './parser';

describe('DitDahSeq', () => {
    it("should work", () => {
        const dec = parseDitDahString("--- -.-");
        console.log(dec);
        expect(dec).toEqualRight(['-', '-', '-', ' ', '-', '.', '-']);

        const symDec = parseMessage("HELLO, world 73 <BT> \n");
        console.log(symDec);
    });
});