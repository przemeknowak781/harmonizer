/**
 * YIN pitch detection algorithm.
 * Reference: de Cheveigné & Kawahara (2002).
 * Extracted as pure function for testability.
 */

export interface YinResult {
  frequency: number; // Hz, -1 if no pitch detected
  confidence: number; // 0–1
}

const DEFAULT_THRESHOLD = 0.15;
const MIN_FREQUENCY = 80;
const MAX_FREQUENCY = 1100;

/**
 * Create pre-allocated scratch buffers for YIN to avoid GC pressure
 * on the audio thread. Call once during setup, pass to yinDetectPitch.
 */
export function createYinScratchBuffers(bufferSize: number) {
  const halfSize = Math.floor(bufferSize / 2);
  return {
    diff: new Float32Array(halfSize),
    cmndf: new Float32Array(halfSize),
  };
}

export type YinScratchBuffers = ReturnType<typeof createYinScratchBuffers>;

export function yinDetectPitch(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = DEFAULT_THRESHOLD,
  scratch?: YinScratchBuffers,
): YinResult {
  const halfSize = Math.floor(buffer.length / 2);
  const minPeriod = Math.floor(sampleRate / MAX_FREQUENCY);
  const maxPeriod = Math.floor(sampleRate / MIN_FREQUENCY);

  // Use pre-allocated buffers if provided, otherwise allocate (for tests)
  const diff = scratch?.diff ?? new Float32Array(halfSize);
  const cmndf = scratch?.cmndf ?? new Float32Array(halfSize);

  // Step 1 & 2: Difference function
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i]! - buffer[i + tau]!;
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 3: Cumulative mean normalized difference
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += diff[tau]!;
    cmndf[tau] = (diff[tau]! * tau) / runningSum;
  }

  // Step 4: Absolute threshold
  let tau = minPeriod;
  while (tau < maxPeriod && tau < halfSize) {
    if (cmndf[tau]! < threshold) {
      while (tau + 1 < halfSize && cmndf[tau + 1]! < cmndf[tau]!) {
        tau++;
      }
      break;
    }
    tau++;
  }

  if (tau >= maxPeriod || tau >= halfSize) {
    return { frequency: -1, confidence: 0 };
  }

  // Step 6: Parabolic interpolation
  const s0 = tau > 0 ? cmndf[tau - 1]! : cmndf[tau]!;
  const s1 = cmndf[tau]!;
  const s2 = tau + 1 < halfSize ? cmndf[tau + 1]! : cmndf[tau]!;
  const betterTau = tau + (s0 - s2) / (2 * (s0 - 2 * s1 + s2) || 1);

  const frequency = sampleRate / betterTau;
  const confidence = 1 - s1;

  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return { frequency: -1, confidence: 0 };
  }

  return { frequency, confidence: Math.max(0, Math.min(1, confidence)) };
}
