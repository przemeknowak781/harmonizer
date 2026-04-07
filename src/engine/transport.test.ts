import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Transport } from "./transport";

describe("Transport", () => {
  let transport: Transport;
  beforeEach(() => { vi.useFakeTimers(); transport = new Transport(); });
  afterEach(() => { transport.stop(); vi.useRealTimers(); });

  it("defaults to 120 BPM, 4/4 time", () => {
    expect(transport.bpm).toBe(120);
    expect(transport.beatsPerMeasure).toBe(4);
  });
  it("setBpm clamps to 30–300", () => {
    transport.setBpm(10); expect(transport.bpm).toBe(30);
    transport.setBpm(500); expect(transport.bpm).toBe(300);
  });
  it("getBeatDuration returns correct ms at 120 BPM", () => {
    expect(transport.getBeatDuration()).toBe(500);
  });
  it("getCurrentBeat returns 0 before start", () => {
    expect(transport.getCurrentBeat()).toBe(0);
  });
  it("calculates beat from elapsed time", () => {
    transport.start();
    vi.advanceTimersByTime(1250);
    expect(transport.getCurrentBeat()).toBeCloseTo(2.5, 1);
  });
  it("fires onBeat callback on each beat", () => {
    const callback = vi.fn();
    transport.onBeat = callback;
    transport.start();
    vi.advanceTimersByTime(2100);
    expect(callback).toHaveBeenCalledTimes(4);
  });
  it("stop resets position", () => {
    transport.start();
    vi.advanceTimersByTime(5000);
    transport.stop();
    expect(transport.getCurrentBeat()).toBe(0);
    expect(transport.isPlaying).toBe(false);
  });
  it("pause preserves position", () => {
    transport.start();
    vi.advanceTimersByTime(1000);
    transport.pause();
    expect(transport.getCurrentBeat()).toBeCloseTo(2, 0);
    expect(transport.isPlaying).toBe(false);
  });
});
