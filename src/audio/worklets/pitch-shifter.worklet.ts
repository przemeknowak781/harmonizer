/**
 * Pitch Shifter — AudioWorkletProcessor
 * Receives pitch shift ratio via message port.
 * Linear interpolation resampling — the original working version.
 */

const BUFFER_LENGTH = 8192;

class PitchShifterProcessor extends AudioWorkletProcessor {
  private ratio: number = 1;
  private buffer: Float32Array;
  private writePos: number = 0;
  private readPos: number = 0;

  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_LENGTH);

    this.port.onmessage = (e: MessageEvent) => {
      if (e.data.type === "ratio") {
        this.ratio = e.data.value;
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    // Write input to circular buffer
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writePos % BUFFER_LENGTH] = input[i]!;
      this.writePos++;
    }

    const ratio = this.ratio;

    // Always resample (no ratio=1 bypass). The bypass branch wrote `output =
    // input` with zero buffer-read latency, while the resample branch reads
    // from `readPos` lagging `writePos`. Switching between the two mid-glide
    // (when legato sweeps through unison) produced a phase discontinuity =
    // click on one channel. Resampling at ratio≈1 is numerically the same
    // as the bypass, just with a small consistent latency.
    for (let i = 0; i < output.length; i++) {
      const readIndex = this.readPos + i * ratio;
      const intPart = Math.floor(readIndex) % BUFFER_LENGTH;
      const frac = readIndex - Math.floor(readIndex);
      const idx0 = ((intPart % BUFFER_LENGTH) + BUFFER_LENGTH) % BUFFER_LENGTH;
      const idx1 =
        (((intPart + 1) % BUFFER_LENGTH) + BUFFER_LENGTH) % BUFFER_LENGTH;
      output[i] =
        this.buffer[idx0]! + frac * (this.buffer[idx1]! - this.buffer[idx0]!);
    }

    this.readPos += output.length * ratio;

    return true;
  }
}

registerProcessor("pitch-shifter", PitchShifterProcessor);
