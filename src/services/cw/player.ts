import { AVPlaybackStatus, Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { taskEither as TE, readerTaskEither as RTE, reader as R, readonlyRecord as RR } from 'fp-ts';
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

type AudioPlayer = {
  readonly play: TE.TaskEither<PlayerError, void>;
  readonly stop: TE.TaskEither<PlayerError, void>;
  readonly unload: TE.TaskEither<PlayerError, void>;
};

const playerFromSoundObject = ({ sound }: Audio.SoundObject): AudioPlayer =>
  pipe(
    {
      play: async () => await sound.playAsync(), // Audio.Sound uses weird mixins, so we need to use the ugly async/await syntax
      stop: async () => await sound.stopAsync(), // (instead of just sound.stopAsync())
      unload: async () => await sound.unloadAsync(),
    },
    RR.map((t) =>
      pipe(
        TE.tryCatch(t, (e) => playerError(String(e))),
        TE.chainW((s) => (s.isLoaded ? TE.right(undefined) : TE.left(playerError(s.error ?? 'Unknown error')))),
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

export const playerFromPulseTrain = flow(
  renderSynthSample,
  R.chainW(synthSampleToPcm),
  RTE.fromReader,
  RTE.chainW(playerFromSample),
);
