import { describe, it, expect } from "vitest";
import { COMMON_PROGRESSIONS, buildProgression, getChordAtBeat } from "./progressions";

describe("COMMON_PROGRESSIONS", () => {
  it("has at least 6 common progressions", () => {
    expect(COMMON_PROGRESSIONS.length).toBeGreaterThanOrEqual(6);
  });
  it("I-IV-V-I exists", () => {
    const prog = COMMON_PROGRESSIONS.find((p) => p.name === "I-IV-V-I");
    expect(prog).toBeDefined();
    expect(prog!.degrees).toEqual([0, 3, 4, 0]);
  });
  it("I-V-vi-IV (pop) exists", () => {
    const prog = COMMON_PROGRESSIONS.find((p) => p.name === "I-V-vi-IV");
    expect(prog).toBeDefined();
  });
});

describe("buildProgression", () => {
  it("builds I-IV-V-I in C major", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    expect(prog.slots).toHaveLength(4);
    expect(prog.slots[0]!.chord.root).toBe("C");
    expect(prog.slots[1]!.chord.root).toBe("F");
    expect(prog.slots[2]!.chord.root).toBe("G");
    expect(prog.slots[3]!.chord.root).toBe("C");
  });
  it("builds i-iv-v-i in A minor", () => {
    const prog = buildProgression("A", "natural-minor", [0, 3, 4, 0], 4);
    expect(prog.slots[0]!.chord).toEqual({ root: "A", quality: "minor" });
    expect(prog.slots[1]!.chord).toEqual({ root: "D", quality: "minor" });
    expect(prog.slots[2]!.chord).toEqual({ root: "E", quality: "minor" });
  });
  it("each slot gets specified beats", () => {
    const prog = buildProgression("C", "major", [0, 4], 4);
    expect(prog.slots[0]!.beats).toBe(4);
    expect(prog.slots[1]!.beats).toBe(4);
  });
});

describe("getChordAtBeat", () => {
  it("returns first chord at beat 0", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    expect(getChordAtBeat(prog, 0).root).toBe("C");
  });
  it("returns second chord at beat 4", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    expect(getChordAtBeat(prog, 4).root).toBe("F");
  });
  it("wraps around at end of progression", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    expect(getChordAtBeat(prog, 16).root).toBe("C");
  });
  it("handles fractional beats", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    expect(getChordAtBeat(prog, 5.5).root).toBe("F");
  });
});
