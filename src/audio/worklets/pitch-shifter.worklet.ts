/**
 * Pitch Shifter — AudioWorkletProcessor
 *
 * Continuous resampling with linear interpolation.
 * Single read pointer tracks behind write pointer at ratio-adjusted speed.
 * Read pointer periodically re-syncs to prevent drift.
 * No grains, no windows — clean continuous signal.
 */

const BUFFER_LENGTH = 16384; // power of 2
const BUFFER_MASK = BUFFER_LENGTH - 1;
const SAFE_DISTANCE = BUFFER_LENGTH / 2; // read must stay within this of write

class PitchShifterProcessor extends AudioWorkletProcessor {
  private targetRatio: number = 1;
  private ratio: number = 1;
  private buffer: Float32Array;
  private writePos: number = 0;
  private readPos: number = 0;
  private initialized: boolean = false;

  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_LENGTH);

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

    // Smooth ratio changes (prevents zipper noise)
    this.ratio += (this.targetRatio - this.ratio) * 0.08;
    const ratio = this.ratio;

    // Write input to circular buffer
    for (let i = 0; i < input.length; i++) {
      this.buffer[(this.writePos + i) & BUFFER_MASK] = input[i]!;
    }
    this.writePos += input.length;

    // Initialize read position on first call
    if (!this.initialized) {
      this.readPos = this.writePos - input.length;
      this.initialized = true;
    }

    // Passthrough if ratio ≈ 1
    if (Math.abs(ratio - 1) < 0.001) {
      output.set(input);
      this.readPos = this.writePos - input.length;
      return true;
    }

    // Generate output by reading at ratio-adjusted speed
    for (let i = 0; i < output.length; i++) {
      const intPos = Math.floor(this.readPos);
      const frac = this.readPos - intPos;
      const s0 = this.buffer[intPos & BUFFER_MASK]!;
      const s1 = this.buffer[(intPos + 1) & BUFFER_MASK]!;
      output[i] = s0 + frac * (s1 - s0);
      this.readPos += ratio;
    }

    // Keep read pointer from drifting too far from write pointer
    const distance = this.writePos - this.readPos;
    if (distance > SAFE_DISTANCE || distance < 0) {
      // Gently re-sync: jump to a safe position behind write head
      this.readPos = this.writePos - input.length * 2;
    }

    return true;
  }
}

registerProcessor("pitch-shifter", PitchShifterProcessor);
