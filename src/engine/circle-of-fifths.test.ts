import { describe, it, expect } from "vitest";
import {
  cofRatio,
  octaveReduce,
  computeCofHarmony,
  COF_PRESETS,
} from "./circle-of-fifths";

describe("cofRatio", () => {
  it("+1 step = 3/2 (perfect fifth)", () => {
    expect(cofRatio(1)).toBeCloseTo(1.5, 10);
  });

  it("-1 step = 2/3 (fifth down)", () => {
    expect(cofRatio(-1)).toBeCloseTo(2 / 3, 10);
  });

  it("+2 steps = 9/4", () => {
    expect(cofRatio(2)).toBeCloseTo(9 / 4, 10);
  });

  it("0 steps = 1 (unison)", () => {
    expect(cofRatio(0)).toBe(1);
  });

  it("+4 steps = 81/16", () => {
    expect(cofRatio(4)).toBeCloseTo(81 / 16, 10);
  });

  it("-3 steps = 8/27", () => {
    expect(cofRatio(-3)).toBeCloseTo(8 / 27, 10);
  });
});

describe("octaveReduce", () => {
  it("1.5 stays as 1.5 (already in [1,2))", () => {
    expect(octaveReduce(1.5)).toBeCloseTo(1.5, 10);
  });

  it("9/4 = 2.25 reduces to 9/8 = 1.125", () => {
    expect(octaveReduce(9 / 4)).toBeCloseTo(9 / 8, 10);
  });

  it("2/3 reduces to 4/3", () => {
    expect(octaveReduce(2 / 3)).toBeCloseTo(4 / 3, 10);
  });

  it("81/16 reduces to 81/64", () => {
    expect(octaveReduce(81 / 16)).toBeCloseTo(81 / 64, 10);
  });

  it("8/27 reduces to 32/27", () => {
    expect(octaveReduce(8 / 27)).toBeCloseTo(32 / 27, 10);
  });

  it("1.0 stays as 1.0", () => {
    expect(octaveReduce(1.0)).toBe(1.0);
  });
});

describe("computeCofHarmony", () => {
  it("pure frequency math — no quantization", () => {
    const preset = COF_PRESETS.find((p) => p.name === "pure-fifths")!;
    const result = computeCofHarmony(347.2, preset);

    expect(result.sourceFrequency).toBe(347.2);
    expect(result.voices).toHaveLength(2);
    // Voice 1: +1 step, no octave reduce = 347.2 × 1.5 = 520.8
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(347.2 * 1.5, 5);
    expect(result.voices[0]!.ratio).toBeCloseTo(1.5, 10);
    // Voice 2: -1 step, no octave reduce = 347.2 × 2/3 = 231.467
    expect(result.voices[1]!.targetFrequency).toBeCloseTo(347.2 * (2 / 3), 5);
  });

  it("preserves exact microtuning — does NOT snap to 12-TET", () => {
    const preset = COF_PRESETS.find((p) => p.name === "pure-fifths")!;
    const weirdFreq = 442.37; // not A4=440
    const result = computeCofHarmony(weirdFreq, preset);
    // Should be exactly 442.37 × 1.5, not 659.25 (E5 in 12-TET)
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(442.37 * 1.5, 5);
  });

  it("octave reduction brings into same octave", () => {
    const preset = COF_PRESETS.find((p) => p.name === "pythagorean-triad")!;
    const result = computeCofHarmony(300, preset);
    // Voice 1: +4 steps, octave reduced = 300 × 81/64 = 379.6875
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(300 * (81 / 64), 3);
    // Should be in [300, 600)
    expect(result.voices[0]!.targetFrequency).toBeGreaterThanOrEqual(300);
    expect(result.voices[0]!.targetFrequency).toBeLessThan(600);
  });

  it("stack of fifths produces 3 voices", () => {
    const preset = COF_PRESETS.find((p) => p.name === "fifths-stack")!;
    const result = computeCofHarmony(440, preset);
    expect(result.voices).toHaveLength(3);
  });
});

describe("COF_PRESETS", () => {
  it("has 6 presets", () => {
    expect(COF_PRESETS).toHaveLength(6);
  });

  it("all presets have at least 1 voice", () => {
    for (const preset of COF_PRESETS) {
      expect(preset.voices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all presets have unique names", () => {
    const names = COF_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
