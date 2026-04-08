/**
 * Offline Harmony Renderer
 *
 * Takes a dry vocal recording and renders it through all harmony voices
 * offline (not real-time). Produces a stereo mixdown with:
 * - Dry signal (centered, at dryVolume)
 * - Each active voice: pitch-shifted + panned + volume-adjusted
 * - Effects (reverb + delay) baked in
 *
 * Uses pure JS pitch shifting (same linear interpolation as worklet)
 * on the full buffer — no real-time constraints, no buffer underruns.
 */

export interface OfflineVoiceConfig {
  ratio: number;     // pitch shift ratio (already includes octaveShift)
  volume: number;    // 0-1
  pan: number;       // -1 to 1
}

export interface OfflineRenderConfig {
  dryVolume: number;
  voices: OfflineVoiceConfig[];
  reverbMix: number;
  delayTime: number;      // seconds
  delayFeedback: number;  // 0-0.9
  delayMix: number;
  sampleRate: number;
}

/**
 * Pitch-shift a mono buffer by a ratio using linear interpolation.
 * Pure JS, no AudioWorklet — processes the entire buffer at once.
 */
function pitchShiftBuffer(
  input: Float32Array,
  ratio: number,
): Float32Array {
  if (Math.abs(ratio - 1) < 0.001) {
    return new Float32Array(input);
  }

  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const readPos = i * ratio;
    const intPos = Math.floor(readPos);
    const frac = readPos - intPos;

    const s0 = intPos < input.length ? input[intPos]! : 0;
    const s1 = intPos + 1 < input.length ? input[intPos + 1]! : s0;
    output[i] = s0 + frac * (s1 - s0);
  }

  return output;
}

/**
 * Apply simple delay with feedback to a buffer.
 */
function applyDelay(
  input: Float32Array,
  delaySamples: number,
  feedback: number,
  mix: number,
): Float32Array {
  if (mix < 0.01 || delaySamples < 1) return new Float32Array(input);

  // Extend buffer to accommodate delay tail
  const tailSamples = Math.floor(delaySamples * 4);
  const output = new Float32Array(input.length + tailSamples);

  // Copy dry
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i]!;
  }

  // Add delay echoes
  for (let i = 0; i < output.length; i++) {
    const delayedIdx = i - delaySamples;
    if (delayedIdx >= 0) {
      const delayedSample = output[Math.floor(delayedIdx)]!;
      output[i] = (output[i] ?? 0) + delayedSample * feedback;
    }
  }

  // Mix: blend original with delayed
  const result = new Float32Array(output.length);
  for (let i = 0; i < result.length; i++) {
    const dry = i < input.length ? input[i]! : 0;
    result[i] = dry * (1 - mix) + (output[i] ?? 0) * mix;
  }

  return result;
}

/**
 * Simple synthetic reverb — multiple delay lines with different lengths.
 * Not convolution quality but fast and effective for offline render.
 */
function applyReverb(
  input: Float32Array,
  sampleRate: number,
  mix: number,
): Float32Array {
  if (mix < 0.01) return new Float32Array(input);

  const delays = [
    { samples: Math.floor(sampleRate * 0.029), decay: 0.7 },
    { samples: Math.floor(sampleRate * 0.037), decay: 0.65 },
    { samples: Math.floor(sampleRate * 0.041), decay: 0.6 },
    { samples: Math.floor(sampleRate * 0.053), decay: 0.55 },
    { samples: Math.floor(sampleRate * 0.067), decay: 0.5 },
    { samples: Math.floor(sampleRate * 0.083), decay: 0.45 },
  ];

  const tailSamples = Math.floor(sampleRate * 2); // 2s reverb tail
  const wet = new Float32Array(input.length + tailSamples);

  // Schroeder reverberator — sum of comb filters
  for (const { samples, decay } of delays) {
    const combBuffer = new Float32Array(wet.length);
    for (let i = 0; i < combBuffer.length; i++) {
      const inputSample = i < input.length ? input[i]! : 0;
      const delayedIdx = i - samples;
      const feedback = delayedIdx >= 0 ? combBuffer[delayedIdx]! * decay : 0;
      combBuffer[i] = inputSample + feedback;
    }
    for (let i = 0; i < wet.length; i++) {
      wet[i] = (wet[i] ?? 0) + combBuffer[i]! / delays.length;
    }
  }

  // Mix dry + wet
  const result = new Float32Array(wet.length);
  for (let i = 0; i < result.length; i++) {
    const dry = i < input.length ? input[i]! : 0;
    result[i] = dry * (1 - mix) + wet[i]! * mix;
  }

  return result;
}

/**
 * Render a dry vocal buffer through all harmony voices offline.
 * Returns a stereo AudioBuffer ready for playback.
 */
export function renderOffline(
  dryBuffer: AudioBuffer,
  config: OfflineRenderConfig,
): AudioBuffer {
  const { sampleRate, dryVolume, voices, reverbMix, delayTime, delayFeedback, delayMix } = config;
  const inputMono = dryBuffer.getChannelData(0);
  const length = inputMono.length;

  // Calculate max output length (delay/reverb add tail)
  const delayTailSamples = delayMix > 0.01 ? Math.floor(delayTime * sampleRate * 4) : 0;
  const reverbTailSamples = reverbMix > 0.01 ? Math.floor(sampleRate * 2) : 0;
  const maxTail = Math.max(delayTailSamples, reverbTailSamples);
  const outputLength = length + maxTail;

  // Stereo output channels
  const left = new Float32Array(outputLength);
  const right = new Float32Array(outputLength);

  // ── Dry signal (centered) ──
  for (let i = 0; i < length; i++) {
    const sample = inputMono[i]! * dryVolume;
    left[i] = (left[i] ?? 0) + sample;
    right[i] = (right[i] ?? 0) + sample;
  }

  // ── Each voice ──
  for (const voice of voices) {
    // 1. Pitch shift
    let shifted = pitchShiftBuffer(inputMono, voice.ratio);

    // 2. Apply effects to this voice
    if (reverbMix > 0.01) {
      shifted = applyReverb(shifted, sampleRate, reverbMix * 0.5); // less reverb per voice
    }
    if (delayMix > 0.01) {
      const delaySamples = delayTime * sampleRate;
      shifted = applyDelay(shifted, delaySamples, delayFeedback, delayMix * 0.5);
    }

    // 3. Pan law: constant power panning
    const panAngle = ((voice.pan + 1) / 2) * (Math.PI / 2);
    const gainL = Math.cos(panAngle) * voice.volume;
    const gainR = Math.sin(panAngle) * voice.volume;

    // 4. Mix into stereo output
    for (let i = 0; i < shifted.length && i < outputLength; i++) {
      left[i] = (left[i] ?? 0) + shifted[i]! * gainL;
      right[i] = (right[i] ?? 0) + shifted[i]! * gainR;
    }
  }

  // ── Master limiter (brick-wall) ──
  let peak = 0;
  for (let i = 0; i < outputLength; i++) {
    peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
  }
  if (peak > 0.95) {
    const gain = 0.95 / peak;
    for (let i = 0; i < outputLength; i++) {
      left[i] = (left[i] ?? 0) * gain;
      right[i] = (right[i] ?? 0) * gain;
    }
  }

  // ── Trim silence from end ──
  let endSample = outputLength;
  while (endSample > length && Math.abs(left[endSample - 1]!) < 0.0001 && Math.abs(right[endSample - 1]!) < 0.0001) {
    endSample--;
  }
  endSample = Math.min(endSample + Math.floor(sampleRate * 0.1), outputLength); // 100ms padding

  // ── Create stereo AudioBuffer ──
  const context = new OfflineAudioContext(2, endSample, sampleRate);
  const result = context.createBuffer(2, endSample, sampleRate);
  result.getChannelData(0).set(left.subarray(0, endSample));
  result.getChannelData(1).set(right.subarray(0, endSample));

  return result;
}
