/**
 * Offline Harmony Renderer
 *
 * Processes dry vocal buffer block-by-block (same as live pipeline):
 * 1. Detect pitch per block (YIN)
 * 2. Compute harmony ratios per block (same engine as live)
 * 3. Pitch-shift each block per voice
 * 4. Pan, mix to stereo, apply effects, limit
 *
 * No real-time constraints = no buffer underruns.
 */

import { yinDetectPitch } from "./worklets/yin";

export interface OfflineVoiceConfig {
  volume: number;
  pan: number;
}

export interface OfflineRenderConfig {
  dryVolume: number;
  voices: OfflineVoiceConfig[];
  reverbMix: number;
  delayTime: number;      // seconds
  delayFeedback: number;
  delayMix: number;
  sampleRate: number;
  /** Called per-block: given detected frequency, returns ratio per voice */
  computeRatios: (frequency: number) => number[];
}

const BLOCK_SIZE = 2048;
const CROSSFADE = 64; // samples to crossfade at block boundaries

/**
 * Simple Schroeder reverb (comb filters).
 */
function applyReverb(input: Float32Array, sampleRate: number, mix: number): Float32Array {
  if (mix < 0.01) return new Float32Array(input);
  const delays = [
    { samples: Math.floor(sampleRate * 0.029), decay: 0.7 },
    { samples: Math.floor(sampleRate * 0.037), decay: 0.65 },
    { samples: Math.floor(sampleRate * 0.041), decay: 0.6 },
    { samples: Math.floor(sampleRate * 0.053), decay: 0.55 },
  ];
  const tail = Math.floor(sampleRate * 1.5);
  const wet = new Float32Array(input.length + tail);
  for (const { samples, decay } of delays) {
    const buf = new Float32Array(wet.length);
    for (let i = 0; i < buf.length; i++) {
      const inp = i < input.length ? input[i]! : 0;
      const fb = i >= samples ? (buf[i - samples] ?? 0) * decay : 0;
      buf[i] = inp + fb;
    }
    for (let i = 0; i < wet.length; i++) {
      wet[i] = (wet[i] ?? 0) + (buf[i] ?? 0) / delays.length;
    }
  }
  const result = new Float32Array(wet.length);
  for (let i = 0; i < result.length; i++) {
    const dry = i < input.length ? input[i]! : 0;
    result[i] = dry * (1 - mix) + (wet[i] ?? 0) * mix;
  }
  return result;
}

/**
 * Delay with feedback.
 */
function applyDelay(input: Float32Array, delaySamples: number, feedback: number, mix: number): Float32Array {
  if (mix < 0.01 || delaySamples < 1) return new Float32Array(input);
  const tail = Math.floor(delaySamples * 3);
  const output = new Float32Array(input.length + tail);
  for (let i = 0; i < input.length; i++) output[i] = input[i]!;
  for (let i = Math.floor(delaySamples); i < output.length; i++) {
    output[i] = (output[i] ?? 0) + (output[i - Math.floor(delaySamples)] ?? 0) * feedback;
  }
  const result = new Float32Array(output.length);
  for (let i = 0; i < result.length; i++) {
    const dry = i < input.length ? input[i]! : 0;
    result[i] = dry * (1 - mix) + (output[i] ?? 0) * mix;
  }
  return result;
}

/**
 * Render dry vocal through harmony voices offline, block-by-block.
 */
export function renderOffline(
  dryBuffer: AudioBuffer,
  config: OfflineRenderConfig,
): AudioBuffer {
  const { sampleRate, dryVolume, voices, reverbMix, delayTime, delayFeedback, delayMix, computeRatios } = config;
  const inputMono = dryBuffer.getChannelData(0);
  const length = inputMono.length;
  const numBlocks = Math.ceil(length / BLOCK_SIZE);

  // Per-voice: continuous read pointer + output buffer
  const voiceBuffers: Float32Array[] = voices.map(() => new Float32Array(length));
  const voiceReadPos: number[] = voices.map(() => 0); // continuous, never reset
  const voicePrevRatio: number[] = voices.map(() => 1);

  // Linear interpolation read from input at fractional position
  function readSample(pos: number): number {
    const i = Math.floor(pos);
    const f = pos - i;
    const s0 = i >= 0 && i < length ? inputMono[i]! : 0;
    const s1 = i + 1 >= 0 && i + 1 < length ? inputMono[i + 1]! : s0;
    return s0 + f * (s1 - s0);
  }

  // ── Block-by-block processing ──
  for (let b = 0; b < numBlocks; b++) {
    const blockStart = b * BLOCK_SIZE;
    const blockEnd = Math.min(blockStart + BLOCK_SIZE, length);
    const blockLen = blockEnd - blockStart;

    // Pitch detection
    const block = inputMono.subarray(blockStart, blockEnd);
    const paddedBlock = blockLen < BLOCK_SIZE
      ? (() => { const p = new Float32Array(BLOCK_SIZE); p.set(block); return p; })()
      : block;
    const { frequency, confidence } = yinDetectPitch(paddedBlock, sampleRate);

    if (confidence > 0.7 && frequency > 0) {
      const ratios = computeRatios(frequency);

      for (let v = 0; v < voices.length; v++) {
        const targetRatio = ratios[v] ?? 1;
        const prevRatio = voicePrevRatio[v] ?? 1;

        for (let i = 0; i < blockLen; i++) {
          const outIdx = blockStart + i;

          // Smooth ratio transition within block to avoid clicks
          const t = i / blockLen;
          const ratio = prevRatio + (targetRatio - prevRatio) * t;

          // Advance continuous read pointer
          voiceReadPos[v] = (voiceReadPos[v] ?? 0) + ratio;
          const sample = readSample(voiceReadPos[v] ?? 0);

          // Crossfade at block start to avoid boundary clicks
          if (i < CROSSFADE && b > 0) {
            const fade = i / CROSSFADE;
            voiceBuffers[v]![outIdx] = sample * fade + (voiceBuffers[v]![outIdx] ?? 0) * (1 - fade);
          } else {
            voiceBuffers[v]![outIdx] = sample;
          }
        }

        voicePrevRatio[v] = targetRatio;
      }
    } else {
      // No pitch — fade voices to silence over CROSSFADE samples
      for (let v = 0; v < voices.length; v++) {
        for (let i = 0; i < blockLen; i++) {
          const outIdx = blockStart + i;
          const fade = i < CROSSFADE ? 1 - i / CROSSFADE : 0;
          // Keep advancing read pos to stay in sync
          voiceReadPos[v] = (voiceReadPos[v] ?? 0) + (voicePrevRatio[v] ?? 1);
          const sample = readSample(voiceReadPos[v] ?? 0);
          voiceBuffers[v]![outIdx] = sample * fade;
        }
      }
    }
  }

  // ── Apply effects per voice, mix to stereo ──
  const tailSamples = Math.max(
    delayMix > 0.01 ? Math.floor(delayTime * sampleRate * 3) : 0,
    reverbMix > 0.01 ? Math.floor(sampleRate * 1.5) : 0,
  );
  const outputLength = length + tailSamples;
  const left = new Float32Array(outputLength);
  const right = new Float32Array(outputLength);

  // Dry signal (centered)
  for (let i = 0; i < length; i++) {
    const s = inputMono[i]! * dryVolume;
    left[i] = (left[i] ?? 0) + s;
    right[i] = (right[i] ?? 0) + s;
  }

  // Each voice
  for (let v = 0; v < voices.length; v++) {
    const vc = voices[v]!;
    let processed: Float32Array = voiceBuffers[v]!;

    // Effects
    if (reverbMix > 0.01) processed = applyReverb(processed, sampleRate, reverbMix * 0.4);
    if (delayMix > 0.01) processed = applyDelay(processed, delayTime * sampleRate, delayFeedback, delayMix * 0.4);

    // Constant-power panning
    const panAngle = ((vc.pan + 1) / 2) * (Math.PI / 2);
    const gainL = Math.cos(panAngle) * vc.volume;
    const gainR = Math.sin(panAngle) * vc.volume;

    for (let i = 0; i < processed.length && i < outputLength; i++) {
      left[i] = (left[i] ?? 0) + processed[i]! * gainL;
      right[i] = (right[i] ?? 0) + processed[i]! * gainR;
    }
  }

  // ── Brick-wall limiter ──
  let peak = 0;
  for (let i = 0; i < outputLength; i++) {
    peak = Math.max(peak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
  }
  if (peak > 0.95) {
    const g = 0.95 / peak;
    for (let i = 0; i < outputLength; i++) {
      left[i] = (left[i] ?? 0) * g;
      right[i] = (right[i] ?? 0) * g;
    }
  }

  // ── Trim silence ──
  let endSample = outputLength;
  while (endSample > length && Math.abs(left[endSample - 1] ?? 0) < 0.0001 && Math.abs(right[endSample - 1] ?? 0) < 0.0001) {
    endSample--;
  }
  endSample = Math.min(endSample + Math.floor(sampleRate * 0.05), outputLength);

  // ── Output stereo buffer ──
  const ctx = new OfflineAudioContext(2, endSample, sampleRate);
  const result = ctx.createBuffer(2, endSample, sampleRate);
  result.getChannelData(0).set(left.subarray(0, endSample));
  result.getChannelData(1).set(right.subarray(0, endSample));

  return result;
}
