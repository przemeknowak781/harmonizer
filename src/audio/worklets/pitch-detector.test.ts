import { describe, it, expect } from "vitest";
import { yinDetectPitch } from "./yin";

function generateSineWave(
  frequency: number,
  sampleRate: number,
  length: number,
): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return buffer;
}

describe("yinDetectPitch", () => {
  const sampleRate = 44100;
  const bufferSize = 2048;

  it("detects A4 (440 Hz)", () => {
    const signal = generateSineWave(440, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(440, 0);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("detects C4 (261.63 Hz)", () => {
    const signal = generateSineWave(261.63, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(261.63, 0);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("detects E2 (82.41 Hz) — low range", () => {
    const signal = generateSineWave(82.41, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(82.41, 0);
  });

  it("detects C6 (1046.5 Hz) — high range", () => {
    const signal = generateSineWave(1046.5, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(1046.5, 0);
  });

  it("returns low confidence for silence", () => {
    const signal = new Float32Array(bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("returns low confidence for white noise", () => {
    const signal = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      signal[i] = Math.random() * 2 - 1;
    }
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.confidence).toBeLessThan(0.5);
  });
});
