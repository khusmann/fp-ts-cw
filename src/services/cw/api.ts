/* istanbul ignore file */
import { readerTaskEither as RTE } from 'fp-ts';
import { flow } from 'fp-ts/function';

import { DEFAULT_PARSE_TEXT_SETTINGS, parseTextStr } from './parser';
import { DEFAULT_PLAYER_SETTINGS, OnFinishedSetting, playerFromSynthSample } from './player';
import {
  DEFAULT_AUDIO_SETTINGS as DEFAULT_RENDER_SETTINGS,
  buildPulseTrain,
  calculateTimings,
  renderSynthSample,
} from './render';
import type { WpmSettings, VolumeSetting, FreqSetting } from './render';

export const audioPlayerFromMessage = flow(
  RTE.fromReaderEitherK(parseTextStr),
  RTE.chainW(RTE.fromReaderK(buildPulseTrain)),
  RTE.chainW(RTE.fromReaderK(renderSynthSample)),
  RTE.chainW(playerFromSynthSample),
  RTE.local((s: OnFinishedSetting & WpmSettings & VolumeSetting & FreqSetting) => ({
    ...DEFAULT_PARSE_TEXT_SETTINGS,
    ...DEFAULT_RENDER_SETTINGS,
    ...DEFAULT_PLAYER_SETTINGS,
    ...calculateTimings(s),
    ...s,
  })),
);
