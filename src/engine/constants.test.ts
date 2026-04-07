import { describe, it, expect } from "vitest";
import {
  NOTE_NAMES,
  SCALE_INTERVALS,
  INTERVAL_STEPS,
  A4_FREQUENCY,
  A4_MIDI,
} from "./constants";

describe("NOTE_NAMES", () => {
  it("has 12 notes in chromatic order", () => {
    expect(NOTE_NAMES).toHaveLength(12);
    expect(NOTE_NAMES[0]).toBe("C");
    expect(NOTE_NAMES[9]).toBe("A");
  });
});

describe("SCALE_INTERVALS", () => {
  it("major scale has correct semitone pattern (W-W-H-W-W-W-H)", () => {
    expect(SCALE_INTERVALS.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("natural minor has correct semitone pattern (W-H-W-W-H-W-W)", () => {
    expect(SCALE_INTERVALS["natural-minor"]).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it("pentatonic has 5 notes", () => {
    expect(SCALE_INTERVALS.pentatonic).toHaveLength(5);
  });
});

describe("INTERVAL_STEPS", () => {
  it("unison is 0 scale degrees", () => {
    expect(INTERVAL_STEPS.unison).toBe(0);
  });

  it("3rd is 2 scale degrees", () => {
    expect(INTERVAL_STEPS["3rd"]).toBe(2);
  });

  it("5th is 4 scale degrees", () => {
    expect(INTERVAL_STEPS["5th"]).toBe(4);
  });

  it("octave is 7 scale degrees", () => {
    expect(INTERVAL_STEPS.octave).toBe(7);
  });
});

describe("tuning constants", () => {
  it("A4 = 440 Hz", () => {
    expect(A4_FREQUENCY).toBe(440);
  });

  it("A4 MIDI = 69", () => {
    expect(A4_MIDI).toBe(69);
  });
});
