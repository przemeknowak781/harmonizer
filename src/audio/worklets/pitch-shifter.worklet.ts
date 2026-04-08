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

    if (Math.abs(ratio - 1) < 0.001) {
      // No shift — passthrough
      output.set(input);
      this.readPos += input.length;
      return true;
    }

    // Read from circular buffer with ratio-adjusted speed
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
