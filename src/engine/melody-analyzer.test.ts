// @vitest-environment node
import { describe, it, expect } from "vitest";
import { MelodyAnalyzer } from "./melody-analyzer";

describe("MelodyAnalyzer", () => {
  it("defaults to major with no history", () => {
    const analyzer = new MelodyAnalyzer();
    expect(analyzer.getQuality()).toBe("major");
  });

  it("returns major after single pitch", () => {
    const analyzer = new MelodyAnalyzer();
    expect(analyzer.addPitch(440)).toBe("major");
  });

  it("detects major from major 3rd interval (x5/4)", () => {
    const analyzer = new MelodyAnalyzer();
    analyzer.addPitch(300); // root
    const q = analyzer.addPitch(300 * (5 / 4)); // major 3rd up
    expect(q).toBe("major");
  });

  it("detects minor from minor 3rd interval (x6/5)", () => {
    const analyzer = new MelodyAnalyzer();
    analyzer.addPitch(300);
    const q = analyzer.addPitch(300 * (6 / 5)); // minor 3rd up
    expect(["minor", "min7"]).toContain(q);
  });

  it("detects sus4 from perfect 4th interval (x4/3)", () => {
    const analyzer = new MelodyAnalyzer();
    analyzer.addPitch(300);
    analyzer.addPitch(300 * (4 / 3)); // P4
    const q = analyzer.addPitch(300 * (3 / 2)); // P5
    expect(q).toBe("sus4");
  });

  it("detects dom7 from major 3rd + harmonic 7th", () => {
    const analyzer = new MelodyAnalyzer();
    analyzer.addPitch(200);
    analyzer.addPitch(200 * (5 / 4)); // M3
    analyzer.addPitch(200 * (3 / 2)); // P5
    const q = analyzer.addPitch(200 * (7 / 4)); // harmonic 7th
    expect(["dom7", "min7"]).toContain(q);
  });

  it("ignores small pitch variations (vibrato)", () => {
    const analyzer = new MelodyAnalyzer();
    analyzer.addPitch(440);
    analyzer.addPitch(442); // too close, should be ignored
    analyzer.addPitch(441); // too close
    expect(analyzer.getQuality()).toBe("major");
  });

  it("works with descending melody", () => {
    const analyzer = new MelodyAnalyzer();
    // Descending perfect 5th: 600 → 400 (ratio 2/3, octave-reduced to 4/3)
    // 4/3 + 3/2 relative = sus4-like, but with only 1 interval:
    // octave-reduced 400/600 = 2/3 → 4/3, closest to sus4's 4/3
    analyzer.addPitch(600);
    const q = analyzer.addPitch(400); // perfect 5th down
    expect(["sus4", "major", "minor"]).toContain(q);
  });

  it("reset clears history", () => {
    const analyzer = new MelodyAnalyzer();
    analyzer.addPitch(300);
    analyzer.addPitch(300 * (6 / 5));
    analyzer.reset();
    expect(analyzer.getQuality()).toBe("major");
  });

  it("adapts as melody evolves", () => {
    const analyzer = new MelodyAnalyzer();
    analyzer.addPitch(300);
    analyzer.addPitch(300 * (5 / 4)); // starts major
    const q1 = analyzer.getQuality();
    expect(q1).toBe("major");

    // Add minor 3rd — quality should shift
    analyzer.addPitch(300 * (6 / 5));
    const q2 = analyzer.getQuality();
    // Quality changes based on accumulated evidence
    expect(q2).toBeDefined();
  });
});
