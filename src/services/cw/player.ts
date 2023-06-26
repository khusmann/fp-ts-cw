import { AVPlaybackStatus, Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { taskEither as TE, readerTaskEither as RTE, reader as R } from 'fp-ts';
import { pipe, flow } from 'fp-ts/function';
import { WaveFile } from 'wavefile';

import { renderSynthSample, synthSampleToPcm } from './render';
import type { AudioSample } from './render';
import { constantSamples } from './util';

export type OnFinishedSetting = {
  readonly onFinished: () => void;
};

export type PadTimeSetting = {
  readonly padTime: number;
};

export type PlayerError = {
  readonly _tag: 'PlayerError';
  readonly message: string;
};

export type FileSystemError = {
  readonly _tag: 'FileSystemError';
  readonly message: string;
};

const filesystemError = (message: string): FileSystemError => ({ _tag: 'FileSystemError', message });
const playerError = (message: string): PlayerError => ({ _tag: 'PlayerError', message });

const writeTempFile = ({ sampleRate, bitDepth, data }: AudioSample) =>
  pipe(
    RTE.ask<PadTimeSetting>(),
    RTE.chainTaskEitherKW(({ padTime }) => {
      const pad = constantSamples(0)(padTime, sampleRate);
      const tempfile = FileSystem.cacheDirectory + 'temp.wav';

      const wav = new WaveFile();
      wav.fromScratch(1, sampleRate, bitDepth.toString(), [...pad, ...data, ...pad]);

      return TE.tryCatch<FileSystemError, string>(
        async () => {
          await FileSystem.writeAsStringAsync(tempfile, wav.toBase64(), { encoding: FileSystem.EncodingType.Base64 });
          return tempfile;
        },
        (e) => filesystemError(String(e)),
      );
    }),
  );

const createPlayer =
  (uri: string) =>
  ({ onFinished }: OnFinishedSetting) =>
    pipe(
      TE.tryCatch(
        () => Audio.Sound.createAsync({ uri }, {}, (s) => s.isLoaded && s.didJustFinish && onFinished()),
        (e) => playerError(String(e)),
      ),
      TE.map(({ sound }: Audio.SoundObject) => sound),
    );

const leftIfAVPlaybackError = (status: AVPlaybackStatus) =>
  status.isLoaded ? TE.right(status) : TE.left(playerError(status.error ?? 'Unknown error'));

const playPlayer = (player: Audio.Sound) =>
  pipe(
    TE.tryCatch(
      async () => await player.playAsync(),
      (e) => playerError(String(e)),
    ),
    TE.chain(leftIfAVPlaybackError),
  );

const playAudioSample = flow(writeTempFile, RTE.chainW(createPlayer), RTE.tapTaskEither(playPlayer));

export const playPulseTrain = flow(
  renderSynthSample,
  R.chainW(synthSampleToPcm),
  RTE.fromReader,
  RTE.chainW(playAudioSample),
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
