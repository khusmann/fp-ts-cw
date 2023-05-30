import { parseCwSymbolString, parseDitDahString } from './parser';

describe('DitDahSeq', () => {
    it("should work", () => {
        const dec = parseDitDahString("--- -.-");
        console.log(dec);
        expect(dec).toEqualRight(['-', '-', '-', ' ', '-', '.', '-']);

        const symDec = parseCwSymbolString("HELLO, world 73");
        console.log(symDec);
    });
});