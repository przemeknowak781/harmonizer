/**
 * Pitch Shifter — AudioWorkletProcessor
 *
 * Dual-grain overlap-add with Hann crossfade.
 * Two read heads 180° out of phase read from a circular buffer
 * at ratio-adjusted speed, crossfaded with Hann windows to
 * eliminate clicks at grain boundaries.
 *
 * Receives pitch shift ratio via message port.
 */

const BUFFER_LENGTH = 8192;
const GRAIN_SIZE = 2048;
const HALF_GRAIN = GRAIN_SIZE / 2;

class PitchShifterProcessor extends AudioWorkletProcessor {
  private ratio: number = 1;
  private targetRatio: number = 1;
  private buffer: Float32Array;
  private writePos: number = 0;
  private grainPos0: number = 0;         // grain 0 position within grain
  private grainPos1: number = HALF_GRAIN; // grain 1 offset by half (180°)
  private readOffset0: number = 0;       // accumulated read offset for grain 0
  private readOffset1: number = 0;       // accumulated read offset for grain 1
  private hannWindow: Float32Array;

  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_LENGTH);

    // Pre-compute Hann window for one grain
    this.hannWindow = new Float32Array(GRAIN_SIZE);
    for (let i = 0; i < GRAIN_SIZE; i++) {
      this.hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / GRAIN_SIZE));
    }

    this.port.onmessage = (e: MessageEvent) => {
      if (e.data.type === "ratio") {
        this.targetRatio = e.data.value;
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    // Smooth ratio changes to avoid discontinuities
    const ratioAlpha = 0.05;
    this.ratio += (this.targetRatio - this.ratio) * ratioAlpha;

    // Write input to circular buffer
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writePos & (BUFFER_LENGTH - 1)] = input[i]!;
      this.writePos++;
    }

    const ratio = this.ratio;

    if (Math.abs(ratio - 1) < 0.001) {
      output.set(input);
      return true;
    }

    // Read with two overlapping grains
    for (let i = 0; i < output.length; i++) {
      // Grain 0
      const readIdx0 = this.writePos - GRAIN_SIZE + this.readOffset0;
      const idx0 = readIdx0 & (BUFFER_LENGTH - 1);
      const idx0next = (readIdx0 + 1) & (BUFFER_LENGTH - 1);
      const frac0 = this.readOffset0 - Math.floor(this.readOffset0);
      const sample0 = this.buffer[idx0]! + frac0 * (this.buffer[idx0next]! - this.buffer[idx0]!);
      const win0 = this.hannWindow[this.grainPos0]!;

      // Grain 1
      const readIdx1 = this.writePos - GRAIN_SIZE + this.readOffset1;
      const idx1 = readIdx1 & (BUFFER_LENGTH - 1);
      const idx1next = (readIdx1 + 1) & (BUFFER_LENGTH - 1);
      const frac1 = this.readOffset1 - Math.floor(this.readOffset1);
      const sample1 = this.buffer[idx1]! + frac1 * (this.buffer[idx1next]! - this.buffer[idx1]!);
      const win1 = this.hannWindow[this.grainPos1]!;

      // Crossfaded output
      output[i] = sample0 * win0 + sample1 * win1;

      // Advance read positions at ratio speed
      this.readOffset0 += ratio;
      this.readOffset1 += ratio;

      // Advance grain positions
      this.grainPos0++;
      this.grainPos1++;

      // Reset grain 0 when it completes
      if (this.grainPos0 >= GRAIN_SIZE) {
        this.grainPos0 = 0;
        this.readOffset0 = 0;
      }

      // Reset grain 1 when it completes
      if (this.grainPos1 >= GRAIN_SIZE) {
        this.grainPos1 = 0;
        this.readOffset1 = 0;
      }
    }

    return true;
  }
}

registerProcessor("pitch-shifter", PitchShifterProcessor);
