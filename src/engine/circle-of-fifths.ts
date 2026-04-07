/**
 * Circle of Fifths Harmony Engine
 *
 * Pure frequency-ratio harmonization using Pythagorean tuning.
 * No MIDI, no note names, no scale quantization.
 * Each voice is defined by steps on the Circle of Fifths:
 *   ratio = (3/2)^steps, optionally octave-reduced.
 */

const FIFTH_RATIO = 3 / 2;

export interface CofVoiceConfig {
  /** Steps on the circle: positive = dominant (×3/2), negative = subdominant (×2/3). */
  steps: number;
  /** If true, fold result into the same octave as source. */
  octaveReduce: boolean;
  /** Volume 0–1. */
  volume: number;
  /** Stereo pan -1 to 1. */
  pan: number;
}

export interface CofPreset {
  name: string;
  label: string;
  voices: CofVoiceConfig[];
}

export interface CofHarmonyResult {
  sourceFrequency: number;
  voices: {
    targetFrequency: number;
    ratio: number;
    steps: number;
  }[];
}

/**
 * Compute the raw frequency ratio for N steps on the Circle of Fifths.
 * Positive = dominant direction (sharps), negative = subdominant (flats).
 */
export function cofRatio(steps: number): number {
  return Math.pow(FIFTH_RATIO, steps);
}

/**
 * Reduce a ratio into the range [1, 2) — same octave as source.
 */
export function octaveReduce(ratio: number): number {
  if (ratio <= 0) return 1;
  while (ratio < 1) ratio *= 2;
  while (ratio >= 2) ratio /= 2;
  return ratio;
}

/**
 * Compute harmony using Circle of Fifths ratios.
 * Pure frequency math — no quantization, no note snapping.
 */
export function computeCofHarmony(
  sourceFrequency: number,
  preset: CofPreset,
): CofHarmonyResult {
  const voices = preset.voices.map((voice) => {
    let ratio = cofRatio(voice.steps);
    if (voice.octaveReduce) {
      ratio = octaveReduce(ratio);
    }
    return {
      targetFrequency: sourceFrequency * ratio,
      ratio,
      steps: voice.steps,
    };
  });

  return { sourceFrequency, voices };
}

/** Built-in Circle of Fifths presets. */
export const COF_PRESETS: CofPreset[] = [
  {
    name: "pure-fifths",
    label: "Pure Fifths",
    voices: [
      { steps: 1, octaveReduce: false, volume: 0.8, pan: -0.3 },
      { steps: -1, octaveReduce: false, volume: 0.8, pan: 0.3 },
    ],
  },
  {
    name: "pythagorean-triad",
    label: "Pythagorean Triad",
    voices: [
      { steps: 4, octaveReduce: true, volume: 0.75, pan: -0.4 }, // Pythagorean major 3rd (81/64)
      { steps: 1, octaveReduce: false, volume: 0.8, pan: 0.4 }, // Perfect 5th (3/2)
    ],
  },
  {
    name: "fifths-stack",
    label: "Stack of Fifths",
    voices: [
      { steps: 1, octaveReduce: false, volume: 0.8, pan: -0.5 },
      { steps: 2, octaveReduce: true, volume: 0.7, pan: 0 },
      { steps: 3, octaveReduce: true, volume: 0.6, pan: 0.5 },
    ],
  },
  {
    name: "subdominant-stack",
    label: "Subdominant Stack",
    voices: [
      { steps: -1, octaveReduce: false, volume: 0.8, pan: -0.5 },
      { steps: -2, octaveReduce: true, volume: 0.7, pan: 0 },
      { steps: -3, octaveReduce: true, volume: 0.6, pan: 0.5 },
    ],
  },
  {
    name: "mirror",
    label: "Mirror",
    voices: [
      { steps: 1, octaveReduce: false, volume: 0.8, pan: -0.4 },
      { steps: -1, octaveReduce: false, volume: 0.8, pan: 0.4 },
      { steps: 2, octaveReduce: true, volume: 0.6, pan: 0 },
    ],
  },
  {
    name: "deep-fifths",
    label: "Deep Fifths",
    voices: [
      { steps: -1, octaveReduce: false, volume: 0.85, pan: 0 }, // P4 below = sub octave feel
      { steps: 1, octaveReduce: false, volume: 0.7, pan: -0.3 },
      { steps: -2, octaveReduce: true, volume: 0.6, pan: 0.3 },
    ],
  },
];
