/* istanbul ignore file */
import { taskEither as TE, readerTaskEither as RTE, reader as R, readonlyRecord as RR } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';

import type { AudioPlayer, OnFinishedSetting, PadTimeSetting, PlayerFromPulseTrainAPI } from './player';
import { renderSynthSample } from './render';
import type { SynthSample } from './render';
import { constantSamples } from './util';

const playerFromSynthSample =
  ({ freq, sampleRate, envelope }: SynthSample) =>
  ({ onFinished, padTime }: OnFinishedSetting & PadTimeSetting): AudioPlayer => {
    const pad = constantSamples(0)(padTime, sampleRate);
    const paddedEnvelope = [...pad, ...envelope, ...pad];

    const handle = new AudioContext();
    const gain = handle.createGain();
    gain.connect(handle.destination);

    const oscillator = handle.createOscillator();
    oscillator.type = 'sine';
    oscillator.connect(gain);

    gain.gain.value = 0;
    oscillator.frequency.value = freq;
    oscillator.start();

    let timeoutId: number | undefined = undefined;

    const play = () => {
      gain.gain.setValueCurveAtTime(paddedEnvelope, handle.currentTime, envelope.length / sampleRate);
      timeoutId = window.setTimeout(onFinished, (paddedEnvelope.length / sampleRate) * 1000);
    };

    const stop = () => {
      gain.gain.cancelScheduledValues(handle.currentTime);
      gain.gain.value = 0;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const unload = () => {
      stop();
      handle.close();
    };

    return pipe(
      {
        play,
        stop,
        unload,
      },
      RR.map(TE.fromIO),
    );
  };

export { DEFAULT_PLAYER_SETTINGS } from './player';

export const playerFromPulseTrain: PlayerFromPulseTrainAPI = flow(
  renderSynthSample,
  R.chainW(playerFromSynthSample),
  RTE.fromReader,
);
