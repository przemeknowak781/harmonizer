/**
 * Geometric (Just Intonation) Chord Harmony
 *
 * Combines chord progression awareness with pure frequency ratios.
 * No MIDI, no 12-TET, no quantization — singer's exact frequency
 * is multiplied by just-intonation ratios for the active chord quality.
 *
 * The singer IS the root. The chord quality defines the geometric shape.
 */

import type { ChordQuality } from "../types/chords";

/** Just intonation ratios for each chord quality (root = 1). */
const JI_RATIOS: Record<ChordQuality, readonly number[]> = {
  major: [1, 5 / 4, 3 / 2],
  minor: [1, 6 / 5, 3 / 2],
  dim: [1, 6 / 5, 36 / 25],
  aug: [1, 5 / 4, 25 / 16],
  dom7: [1, 5 / 4, 3 / 2, 7 / 4], // harmonic 7th (more resonant than 9/5)
  maj7: [1, 5 / 4, 3 / 2, 15 / 8],
  min7: [1, 6 / 5, 3 / 2, 7 / 4],
  dim7: [1, 6 / 5, 36 / 25, 9 / 5],
  sus2: [1, 9 / 8, 3 / 2],
  sus4: [1, 4 / 3, 3 / 2],
};

export interface GeometricVoice {
  targetFrequency: number;
  ratio: number;
}

export interface GeometricHarmonyResult {
  sourceFrequency: number;
  quality: ChordQuality;
  voices: GeometricVoice[];
}

/**
 * Get the just-intonation ratios for a chord quality (excluding root).
 */
export function getJIRatios(quality: ChordQuality): readonly number[] {
  return JI_RATIOS[quality];
}

/**
 * Compute geometric harmony — singer's frequency × JI ratios.
 * Returns only non-root voices (root = singer).
 *
 * @param sourceFrequency - singer's exact frequency (NOT snapped)
 * @param quality - chord quality from the active progression
 * @param voiceCount - how many harmony voices (1–3, picks from ratios excluding root)
 */
export function computeGeometricHarmony(
  sourceFrequency: number,
  quality: ChordQuality,
  voiceCount: number,
): GeometricHarmonyResult {
  const allRatios = JI_RATIOS[quality];
  // Skip index 0 (root = singer), take up to voiceCount
  const harmonyRatios = allRatios.slice(1, 1 + voiceCount);

  const voices: GeometricVoice[] = harmonyRatios.map((ratio) => ({
    targetFrequency: sourceFrequency * ratio,
    ratio,
  }));

  return { sourceFrequency, quality, voices };
}

/**
 * Compare a JI ratio to its 12-TET equivalent.
 * Returns the difference in cents (positive = JI is sharper).
 * Useful for UI display.
 */
export function jiVsTetCents(jiRatio: number, semitones: number): number {
  const tetRatio = Math.pow(2, semitones / 12);
  return 1200 * Math.log2(jiRatio / tetRatio);
}
