import { readerEither as RE, readerTaskEither as RTE } from 'fp-ts';
import { flow } from 'fp-ts/function';

import { DEFAULT_PARSE_TEXT_SETTINGS, parseTextStr } from './parser';
import { OnFinishedSetting, playerFromPulseTrain } from './player';
import { buildPulseTrain, calculateTimings } from './render';
import type { WpmSettings, VolumeSetting, FreqSetting } from './render';

const DEFAULT_AUDIO_SETTINGS = {
  sampleRate: 8000,
  bitDepth: 16,
  padTime: 0.05,
  rampTime: 0.005, // Recommended by ARRL. See Section 2.202 of FCC rules and CCIR Radio regulations.
} as const;

export const audioPlayerFromMessage = flow(
  parseTextStr,
  RE.chainReaderKW(buildPulseTrain),
  RTE.fromReaderEither,
  RTE.chainW(playerFromPulseTrain),
  RTE.local((s: OnFinishedSetting & WpmSettings & VolumeSetting & FreqSetting) => ({
    ...DEFAULT_PARSE_TEXT_SETTINGS,
    ...DEFAULT_AUDIO_SETTINGS,
    ...calculateTimings(s),
    ...s,
  })),
);
