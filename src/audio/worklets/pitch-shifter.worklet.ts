/**
 * Granular Pitch Shifter — AudioWorkletProcessor
 *
 * Two overlapping grains with Hann crossfade.
 * Each grain reads from a circular input buffer at ratio-adjusted speed.
 * When a grain finishes, it re-anchors near the write head.
 *
 * This eliminates: clicks at boundaries, buzz from stale reads, overflow.
 */

const BUFFER_LENGTH = 16384; // must be power of 2
const BUFFER_MASK = BUFFER_LENGTH - 1;
const GRAIN_SIZE = 1024;

class PitchShifterProcessor extends AudioWorkletProcessor {
  private targetRatio: number = 1;
  private ratio: number = 1;
  private buffer: Float32Array;
  private writePos: number = 0;
  private hannWindow: Float32Array;

  // Two grains, offset by half a grain
  private grainPhase: [number, number] = [0, GRAIN_SIZE / 2];
  private grainReadPos: [number, number] = [0, 0];
  private grainAnchored: [boolean, boolean] = [false, false];

  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_LENGTH);

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

    // Smooth ratio to avoid zipper noise
    this.ratio += (this.targetRatio - this.ratio) * 0.05;
    const ratio = this.ratio;

    // Write input to circular buffer
    for (let i = 0; i < input.length; i++) {
      this.buffer[(this.writePos + i) & BUFFER_MASK] = input[i]!;
    }

    // Passthrough if ratio ≈ 1
    if (Math.abs(ratio - 1) < 0.001) {
      output.set(input);
      this.writePos += input.length;
      return true;
    }

    for (let i = 0; i < output.length; i++) {
      let sample = 0;

      for (let g = 0; g < 2; g++) {
        const phase = this.grainPhase[g];

        // Anchor grain at start: set read position relative to write head
        if (phase === 0 || !this.grainAnchored[g]) {
          // Start reading from GRAIN_SIZE samples behind write head
          this.grainReadPos[g] = this.writePos + i - GRAIN_SIZE;
          this.grainAnchored[g] = true;
        }

        // Read with linear interpolation
        const readPos = this.grainReadPos[g];
        const intPos = Math.floor(readPos);
        const frac = readPos - intPos;
        const s0 = this.buffer[intPos & BUFFER_MASK]!;
        const s1 = this.buffer[(intPos + 1) & BUFFER_MASK]!;
        const interpolated = s0 + frac * (s1 - s0);

        // Window
        const window = this.hannWindow[phase]!;
        sample += interpolated * window;

        // Advance read position at pitch-shifted rate
        this.grainReadPos[g] = readPos + ratio;

        // Advance grain phase
        let nextPhase = phase + 1;
        if (nextPhase >= GRAIN_SIZE) {
          nextPhase = 0;
          this.grainAnchored[g] = false; // re-anchor on next sample
        }
        this.grainPhase[g] = nextPhase;
      }

      output[i] = sample;
    }

    this.writePos += input.length;

    return true;
  }
}

registerProcessor("pitch-shifter", PitchShifterProcessor);
