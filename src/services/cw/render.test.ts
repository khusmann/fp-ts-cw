import { pipe, apply } from 'fp-ts/function';

import * as ast from './ast';
import { calculateTimings, renderSynthSample, tone, silence, buildPulseTrain, synthSampleToPcm } from './render';

describe('calculateTimings', () => {
  it('calculates timings', () => {
    const wpm = 20;
    const farnsworth = 10;
    const ews = 1;
    const result = calculateTimings({ wpm, farnsworth, ews });
    expect(result.dotTime).toBeCloseTo(0.06);
    expect(result.dashTime).toBeCloseTo(0.18);
    expect(result.tokenSpaceTime).toBeCloseTo(0.653);
    expect(result.wordSpaceTime).toBeCloseTo(3.05);
  });
});

describe('buildPulseTrain', () => {
  it('builds a pulse train from a message', () => {
    const dotTime = 1;
    const dashTime = 2;
    const tokenSpaceTime = 3;
    const wordSpaceTime = 4;
    const result = pipe(
      ast.message([ast.word([ast.CW_TOKEN_LOOKUP['A'], ast.TOKEN_SPACE, ast.CW_TOKEN_LOOKUP['E']]), ast.WORD_SPACE]),
      buildPulseTrain,
      apply({ dotTime, dashTime, tokenSpaceTime, wordSpaceTime }),
    );
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual(tone(dotTime));
    expect(result[1]).toEqual(silence(dotTime));
    expect(result[2]).toEqual(tone(dashTime));
    expect(result[3]).toEqual(silence(tokenSpaceTime));
    expect(result[4]).toEqual(tone(dotTime));
    expect(result[5]).toEqual(silence(wordSpaceTime));
  });
});

describe('renderSynthSample', () => {
  it('creates properly shaped envelopes', () => {
    const sampleRate = 8000 as const;
    const rampTime = 0.005;
    const volume = 0.5;
    const freq = 600;

    const s = pipe([silence(1)] as const, renderSynthSample, apply({ sampleRate, rampTime, volume, freq }));

    expect(s.envelope).toHaveLength(sampleRate);
    expect(s.freq).toBe(freq);
    expect(s.sampleRate).toBe(sampleRate);
    expect(s.envelope.reduce((acc, v) => acc || v)).toBe(0);

    const t = pipe([tone(1)] as const, renderSynthSample, apply({ sampleRate, rampTime, volume, freq }));

    expect(t.envelope).toHaveLength(sampleRate);
    expect(t.freq).toBe(freq);
    expect(t.sampleRate).toBe(sampleRate);

    expect(t.envelope[0]).toBe(0);
    expect(t.envelope[t.envelope.length - 1]).toBe(0);

    expect(t.envelope[rampTime * sampleRate]).toBe(volume);
    expect(t.envelope[(1 - rampTime) * sampleRate - 1]).toBe(volume);

    expect(t.envelope[rampTime * sampleRate - 1]).toBeLessThan(volume);
    expect(t.envelope[(1 - rampTime) * sampleRate]).toBeLessThan(volume);
  });
});

describe('synthSampleToPcm', () => {
  const freq = 8000 / 4;
  const bitDepth = 16 as const;
  const sampleRate = 8000 as const;
  const envelope = [1, 1, 1, 1, 1] as const;

  const result = pipe({ freq, sampleRate, envelope } as const, synthSampleToPcm, apply({ bitDepth }));

  expect(result.sampleRate).toBe(sampleRate);
  expect(result.bitDepth).toBe(bitDepth);
  expect(result.data[0]).toBeCloseTo(0);
  expect(result.data[1]).toBeCloseTo(Math.pow(2, bitDepth - 1) - 1);
  expect(result.data[2]).toBeCloseTo(0);
  expect(result.data[3]).toBeCloseTo(-(Math.pow(2, bitDepth - 1) - 1));
  expect(result.data[4]).toBeCloseTo(0);
});
