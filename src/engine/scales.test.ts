import { describe, it, expect } from "vitest";
import { getScaleNotes, snapToScale, getScaleDegree } from "./scales";

describe("getScaleNotes", () => {
  it("C major = C D E F G A B", () => {
    expect(getScaleNotes("C", "major")).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("D major = D E F# G A B C#", () => {
    expect(getScaleNotes("D", "major")).toEqual([2, 4, 6, 7, 9, 11, 1]);
  });

  it("A natural minor = A B C D E F G", () => {
    expect(getScaleNotes("A", "natural-minor")).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it("C pentatonic has 5 notes", () => {
    expect(getScaleNotes("C", "pentatonic")).toHaveLength(5);
  });
});

describe("snapToScale", () => {
  it("snaps MIDI 61 (C#) to C in C major", () => {
    expect(snapToScale(61, "C", "major")).toBe(60);
  });

  it("keeps MIDI 61 (C#) in D major (C# is 7th degree)", () => {
    expect(snapToScale(61, "D", "major")).toBe(61);
  });

  it("keeps MIDI 60 (C) unchanged in C major", () => {
    expect(snapToScale(60, "C", "major")).toBe(60);
  });

  it("handles notes near octave boundary", () => {
    const result = snapToScale(71, "C", "major");
    expect(result).toBe(71); // B is in C major
  });
});

describe("getScaleDegree", () => {
  it("C is degree 0 in C major", () => {
    expect(getScaleDegree(60, "C", "major")).toBe(0);
  });

  it("E is degree 2 in C major", () => {
    expect(getScaleDegree(64, "C", "major")).toBe(2);
  });

  it("G is degree 4 in C major", () => {
    expect(getScaleDegree(67, "C", "major")).toBe(4);
  });
});
