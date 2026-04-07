import { describe, it, expect } from "vitest";
import { RHYTHM_PATTERNS, getVoiceDelayMs, getArpeggioSequence } from "./rhythm";

describe("RHYTHM_PATTERNS", () => {
  it("has simultaneous pattern", () => {
    const pat = RHYTHM_PATTERNS.find((p) => p.name === "simultaneous");
    expect(pat).toBeDefined();
    expect(pat!.voiceOffsetBeats).toEqual([0, 0, 0, 0]);
  });
  it("has stagger pattern", () => {
    const pat = RHYTHM_PATTERNS.find((p) => p.name === "stagger");
    expect(pat).toBeDefined();
    expect(pat!.voiceOffsetBeats[1]).toBeGreaterThan(0);
  });
  it("has arpeggio-up pattern", () => {
    expect(RHYTHM_PATTERNS.find((p) => p.name === "arpeggio-up")).toBeDefined();
  });
});

describe("getVoiceDelayMs", () => {
  it("simultaneous at 120 BPM = 0ms for all", () => {
    expect(getVoiceDelayMs("simultaneous", 120)).toEqual([0, 0, 0, 0]);
  });
  it("stagger at 120 BPM gives increasing delays", () => {
    const delays = getVoiceDelayMs("stagger", 120);
    expect(delays[0]).toBe(0);
    expect(delays[1]!).toBeGreaterThan(0);
    expect(delays[2]!).toBeGreaterThan(delays[1]!);
  });
  it("arpeggio-up at 60 BPM = 0, 250, 500, 750 ms", () => {
    const delays = getVoiceDelayMs("arpeggio-up", 60);
    expect(delays).toEqual([0, 250, 500, 750]);
  });
});

describe("getArpeggioSequence", () => {
  it("up = ascending", () => {
    expect(getArpeggioSequence("up", [60, 64, 67, 72])).toEqual([60, 64, 67, 72]);
  });
  it("down = descending", () => {
    expect(getArpeggioSequence("down", [60, 64, 67, 72])).toEqual([72, 67, 64, 60]);
  });
  it("up-down pattern", () => {
    expect(getArpeggioSequence("up-down", [60, 64, 67])).toEqual([60, 64, 67, 64]);
  });
  it("random returns same length", () => {
    expect(getArpeggioSequence("random", [60, 64, 67, 72])).toHaveLength(4);
  });
});
