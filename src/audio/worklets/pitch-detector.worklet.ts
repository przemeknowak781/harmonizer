import { yinDetectPitch } from "./yin";

const BUFFER_SIZE = 2048;

class PitchDetectorProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private writeIndex: number;

  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_SIZE);
    this.writeIndex = 0;
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writeIndex] = input[i]!;
      this.writeIndex++;

      if (this.writeIndex >= BUFFER_SIZE) {
        const result = yinDetectPitch(this.buffer, sampleRate);
        this.port.postMessage({
          type: "pitch",
          frequency: result.frequency,
          confidence: result.confidence,
        });
        // 50% overlap
        this.buffer.copyWithin(0, BUFFER_SIZE / 2);
        this.writeIndex = BUFFER_SIZE / 2;
      }
    }

    return true;
  }
}

registerProcessor("pitch-detector", PitchDetectorProcessor);
