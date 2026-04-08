import { describe, it, expect } from "vitest";
import {
  computeGeometricHarmony,
  getJIRatios,
  jiVsTetCents,
} from "./geometric-harmony";

describe("getJIRatios", () => {
  it("major = [1, 5/4, 3/2]", () => {
    const ratios = getJIRatios("major");
    expect(ratios[0]).toBe(1);
    expect(ratios[1]).toBeCloseTo(5 / 4, 10);
    expect(ratios[2]).toBeCloseTo(3 / 2, 10);
  });

  it("minor = [1, 6/5, 3/2]", () => {
    const ratios = getJIRatios("minor");
    expect(ratios[1]).toBeCloseTo(6 / 5, 10);
  });

  it("dom7 has 4 ratios including harmonic 7th", () => {
    const ratios = getJIRatios("dom7");
    expect(ratios).toHaveLength(4);
    expect(ratios[3]).toBeCloseTo(7 / 4, 10);
  });

  it("sus4 = [1, 4/3, 3/2]", () => {
    const ratios = getJIRatios("sus4");
    expect(ratios[1]).toBeCloseTo(4 / 3, 10);
  });
});

describe("computeGeometricHarmony", () => {
  it("pure frequency math — no quantization", () => {
    const result = computeGeometricHarmony(347.2, "major", 2);
    expect(result.sourceFrequency).toBe(347.2);
    expect(result.voices).toHaveLength(2);
    // Voice 1: 347.2 × 5/4 = 434.0
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(
      (347.2 * 5) / 4,
      5,
    );
    expect(result.voices[0]!.ratio).toBeCloseTo(5 / 4, 10);
    // Voice 2: 347.2 × 3/2 = 520.8
    expect(result.voices[1]!.targetFrequency).toBeCloseTo(
      (347.2 * 3) / 2,
      5,
    );
  });

  it("preserves microtuning — 442.37 Hz not snapped", () => {
    const result = computeGeometricHarmony(442.37, "major", 2);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(
      (442.37 * 5) / 4,
      5,
    );
    // NOT 440 * 5/4 = 550 (that would be 12-TET snap)
    expect(result.voices[0]!.targetFrequency).not.toBeCloseTo(550, 0);
  });

  it("minor chord gives minor 3rd ratio", () => {
    const result = computeGeometricHarmony(300, "minor", 2);
    expect(result.voices[0]!.ratio).toBeCloseTo(6 / 5, 10);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(360, 5);
  });

  it("dom7 with 3 voices gives 3rd, 5th, harmonic 7th", () => {
    const result = computeGeometricHarmony(200, "dom7", 3);
    expect(result.voices).toHaveLength(3);
    expect(result.voices[0]!.ratio).toBeCloseTo(5 / 4, 10); // 250 Hz
    expect(result.voices[1]!.ratio).toBeCloseTo(3 / 2, 10); // 300 Hz
    expect(result.voices[2]!.ratio).toBeCloseTo(7 / 4, 10); // 350 Hz
  });

  it("voiceCount limits output", () => {
    const result = computeGeometricHarmony(440, "major", 1);
    expect(result.voices).toHaveLength(1);
    expect(result.voices[0]!.ratio).toBeCloseTo(5 / 4, 10);
  });

  it("chord quality comes through in result", () => {
    const result = computeGeometricHarmony(440, "dim", 2);
    expect(result.quality).toBe("dim");
  });
});

describe("jiVsTetCents", () => {
  it("JI major 3rd (5/4) is ~14 cents flat vs 12-TET", () => {
    const diff = jiVsTetCents(5 / 4, 4);
    expect(diff).toBeCloseTo(-13.7, 0);
  });

  it("JI perfect 5th (3/2) is ~2 cents sharp vs 12-TET", () => {
    const diff = jiVsTetCents(3 / 2, 7);
    expect(diff).toBeCloseTo(1.96, 0);
  });

  it("harmonic 7th (7/4) is ~31 cents flat vs 12-TET minor 7th", () => {
    const diff = jiVsTetCents(7 / 4, 10);
    expect(diff).toBeCloseTo(-31.2, 0);
  });
});
