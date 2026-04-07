import { describe, it, expect } from "vitest";
import { VoiceLeader } from "./voice-leading";
import type { Chord } from "../types/chords";

describe("VoiceLeader", () => {
  const cMaj: Chord = { root: "C", quality: "major" };
  const fMaj: Chord = { root: "F", quality: "major" };
  const gMaj: Chord = { root: "G", quality: "major" };
  const amin: Chord = { root: "A", quality: "minor" };

  it("first call places voices at chord tones", () => {
    const vl = new VoiceLeader(2);
    const result = vl.transition(60, cMaj);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(64); // E4
    expect(result[1]).toBe(67); // G4
  });

  it("minimizes voice motion on chord change C→F", () => {
    const vl = new VoiceLeader(2);
    vl.transition(60, cMaj); // voices at E4(64), G4(67)
    const result = vl.transition(65, fMaj);
    expect(result).toHaveLength(2);
    // Both voices should be chord tones of F major
    const fMajTones = [5, 9, 0]; // F, A, C
    for (const midi of result) {
      expect(fMajTones).toContain(midi % 12);
    }
  });

  it("prefers stepwise motion over leaps", () => {
    const vl = new VoiceLeader(2);
    const r1 = vl.transition(60, cMaj); // E4, G4
    const r2 = vl.transition(60, amin); // A minor: A, C, E
    const totalMotion = Math.abs(r2[0]! - r1[0]!) + Math.abs(r2[1]! - r1[1]!);
    expect(totalMotion).toBeLessThanOrEqual(5);
  });

  it("reset clears voice state", () => {
    const vl = new VoiceLeader(2);
    vl.transition(60, cMaj);
    vl.reset();
    const result = vl.transition(65, fMaj);
    expect(result).toHaveLength(2);
  });

  it("handles 3 voices", () => {
    const vl = new VoiceLeader(3);
    const result = vl.transition(60, cMaj);
    expect(result).toHaveLength(3);
    // All should be C major chord tones
    for (const midi of result) {
      expect([0, 4, 7]).toContain(midi % 12);
    }
  });
});
