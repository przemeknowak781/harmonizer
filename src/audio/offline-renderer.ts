/**
 * Offline Harmony Renderer v3
 *
 * Simple approach that works:
 * 1. Detect pitch per block → get ratio per block
 * 2. Build a per-sample ratio curve (interpolated between blocks)
 * 3. Resample input with variable-rate read (ratio changes smoothly)
 * 4. Mix voices to stereo, apply effects, limit
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
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  sampleRate: number;
  computeRatios: (frequency: number) => number[];
}

const BLOCK_SIZE = 2048;

/**
 * Render dry vocal through harmony voices offline.
 */
export function renderOffline(
  dryBuffer: AudioBuffer,
  config: OfflineRenderConfig,
): AudioBuffer {
  const { sampleRate, dryVolume, voices, reverbMix, delayTime, delayFeedback, delayMix, computeRatios } = config;
  const input = dryBuffer.getChannelData(0);
  const length = input.length;
  const numBlocks = Math.ceil(length / BLOCK_SIZE);
  const numVoices = voices.length;

  // ── Step 1: Detect pitch per block, compute ratios ──
  // ratioMap[block][voice] = ratio for that block
  const ratioMap: number[][] = [];

  for (let b = 0; b < numBlocks; b++) {
    const start = b * BLOCK_SIZE;
    const end = Math.min(start + BLOCK_SIZE, length);
    const block = input.subarray(start, end);

    const padded = block.length < BLOCK_SIZE
      ? (() => { const p = new Float32Array(BLOCK_SIZE); p.set(block); return p; })()
      : block;

    const { frequency, confidence } = yinDetectPitch(padded, sampleRate);

    if (confidence > 0.7 && frequency > 0) {
      ratioMap.push(computeRatios(frequency));
    } else {
      // No pitch — use ratios of 0 (will produce silence)
      ratioMap.push(new Array(numVoices).fill(0) as number[]);
    }
  }

  // ── Step 2: Per voice, resample with smoothly varying ratio ──
  const voiceOutputs: Float32Array[] = [];

  for (let v = 0; v < numVoices; v++) {
    const output = new Float32Array(length);
    let readPos = 0;

    for (let i = 0; i < length; i++) {
      // Which block are we in?
      const blockIdx = Math.floor(i / BLOCK_SIZE);
      const nextBlockIdx = Math.min(blockIdx + 1, numBlocks - 1);

      // Interpolate ratio between current and next block for smooth transition
      const blockProgress = (i % BLOCK_SIZE) / BLOCK_SIZE;
      const r0 = ratioMap[blockIdx]?.[v] ?? 1;
      const r1 = ratioMap[nextBlockIdx]?.[v] ?? r0;
      const ratio = r0 + (r1 - r0) * blockProgress;

      // Ratio of 0 = silence (no pitch detected)
      if (ratio === 0 || Math.abs(ratio) < 0.01) {
        output[i] = 0;
        readPos = i + 1; // keep read pos anchored to avoid drift
        continue;
      }

      // Read from input at readPos with linear interpolation
      const intPos = Math.floor(readPos);
      const frac = readPos - intPos;
      if (intPos >= 0 && intPos < length) {
        const s0 = input[intPos]!;
        const s1 = intPos + 1 < length ? input[intPos + 1]! : s0;
        output[i] = s0 + frac * (s1 - s0);
      }

      readPos += ratio;

      // Soft re-anchor: if read pos drifts too far, gently pull back
      const idealPos = i * ratio;
      const drift = readPos - idealPos;
      if (Math.abs(drift) > BLOCK_SIZE) {
        readPos = idealPos;
      }
    }

    voiceOutputs.push(output);
  }

  // ── Step 3: Mix to stereo ──
  const tailSamples = Math.max(
    delayMix > 0.01 ? Math.floor(delayTime * sampleRate * 3) : 0,
    reverbMix > 0.01 ? Math.floor(sampleRate * 1.5) : 0,
  );
  const outLen = length + tailSamples;
  const left = new Float32Array(outLen);
  const right = new Float32Array(outLen);

  // Dry (centered)
  for (let i = 0; i < length; i++) {
    const s = input[i]! * dryVolume;
    left[i] = s;
    right[i] = s;
  }

  // Voices
  for (let v = 0; v < numVoices; v++) {
    const vc = voices[v]!;
    let buf = voiceOutputs[v]!;

    // Simple reverb (comb filter sum)
    if (reverbMix > 0.01) {
      const reverbDelays = [
        Math.floor(sampleRate * 0.029),
        Math.floor(sampleRate * 0.037),
        Math.floor(sampleRate * 0.043),
        Math.floor(sampleRate * 0.059),
      ];
      const wet = new Float32Array(outLen);
      for (const d of reverbDelays) {
        for (let i = d; i < outLen; i++) {
          const inp = i < buf.length ? (buf[i] ?? 0) : 0;
          wet[i] = (wet[i] ?? 0) + (inp + (wet[i - d] ?? 0) * 0.6) / reverbDelays.length;
        }
      }
      const mixed = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const dry = i < buf.length ? (buf[i] ?? 0) : 0;
        mixed[i] = dry * (1 - reverbMix * 0.4) + (wet[i] ?? 0) * reverbMix * 0.4;
      }
      buf = mixed;
    }

    // Simple delay
    if (delayMix > 0.01 && delayTime > 0) {
      const delaySamples = Math.floor(delayTime * sampleRate);
      const delayed = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const inp = i < buf.length ? (buf[i] ?? 0) : 0;
        const fb = i >= delaySamples ? (delayed[i - delaySamples] ?? 0) * delayFeedback : 0;
        delayed[i] = inp + fb;
      }
      const mixed = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        mixed[i] = (buf[i] ?? 0) * (1 - delayMix * 0.4) + (delayed[i] ?? 0) * delayMix * 0.4;
      }
      buf = mixed;
    }

    // Pan (constant power)
    const panAngle = ((vc.pan + 1) / 2) * (Math.PI / 2);
    const gainL = Math.cos(panAngle) * vc.volume;
    const gainR = Math.sin(panAngle) * vc.volume;

    for (let i = 0; i < outLen; i++) {
      const s = i < buf.length ? (buf[i] ?? 0) : 0;
      left[i] = (left[i] ?? 0) + s * gainL;
      right[i] = (right[i] ?? 0) + s * gainR;
    }
  }

  // ── Step 4: Brick-wall limiter ──
  let peak = 0;
  for (let i = 0; i < outLen; i++) {
    peak = Math.max(peak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
  }
  if (peak > 0.9) {
    const g = 0.9 / peak;
    for (let i = 0; i < outLen; i++) {
      left[i] = (left[i] ?? 0) * g;
      right[i] = (right[i] ?? 0) * g;
    }
  }

  // ── Trim tail ──
  let end = outLen;
  while (end > length && Math.abs(left[end - 1] ?? 0) < 0.0001 && Math.abs(right[end - 1] ?? 0) < 0.0001) {
    end--;
  }
  end = Math.min(end + Math.floor(sampleRate * 0.05), outLen);

  // ── Output ──
  const ctx = new OfflineAudioContext(2, end, sampleRate);
  const result = ctx.createBuffer(2, end, sampleRate);
  result.getChannelData(0).set(left.subarray(0, end));
  result.getChannelData(1).set(right.subarray(0, end));

  return result;
}
