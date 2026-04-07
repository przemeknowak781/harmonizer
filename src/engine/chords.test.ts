import { describe, it, expect } from "vitest";
import { getChordTones, getChordMidiNotes, findNearestChordTone, buildDiatonicChord } from "./chords";

describe("getChordTones", () => {
  it("C major = [0, 4, 7]", () => {
    expect(getChordTones({ root: "C", quality: "major" })).toEqual([0, 4, 7]);
  });
  it("A minor = [9, 0, 4]", () => {
    expect(getChordTones({ root: "A", quality: "minor" })).toEqual([9, 0, 4]);
  });
  it("G dom7 = [7, 11, 2, 5]", () => {
    expect(getChordTones({ root: "G", quality: "dom7" })).toEqual([7, 11, 2, 5]);
  });
  it("D dim = [2, 5, 8]", () => {
    expect(getChordTones({ root: "D", quality: "dim" })).toEqual([2, 5, 8]);
  });
  it("F sus4 = [5, 10, 0]", () => {
    expect(getChordTones({ root: "F", quality: "sus4" })).toEqual([5, 10, 0]);
  });
});

describe("getChordMidiNotes", () => {
  it("C major around MIDI 60 = [60, 64, 67]", () => {
    expect(getChordMidiNotes({ root: "C", quality: "major" }, 60)).toEqual([60, 64, 67]);
  });
  it("C major around MIDI 72 = [72, 76, 79]", () => {
    expect(getChordMidiNotes({ root: "C", quality: "major" }, 72)).toEqual([72, 76, 79]);
  });
  it("A minor around MIDI 57 = [57, 60, 64]", () => {
    expect(getChordMidiNotes({ root: "A", quality: "minor" }, 57)).toEqual([57, 60, 64]);
  });
});

describe("findNearestChordTone", () => {
  it("MIDI 62 (D) snaps to 64 (E) in C major chord", () => {
    expect(findNearestChordTone(62, { root: "C", quality: "major" })).toBe(64);
  });
  it("MIDI 60 (C) stays at 60 in C major chord", () => {
    expect(findNearestChordTone(60, { root: "C", quality: "major" })).toBe(60);
  });
  it("MIDI 66 (F#) snaps to 67 (G) in C major chord", () => {
    expect(findNearestChordTone(66, { root: "C", quality: "major" })).toBe(67);
  });
});

describe("buildDiatonicChord", () => {
  it("I in C major = C major", () => {
    const chord = buildDiatonicChord("C", "major", 0);
    expect(chord.root).toBe("C");
    expect(chord.quality).toBe("major");
  });
  it("ii in C major = D minor", () => {
    const chord = buildDiatonicChord("C", "major", 1);
    expect(chord.root).toBe("D");
    expect(chord.quality).toBe("minor");
  });
  it("V in C major = G major", () => {
    const chord = buildDiatonicChord("C", "major", 4);
    expect(chord.root).toBe("G");
    expect(chord.quality).toBe("major");
  });
  it("vii° in C major = B dim", () => {
    const chord = buildDiatonicChord("C", "major", 6);
    expect(chord.root).toBe("B");
    expect(chord.quality).toBe("dim");
  });
  it("i in A minor = A minor", () => {
    const chord = buildDiatonicChord("A", "natural-minor", 0);
    expect(chord.root).toBe("A");
    expect(chord.quality).toBe("minor");
  });
  it("III in A minor = C major", () => {
    const chord = buildDiatonicChord("A", "natural-minor", 2);
    expect(chord.root).toBe("C");
    expect(chord.quality).toBe("major");
  });
});
