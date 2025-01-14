/* istanbul ignore file */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { taskEither as TE, readerTaskEither as RTE, readonlyRecord as RR, identity as I } from 'fp-ts';
import { pipe, flow } from 'fp-ts/function';
import { WaveFile } from 'wavefile';

import { synthSampleToPcm } from './render';
import type { AudioSample } from './render';
import { constantSamples } from './util';

export const DEFAULT_PLAYER_SETTINGS: PadTimeSetting = {
  padTime: 0.05,
};

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

export type AudioPlayer = {
  readonly play: TE.TaskEither<PlayerError, void>;
  readonly stop: TE.TaskEither<PlayerError, void>;
  readonly unload: TE.TaskEither<PlayerError, void>;
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

const playerFromSoundObject = ({ sound }: Audio.SoundObject): AudioPlayer =>
  pipe(
    {
      play: () => sound.playAsync(), // Audio.Sound uses weird mixins, so we need use the lazy function here
      stop: () => sound.stopAsync(), // (instead of just sound.stopAsync())
    },
    RR.map((t) =>
      pipe(
        TE.tryCatch(t, (e) => playerError(String(e))),
        TE.chainW((s) => (s.isLoaded ? TE.right(undefined) : TE.left(playerError(s.error ?? 'Unknown error')))),
      ),
    ),
    I.bind('unload', () =>
      pipe(
        TE.tryCatch(
          () => sound.unloadAsync(),
          (e) => playerError(String(e)),
        ),
        TE.chainW((s) => (s.isLoaded ? TE.left(playerError('Unable to unload audio sample')) : TE.right(undefined))),
      ),
    ),
  );

const createPlayer =
  (uri: string) =>
  ({ onFinished }: OnFinishedSetting) =>
    pipe(
      TE.tryCatch(
        () => Audio.Sound.createAsync({ uri }, {}, (s) => s.isLoaded && s.didJustFinish && onFinished()),
        (e) => playerError(String(e)),
      ),
      TE.map(playerFromSoundObject),
    );

const playerFromSample = flow(writeTempFile, RTE.chainW(createPlayer));

export const playerFromSynthSample = flow(RTE.fromReaderK(synthSampleToPcm), RTE.chainW(playerFromSample));

export type PlayerFromSynthSampleAPI = typeof playerFromSynthSample;
