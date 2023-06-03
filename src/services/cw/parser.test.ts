import { parseMessage, stringFromPulseSeq, messageParser, pulseTimingFromPulseSeq } from './parser';

import { run } from 'parser-ts/code-frame';

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as R from 'fp-ts/Reader';

describe("ToneSeq", () => {
    it("decodes valid text with prosigns", () => {
        const result = pipe(
            run(messageParser, "HELLo, + world 73 <BT>  \n"),
            E.map((pr) => stringFromPulseSeq(pr)),
        )
        expect(result).toEqualRight(".... . .-.. .-.. --- --..-- / .-.-. / .-- --- .-. .-.. -.. / --... ...-- / -...- / .-.-");
    })
    it("errors on invalid prosigns", () => {
        const result = pipe(
            parseMessage("<BR>"),
        )
        expect(result).toBeLeft();
    });
    it("debug", () => {
        const result = pipe(
            { freq: 700, wpm: 20, farnsworth: 10, ews: 0 },
            pipe(
                run(messageParser, "HELLo, + world 73 <BT>  \n"),
                E.map((pr) => pulseTimingFromPulseSeq(pr)),
                E.sequence(R.Applicative)
            )
        )
        console.log(result);
    });
});