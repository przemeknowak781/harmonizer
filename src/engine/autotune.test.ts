import { describe, it, expect } from "vitest";
import { Autotuner } from "./autotune";
import { midiToFrequency } from "./pitch";

const C_MAJOR_PCS = [0, 2, 4, 5, 7, 9, 11];
const A_MINOR_TRIAD_PCS = [9, 0, 4];

describe("Autotuner", () => {
  it("snaps a slightly flat A4 to A4", () => {
    const at = new Autotuner(1, 0, 1);
    const flatA = midiToFrequency(69 - 0.3);
    const r = at.compute(flatA, A_MINOR_TRIAD_PCS, 1);
    expect(r.voices[0]!.targetMidi).toBe(69);
  });

  it("snaps an out-of-scale note to the nearest scale tone", () => {
    const at = new Autotuner(1, 0, 1);
    const fSharp = midiToFrequency(66);
    const r = at.compute(fSharp, C_MAJOR_PCS, 1);
    expect([65, 67]).toContain(r.voices[0]!.targetMidi);
  });

  it("hysteresis keeps the lead locked when the input drifts past the midpoint", () => {
    const at = new Autotuner(1, 40, 1);
    at.compute(midiToFrequency(69), [9, 10], 1);
    const driftedToward10 = midiToFrequency(69.55);
    const r = at.compute(driftedToward10, [9, 10], 1);
    expect(r.leadPc).toBe(9);
  });

  it("hysteresis releases the lead once the input clearly favours the new target", () => {
    const at = new Autotuner(1, 30, 1);
    at.compute(midiToFrequency(69), [9, 10], 1);
    const wellPastMidpoint = midiToFrequency(69.85);
    const r = at.compute(wellPastMidpoint, [9, 10], 1);
    expect(r.leadPc).toBe(10);
  });

  it("median filter rejects single-frame spikes", () => {
    const at = new Autotuner(5, 0, 1);
    const a = midiToFrequency(69);
    for (let i = 0; i < 4; i++) at.compute(a, [9, 10], 1);
    const spike = midiToFrequency(75);
    const r = at.compute(spike, [9, 10], 1);
    expect(r.voices[0]!.targetMidi).toBe(69);
  });

  it("produces upper chord-tone harmonies sorted by distance", () => {
    const at = new Autotuner(1, 0, 1);
    const c4 = midiToFrequency(60);
    const r = at.compute(c4, [0, 4, 7], 3);
    expect(r.voices).toHaveLength(3);
    expect(r.voices[0]!.targetMidi).toBe(60);
    expect(r.voices[1]!.targetMidi).toBeGreaterThan(60);
    expect(r.voices[2]!.targetMidi).toBeGreaterThan(r.voices[1]!.targetMidi);
  });

  it("strength 0 keeps the source pitch (bypass)", () => {
    const at = new Autotuner(1, 0, 0);
    const flat = midiToFrequency(68.4);
    const r = at.compute(flat, [0, 4, 7], 1);
    expect(r.voices[0]!.ratio).toBeCloseTo(1, 5);
  });

  it("reset clears median history and target lock", () => {
    const at = new Autotuner(5, 40, 1);
    at.compute(midiToFrequency(69), [9, 10], 1);
    at.reset();
    const r = at.compute(midiToFrequency(69.7), [9, 10], 1);
    expect(r.leadPc).toBe(10);
  });
});
