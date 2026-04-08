/**
 * Melody Analyzer — detects chord quality from singer's pitch history.
 *
 * Purely geometric: computes frequency ratios between recent stable pitches,
 * octave-reduces them, and matches to JI chord interval patterns.
 * No MIDI, no scale reference.
 */

import type { ChordQuality } from "../types/chords";

/** JI ratios for each chord quality (including root=1). */
const JI_CHORD_RATIOS: Record<ChordQuality, readonly number[]> = {
  major: [1, 5 / 4, 3 / 2],
  minor: [1, 6 / 5, 3 / 2],
  dim: [1, 6 / 5, 36 / 25],
  aug: [1, 5 / 4, 25 / 16],
  dom7: [1, 5 / 4, 3 / 2, 7 / 4],
  maj7: [1, 5 / 4, 3 / 2, 15 / 8],
  min7: [1, 6 / 5, 3 / 2, 7 / 4],
  dim7: [1, 6 / 5, 36 / 25, 9 / 5],
  sus2: [1, 9 / 8, 3 / 2],
  sus4: [1, 4 / 3, 3 / 2],
};

/** Reduce a ratio to [1, 2) range. */
function octaveReduce(ratio: number): number {
  if (ratio <= 0) return 1;
  while (ratio < 1) ratio *= 2;
  while (ratio >= 2) ratio /= 2;
  return ratio;
}

/** Distance in cents between two ratios. */
function centsDiff(a: number, b: number): number {
  return Math.abs(1200 * Math.log2(a / b));
}

/**
 * MelodyAnalyzer — tracks pitch history and infers chord quality.
 */
export class MelodyAnalyzer {
  private history: number[] = [];
  private readonly maxHistory: number;
  private readonly minStableDiff: number; // min Hz difference to count as new note
  private lastQuality: ChordQuality = "major";

  constructor(maxHistory: number = 8, minStableDiff: number = 5) {
    this.maxHistory = maxHistory;
    this.minStableDiff = minStableDiff;
  }

  /**
   * Feed a new stable pitch. Returns the inferred chord quality.
   * Only records the pitch if it's sufficiently different from the last one.
   */
  addPitch(frequency: number): ChordQuality {
    if (frequency <= 0) return this.lastQuality;

    // Only add if different enough from last recorded pitch
    const last = this.history[this.history.length - 1];
    if (last !== undefined && Math.abs(frequency - last) < this.minStableDiff) {
      return this.lastQuality;
    }

    this.history.push(frequency);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Need at least 2 pitches to analyze
    if (this.history.length < 2) return this.lastQuality;

    this.lastQuality = this.detectQuality();
    return this.lastQuality;
  }

  /** Get the current inferred quality without adding a pitch. */
  getQuality(): ChordQuality {
    return this.lastQuality;
  }

  reset(): void {
    this.history = [];
    this.lastQuality = "major";
  }

  /**
   * Detect chord quality by matching recent melodic intervals
   * against JI chord interval patterns.
   */
  private detectQuality(): ChordQuality {
    // Compute octave-reduced ratios between consecutive pitches
    const ratios: number[] = [];
    for (let i = 1; i < this.history.length; i++) {
      const prev = this.history[i - 1]!;
      const curr = this.history[i]!;
      ratios.push(octaveReduce(curr / prev));
    }

    // Also compute ratios relative to the first pitch (gives broader harmonic picture)
    const first = this.history[0]!;
    const relativeRatios: number[] = [];
    for (let i = 1; i < this.history.length; i++) {
      relativeRatios.push(octaveReduce(this.history[i]! / first));
    }

    const allRatios = [...ratios, ...relativeRatios];

    // Score each chord quality: how well do the melody ratios match its intervals?
    let bestQuality: ChordQuality = "major";
    let bestScore = Infinity;

    const qualities = Object.keys(JI_CHORD_RATIOS) as ChordQuality[];
    for (const quality of qualities) {
      const chordRatios = JI_CHORD_RATIOS[quality];
      let totalDist = 0;

      for (const melodyRatio of allRatios) {
        // Find closest chord interval
        let minDist = Infinity;
        for (const chordRatio of chordRatios) {
          const dist = centsDiff(melodyRatio, chordRatio);
          if (dist < minDist) minDist = dist;
        }
        totalDist += minDist;
      }

      // Normalize by number of ratios
      const score = totalDist / allRatios.length;
      if (score < bestScore) {
        bestScore = score;
        bestQuality = quality;
      }
    }

    return bestQuality;
  }
}
