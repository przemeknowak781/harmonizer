import { describe, it, expect } from "vitest";
import {
  frequencyToMidi,
  midiToFrequency,
  midiToNoteName,
  midiToOctave,
  frequencyToCents,
  frequencyToPitchInfo,
} from "./pitch";

describe("midiToFrequency", () => {
  it("A4 (MIDI 69) = 440 Hz", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 2);
  });

  it("C4 (MIDI 60) ≈ 261.63 Hz", () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });

  it("A3 (MIDI 57) = 220 Hz", () => {
    expect(midiToFrequency(57)).toBeCloseTo(220, 2);
  });
});

describe("frequencyToMidi", () => {
  it("440 Hz = MIDI 69", () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 2);
  });

  it("261.63 Hz ≈ MIDI 60", () => {
    expect(frequencyToMidi(261.63)).toBeCloseTo(60, 0);
  });

  it("returns fractional MIDI for detuned notes", () => {
    const midi = frequencyToMidi(445);
    expect(midi).toBeGreaterThan(69);
    expect(midi).toBeLessThan(70);
  });
});

describe("midiToNoteName", () => {
  it("MIDI 60 = C", () => {
    expect(midiToNoteName(60)).toBe("C");
  });

  it("MIDI 69 = A", () => {
    expect(midiToNoteName(69)).toBe("A");
  });

  it("MIDI 61 = C#", () => {
    expect(midiToNoteName(61)).toBe("C#");
  });
});

describe("midiToOctave", () => {
  it("MIDI 60 = octave 4", () => {
    expect(midiToOctave(60)).toBe(4);
  });

  it("MIDI 69 = octave 4", () => {
    expect(midiToOctave(69)).toBe(4);
  });

  it("MIDI 72 = octave 5", () => {
    expect(midiToOctave(72)).toBe(5);
  });
});

describe("frequencyToCents", () => {
  it("exact A4 = 0 cents offset", () => {
    expect(frequencyToCents(440)).toBe(0);
  });

  it("returns positive cents for sharp notes", () => {
    const cents = frequencyToCents(445);
    expect(cents).toBeGreaterThan(0);
    expect(cents).toBeLessThan(50);
  });

  it("returns negative cents for flat notes", () => {
    const cents = frequencyToCents(435);
    expect(cents).toBeLessThan(0);
    expect(cents).toBeGreaterThan(-50);
  });
});

describe("frequencyToPitchInfo", () => {
  it("converts 440 Hz to full pitch info", () => {
    const info = frequencyToPitchInfo(440);
    expect(info.noteName).toBe("A");
    expect(info.octave).toBe(4);
    expect(info.midiNote).toBe(69);
    expect(info.centsOffset).toBe(0);
  });
});
