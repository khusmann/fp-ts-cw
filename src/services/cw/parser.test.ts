import { readerEither as RE, reader as R } from 'fp-ts';
import { pipe, apply } from 'fp-ts/function';

import { parseTextStr, parseCodeStr, DEFAULT_PARSE_TEXT_SETTINGS, DEFAULT_PARSE_CODE_SETTINGS } from './parser';
import { calculateTimings, renderAudioSample, renderSynthSample } from './render';

describe('ToneSeq', () => {
  it('decodes valid text with prosigns', () => {
    pipe(
      'HELLo, + world  73 <BT>  <BK>\n',
      parseTextStr,
      RE.chainReaderKW(renderAudioSample),
      RE.map((s) => s.data.join(' ')),
      RE.match(
        (e) => `Expected: ${e.expected} (idx: ${e.idx})`,
        (s) => s,
      ),
      apply({
        ...DEFAULT_PARSE_TEXT_SETTINGS,
        ...calculateTimings({ wpm: 20, farnsworth: 10, ews: 0 }),
        ...({ freq: 700, sampleRate: 8000, bitRate: 16, padTime: 0.05, rampTime: 0.005, volume: 1 } as const),
      }),
      console.log,
    );
    /*
    const result = run(textParser.parseMessage, 'HELLo, + world  73 <BT>  <BK>\n');

    pipe(
      result,
      E.map(ast.stringifyTokens),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map(ast.stringifyCode),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map(ast.stringifyPulses),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
  });
  it('decodes valid text with prosigns', () => {
    const result = run(
      codeParser.message,
      '.... . .-.. .-.. --- --..-- / .-.-. / .-- --- .-. .-.. -.. // --... ...-- / -...-//-...-.- .-.-'
    );

    pipe(
      result,
      E.map(ast.stringifyTokens),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map(ast.stringifyCode),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );
    pipe(
      result,
      E.map(ast.stringifyPulses),
      E.fold(
        (e) => e,
        (a) => a
      ),
      console.log
    );

    const cwSettings = {
      freq: 700,
      wpm: 20,
      farnsworth: 10,
      ews: 0,
      volume: 1,
    };

    pipe(
      run(textParser.parseMessage, 'HELLo, + world  73 <BT>  <BK>\n'),
      E.map(
        flow(
          ast.buildPulseTrain,
          R.chain(ast.pcmFromPulseTrain),
          apply({
            ...cwSettings,
            ...ast.DEFAULT_AUDIO_SETTINGS,
          })
        )
      ),
      E.fold(
        (e) => e,
        (a) => a.join(' ')
      ),
      console.log
    );
  */
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
