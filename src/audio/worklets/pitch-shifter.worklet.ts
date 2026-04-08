/**
 * Pitch Shifter — AudioWorkletProcessor
 *
 * Continuous resampling with soft drift correction.
 * Read pointer advances at ratio speed. Instead of hard re-sync jumps
 * (which click), a gentle correction term nudges the read speed to
 * maintain target distance from write pointer. Zero discontinuities.
 */

const BUFFER_LENGTH = 16384; // power of 2
const BUFFER_MASK = BUFFER_LENGTH - 1;
const TARGET_DISTANCE = 4096; // ideal samples between read and write
const CORRECTION_FACTOR = 0.0005; // very gentle — no audible pitch wobble

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

    // Smooth ratio changes
    this.ratio += (this.targetRatio - this.ratio) * 0.08;
    const ratio = this.ratio;

    // Write input to circular buffer
    for (let i = 0; i < input.length; i++) {
      this.buffer[(this.writePos + i) & BUFFER_MASK] = input[i]!;
    }
    this.writePos += input.length;

    // Initialize read position
    if (!this.initialized) {
      this.readPos = this.writePos - TARGET_DISTANCE;
      this.initialized = true;
    }

    // Passthrough if ratio ≈ 1
    if (Math.abs(ratio - 1) < 0.001) {
      output.set(input);
      this.readPos = this.writePos - TARGET_DISTANCE;
      return true;
    }

    for (let i = 0; i < output.length; i++) {
      // Linear interpolation read
      const intPos = Math.floor(this.readPos);
      const frac = this.readPos - intPos;
      const s0 = this.buffer[intPos & BUFFER_MASK]!;
      const s1 = this.buffer[(intPos + 1) & BUFFER_MASK]!;
      output[i] = s0 + frac * (s1 - s0);

      // Soft drift correction: nudge read speed to maintain target distance
      const distance = this.writePos - this.readPos;
      const correction = (distance - TARGET_DISTANCE) * CORRECTION_FACTOR;
      this.readPos += ratio + correction;
    }

    return true;
  }
}

registerProcessor("pitch-shifter", PitchShifterProcessor);
