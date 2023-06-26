import { readerEither as RE, readerTaskEither as RTE } from 'fp-ts';
import { flow } from 'fp-ts/function';

import { DEFAULT_PARSE_TEXT_SETTINGS, parseTextStr } from './parser';
import { OnFinishedSetting, playAudioSample } from './player';
import { buildPulseTrain, renderSynthSample, synthSampleToPcm, calculateTimings } from './render';
import type { WpmSettings, VolumeSetting, FreqSetting } from './render';

const DEFAULT_SETTINGS = {
  sampleRate: 8000,
  bitDepth: 16,
  padTime: 0.05,
  rampTime: 0.005, // Recommended by ARRL
} as const;

export const playMessage = flow(
  parseTextStr,
  RE.chainReaderKW(buildPulseTrain),
  RE.chainReaderKW(renderSynthSample),
  RE.chainReaderKW(synthSampleToPcm),
  RTE.fromReaderEither,
  RTE.chainW(playAudioSample),
  RTE.local((s: OnFinishedSetting & WpmSettings & VolumeSetting & FreqSetting) => ({
    ...DEFAULT_PARSE_TEXT_SETTINGS,
    ...DEFAULT_SETTINGS,
    ...calculateTimings(s),
    ...s,
  })),
);
