export interface EffectsChain {
  input: AudioNode;
  output: AudioNode;
  setReverbMix: (wet: number) => void;
  setDelayTime: (ms: number) => void;
  setDelayFeedback: (fb: number) => void;
  setDelayMix: (wet: number) => void;
  getReverbMix: () => number;
  getDelayTime: () => number;
  getDelayFeedback: () => number;
  getDelayMix: () => number;
  destroy: () => void;
}

function createReverbImpulse(
  context: AudioContext,
  durationSec: number,
  decayRate: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = context.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * decayRate));
    }
  }
  return buffer;
}

export function createEffectsChain(context: AudioContext): EffectsChain {
  const input = context.createGain();

  // Reverb
  const convolver = context.createConvolver();
  convolver.buffer = createReverbImpulse(context, 2.5, 0.5);
  const reverbWet = context.createGain();
  reverbWet.gain.value = 0;
  const reverbDry = context.createGain();
  reverbDry.gain.value = 1;

  input.connect(convolver);
  convolver.connect(reverbWet);
  input.connect(reverbDry);

  // Delay
  const delayNode = context.createDelay(2);
  delayNode.delayTime.value = 0.3;
  const delayFeedback = context.createGain();
  delayFeedback.gain.value = 0.3;
  const delayWet = context.createGain();
  delayWet.gain.value = 0;

  reverbWet.connect(delayNode);
  reverbDry.connect(delayNode);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(delayWet);

  // Output
  const output = context.createGain();
  reverbWet.connect(output);
  reverbDry.connect(output);
  delayWet.connect(output);

  return {
    input,
    output,
    setReverbMix(wet: number) {
      reverbWet.gain.value = Math.max(0, Math.min(1, wet));
      reverbDry.gain.value = 1 - reverbWet.gain.value;
    },
    setDelayTime(ms: number) {
      delayNode.delayTime.value = Math.max(0, Math.min(2, ms / 1000));
    },
    setDelayFeedback(fb: number) {
      delayFeedback.gain.value = Math.max(0, Math.min(0.9, fb));
    },
    setDelayMix(wet: number) {
      delayWet.gain.value = Math.max(0, Math.min(1, wet));
    },
    getReverbMix: () => reverbWet.gain.value,
    getDelayTime: () => delayNode.delayTime.value,
    getDelayFeedback: () => delayFeedback.gain.value,
    getDelayMix: () => delayWet.gain.value,
    destroy() {
      input.disconnect();
      convolver.disconnect();
      delayNode.disconnect();
      delayFeedback.disconnect();
      output.disconnect();
    },
  };
}
