import { describe, it, expect } from "vitest";
import { computeChordHarmony } from "./chord-harmony";
import type { Chord } from "../types/chords";

describe("computeChordHarmony", () => {
  const cMajor: Chord = { root: "C", quality: "major" };
  const fMajor: Chord = { root: "F", quality: "major" };
  const gDom7: Chord = { root: "G", quality: "dom7" };

  it("assigns chord tones for C major chord, 2 voices", () => {
    const result = computeChordHarmony(261.63, cMajor, 2);
    expect(result.voices).toHaveLength(2);
    expect(result.voices[0]!.targetMidi).toBe(64); // E4
    expect(result.voices[1]!.targetMidi).toBe(67); // G4
  });

  it("assigns chord tones for F major chord, 2 voices", () => {
    const result = computeChordHarmony(349.23, fMajor, 2);
    expect(result.voices[0]!.targetMidi).toBe(69); // A4
    expect(result.voices[1]!.targetMidi).toBe(72); // C5
  });

  it("singer on non-root chord tone: E4 over C major", () => {
    const result = computeChordHarmony(329.63, cMajor, 2);
    expect(result.voices[0]!.targetMidi).toBe(67); // G4
    expect(result.voices[1]!.targetMidi).toBe(72); // C5
  });

  it("handles dom7 chord with 3 voices", () => {
    const result = computeChordHarmony(392.0, gDom7, 3);
    expect(result.voices).toHaveLength(3);
    expect(result.voices[0]!.targetMidi).toBe(71); // B4
    expect(result.voices[1]!.targetMidi).toBe(74); // D5
    expect(result.voices[2]!.targetMidi).toBe(77); // F5
  });

  it("voices stay above singer by default", () => {
    const result = computeChordHarmony(261.63, cMajor, 2);
    for (const voice of result.voices) {
      expect(voice.targetMidi).toBeGreaterThanOrEqual(60);
    }
  });

  it("returns ratio for each voice", () => {
    const result = computeChordHarmony(261.63, cMajor, 2);
    for (const voice of result.voices) {
      expect(voice.ratio).toBeCloseTo(voice.targetFrequency / 261.63, 3);
    }
  });
});
