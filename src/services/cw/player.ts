import * as R from 'fp-ts/Reader';
import * as RT from 'fp-ts/ReaderTask';
import * as RNA from 'fp-ts/ReadonlyNonEmptyArray';
import * as T from 'fp-ts/Task';
import { pipe } from 'fp-ts/function';

import * as ast from './ast';

type ParseSettings = {
  foo: string;
};

const parseMessage = (message: string): R.Reader<ParseSettings, ast.Message> =>
  pipe(
    R.ask<ParseSettings>(),
    R.map(() => ast.message([ast.WORD_SPACE])),
  );

type ToneEnvelope = {
  bitRate: 16 | 24;
  sampleRate: 8000 | 16000 | 32000 | 44100 | 48000;
  freq: number;
  data: RNA.ReadonlyNonEmptyArray<number>;
};

const envelopeFromAst = (message: ast.Message): R.Reader<ast.CwSettings & ast.AudioSettings, ToneEnvelope> =>
  pipe(
    R.ask<ast.CwSettings>(),
    R.map(() => ({ bitRate: 16, sampleRate: 8000, freq: 700, data: [0] })),
  );

type Pcm = {
  bitRate: 16 | 24;
  sampleRate: 8000 | 16000 | 32000 | 44100 | 48000;
  data: RNA.ReadonlyNonEmptyArray<number>;
};

const pcmFromEnvelope = (envelope: ToneEnvelope): Pcm => ({
  bitRate: envelope.bitRate,
  sampleRate: envelope.sampleRate,
  data: envelope.data,
});

type PlayerConfig = {
  onFinished: () => void;
};

const playPcm =
  (pcm: Pcm): T.Task<number> =>
  async () => {
    console.log('playing pcm: ', pcm);
    return 0;
  };

const doSomething = (i: number): R.Reader<PlayerConfig, number> =>
  pipe(
    R.ask<PlayerConfig>(),
    R.map(() => 0),
  );

export const playMessage = (message: string) =>
  pipe(
    message,
    parseMessage,
    R.chainW(envelopeFromAst),
    R.map(pcmFromEnvelope),
    RT.fromReader,
    RT.flatMapTask(playPcm),
    RT.map(doSomething),
  );

export const playMessage2 = (message: string) =>
  pipe(
    message,
    parseMessage,
    R.chainW(envelopeFromAst),
    RT.fromReader,
    RT.flatMapTask(playPcm),
    RT.chainReaderKW(doSomething),
  );

//import { createMachine, interpret } from 'xstate';
// State machine definition
// machine.transition(...) is a pure function used by the interpreter.
//const playerMachine = createMachine({
//  /** @xstate-layout N4IgpgJg5mDOIC5QAcA2BDAnmATgOgEsA7AgFwGIAlAUQEEARATQG0AGAXURQHtYyDuRLiAAeiALQBGVpLwBmAOwAWVnICcrJXIBMS7QrkAaEJkQA2BXgXWFADh0BWVmskO3AX3fG0WXIQioYOQACgAytCwcwsi8-ILCYghmtngOutq2DpJqDuqsZmrGpgiSeni2ktaKcrZmrFlm2p7eGNj4qNzoEMRQ5BCCYIREAG7cANaDsKToOKTBrbhsnEggMXykAkIriXJ1qclZSjlqNWraRYilSvLakmZaydoyBUrNqwvtnd1Evbg43PgfKQAGYAgC2eCmMzmHyW0ViG3i20Q2jM8hUR0ymkamVsSguCF0sm0JMkclUFhyGTePjaeFpPXIAGUACoAeWCcJWaziW1AiSUmTwajUyWUtTUtgUWQJKlY5UlelOdlUkhpH3prUZ9DZADlqFyeOtNgkUeT5GZSmZdgUZOoFATyXJUko3JbpS41ApSurfPgptxkMhGf0iINiKMJpDSIH5n7DasESbkQhxCc8EolJJMkpGpp8mZHfU8Jo1LnbPUHHKFL66QGg4y-gDNegQeDo7HYVFuUmkfyJGcrN7USTnLkKrLWCky6KybsnvYfW8iNwIHBoh94ca+6IJK40dIHBVWFO5OpboUTBIpRmztntHI3LmHI1a35iGQt7zTanpClD8ep7ntkBLiPKdoyJmHqaFmGSCm++AEAEYBfoifK7r+U54AB0hAXel7FKU2jlJo3qVIKFhyHcCF4B0XQ9Khyb9iUkpWKUchKAojRZOktgEpI2Q3HcijWFWujqDRDI-IxO4CsoeBPGYTgiuJZJVkWzq5NoVbONpuaKGYNH1sG0k9tu6GJOkGYWPUub3NaXqOtYGasA+nHkrYFaZp4nhAA */
//  id: 'player',
//  initial: 'init',
//  context: {},
//  states: {
//    init: { on: { READY: 'idle' } },
//    idle: { on: { PLAY: 'loading' } },
//    loading: { invoke: { id: 'startPlayer', src: async (context, event) => {}, onDone: 'playing', onError: 'idle' } },
//    playing: { on: { STOP: 'stopping', DONE: 'idle' } },
//    stopping: { invoke: { id: 'stopPlayer', src: async (context, event) => {}, onDone: 'idle', onError: 'idle' } },
//  },
//});

// Machine instance with internal state
//const toggleActor = interpret(playerMachine);
//toggleActor.subscribe((state) => console.log(state.value));
//toggleActor.start();
// => logs 'inactive'

//toggleActor.send({ type: 'TOGGLE' });
// => logs 'active'

//toggleActor.send({ type: 'TOGGLE' });
