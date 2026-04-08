import { describe, it, expect } from "vitest";
import { computeHarmony } from "./harmony";
import { PRESETS } from "./presets";

describe("computeHarmony", () => {
  it("duet-up in C major: C4 (261.63Hz) -> E4 (329.63Hz)", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["duet-up"]);
    expect(result.voices).toHaveLength(1);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(329.63, 0);
  });

  it("duet-down in C major: E4 (329.63Hz) -> C4 (261.63Hz)", () => {
    const result = computeHarmony(329.63, "C", "major", PRESETS["duet-down"]);
    expect(result.voices).toHaveLength(1);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(261.63, 0);
  });

  it("triad in C major: C4 -> E4 + G4", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["triad"]);
    expect(result.voices).toHaveLength(2);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(329.63, 0); // E4
    expect(result.voices[1]!.targetFrequency).toBeCloseTo(392.0, 0); // G4
  });

  it("power in C major: C4 -> G4 + C5", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["power"]);
    expect(result.voices).toHaveLength(2);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(392.0, 0); // G4
    expect(result.voices[1]!.targetFrequency).toBeCloseTo(523.25, 0); // C5
  });

  it("ratio is target / source", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["duet-up"]);
    const voice = result.voices[0]!;
    expect(voice.ratio).toBeCloseTo(voice.targetFrequency / 261.63, 4);
  });

  it("works in D major: D4 -> F#4 (duet-up)", () => {
    const d4 = 293.66;
    const result = computeHarmony(d4, "D", "major", PRESETS["duet-up"]);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(369.99, 0); // F#4
  });

  it("works in A minor: A3 -> C4 (duet-up)", () => {
    const a3 = 220;
    const result = computeHarmony(a3, "A", "natural-minor", PRESETS["duet-up"]);
    expect(result.voices[0]!.targetFrequency).toBeCloseTo(261.63, 0); // C4
  });
});

describe("PRESETS", () => {
  it("has 12 presets", () => {
    expect(Object.keys(PRESETS)).toHaveLength(12);
  });

  it("each preset has correct voice count", () => {
    expect(PRESETS["duet-up"].voices).toHaveLength(1);
    expect(PRESETS["duet-down"].voices).toHaveLength(1);
    expect(PRESETS["triad"].voices).toHaveLength(2);
    expect(PRESETS["power"].voices).toHaveLength(2);
  });
});
