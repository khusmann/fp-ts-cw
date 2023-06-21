import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { run } from 'parser-ts/code-frame';

import * as ast from './ast';
import * as codeParser from './codeparser';
import * as textParser from './textparser';

describe('ToneSeq', () => {
  it('decodes valid text with prosigns', () => {
    const result = run(textParser.parseMessage(), 'HELLo, + world  73 <BT>  <BK>\n');

    pipe(
      result,
      E.map((pr) => ast.stringifyTokens(pr)),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map((pr) => ast.stringifyCode(pr)),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map((pr) => ast.stringifyPulses(pr)),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
  });
  it('decodes valid text with prosigns', () => {
    const result = run(
      codeParser.parseMessage(),
      '.... . .-.. .-.. --- --..-- / .-.-. / .-- --- .-. .-.. -.. // --... ...-- / -...-//-...-.- .-.-'
    );

    pipe(
      result,
      E.map((pr) => ast.stringifyTokens(pr)),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map((pr) => ast.stringifyCode(pr)),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map((pr) => ast.stringifyPulses(pr)),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
  });
});

/*
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
*/
