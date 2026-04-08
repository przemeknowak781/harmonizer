/**
 * Adaptive Harmony Engine
 *
 * Always sounds good, no configuration needed.
 * Based on psychoacoustic consonance hierarchy (Helmholtz, Plomp-Levelt):
 *
 * 1. Track singer's melody → estimate tonal center
 * 2. Build consonance-ranked interval candidates
 * 3. Pick best combination considering:
 *    - Consonance score (JI ratio simplicity)
 *    - Voice leading (minimize movement from previous frame)
 *    - Spread (voices shouldn't cluster)
 *    - Tonal context (prefer diatonic to estimated key)
 *
 * Music theory foundations:
 * - Consonance = ratio simplicity (3:2 > 5:4 > 6:5 > 7:4...)
 * - Voice leading = minimize semitone distance between frames
 * - Tonal gravity = notes pull toward nearby stable intervals
 */

/**
 * Just Intonation consonance table.
 * Sorted by consonance (most consonant first).
 * Each entry: [ratio, name, consonance_score 0-1]
 */
const CONSONANCE_TABLE = [
  { ratio: 1.0,    name: "P1",  score: 1.0  },  // unison
  { ratio: 2.0,    name: "P8",  score: 0.95 },  // octave
  { ratio: 3 / 2,  name: "P5",  score: 0.9  },  // perfect 5th
  { ratio: 4 / 3,  name: "P4",  score: 0.85 },  // perfect 4th
  { ratio: 5 / 4,  name: "M3",  score: 0.8  },  // major 3rd
  { ratio: 6 / 5,  name: "m3",  score: 0.75 },  // minor 3rd
  { ratio: 5 / 3,  name: "M6",  score: 0.7  },  // major 6th
  { ratio: 8 / 5,  name: "m6",  score: 0.65 },  // minor 6th
  { ratio: 9 / 8,  name: "M2",  score: 0.4  },  // major 2nd
  { ratio: 7 / 4,  name: "H7",  score: 0.5  },  // harmonic 7th
  { ratio: 15 / 8, name: "M7",  score: 0.35 },  // major 7th
  { ratio: 16 / 15,name: "m2",  score: 0.2  },  // minor 2nd (dissonant)
] as const;

/** Octave-reduce a ratio to [0.5, 2) range centered around unison. */
function normalizeRatio(r: number): number {
  while (r >= 2) r /= 2;
  while (r < 0.5) r *= 2;
  return r;
}

/**
 * Estimate tonal center from recent frequencies.
 * Returns the frequency that best fits as a "root" for the recent melody.
 * Uses the harmonic series: if recent notes are harmonics of some fundamental,
 * that fundamental is the tonal center.
 */
function estimateTonalCenter(recentFreqs: number[]): number | null {
  if (recentFreqs.length < 2) return null;

  // Try each recent frequency as a potential root
  let bestRoot = recentFreqs[0]!;
  let bestScore = 0;

  for (const candidateRoot of recentFreqs) {
    // Also try the candidate an octave lower
    for (const root of [candidateRoot, candidateRoot / 2]) {
      let score = 0;
      for (const freq of recentFreqs) {
        const ratio = normalizeRatio(freq / root);
        // Score: how close is this ratio to a simple consonance?
        for (const { ratio: consonantRatio, score: consonance } of CONSONANCE_TABLE) {
          const normalizedConsonant = normalizeRatio(consonantRatio);
          const cents = Math.abs(1200 * Math.log2(ratio / normalizedConsonant));
          if (cents < 30) { // within 30 cents = "matches"
            score += consonance * (1 - cents / 30); // closer = higher score
            break;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestRoot = root;
      }
    }
  }

  return bestScore > 1 ? bestRoot : null; // need decent match
}

export interface AdaptiveVoice {
  ratio: number;
  name: string;
  consonance: number;
}

export interface AdaptiveResult {
  voices: AdaptiveVoice[];
  tonalCenter: number | null;
  mode: "consonant" | "tonal"; // which strategy was used
}

/**
 * Adaptive Harmony Engine
 */
export class AdaptiveHarmony {
  private recentFreqs: number[] = [];
  private readonly maxHistory = 12;
  private readonly minFreqDiff = 8; // Hz — ignore vibrato
  private prevVoices: AdaptiveVoice[] = [];

  /**
   * Compute adaptive harmony for a given frequency.
   * Returns ratio per voice (up to voiceCount).
   */
  compute(frequency: number, voiceCount: number): AdaptiveResult {
    // Track melody
    const last = this.recentFreqs[this.recentFreqs.length - 1];
    if (!last || Math.abs(frequency - last) > this.minFreqDiff) {
      this.recentFreqs.push(frequency);
      if (this.recentFreqs.length > this.maxHistory) {
        this.recentFreqs.shift();
      }
    }

    // Try tonal center approach first
    const center = estimateTonalCenter(this.recentFreqs);

    let candidates: AdaptiveVoice[];

    if (center) {
      // ── Tonal mode: pick intervals relative to tonal center ──
      candidates = this.tonalCandidates(frequency, center);
    } else {
      // ── Consonant mode: pure consonances from current note ──
      candidates = this.consonantCandidates();
    }

    // Pick best combination: top consonance + good spread + voice leading
    const selected = this.selectVoices(candidates, voiceCount);
    this.prevVoices = selected;

    return {
      voices: selected,
      tonalCenter: center,
      mode: center ? "tonal" : "consonant",
    };
  }

  reset(): void {
    this.recentFreqs = [];
    this.prevVoices = [];
  }

  /**
   * Tonal mode: singer's note relative to detected center determines
   * which chord tones to add (I, IV, V triads based on scale degree).
   */
  private tonalCandidates(freq: number, center: number): AdaptiveVoice[] {
    const centerToSinger = normalizeRatio(freq / center);
    const candidates: AdaptiveVoice[] = [];

    // For each consonance, create a harmony voice
    for (const c of CONSONANCE_TABLE) {
      if (c.ratio === 1.0) continue; // skip unison

      // Above
      candidates.push({
        ratio: c.ratio,
        name: `+${c.name}`,
        consonance: c.score,
      });

      // Below (invert)
      if (c.ratio !== 2.0) { // don't invert octave (would be unison)
        const below = 1 / c.ratio;
        const normalized = normalizeRatio(below);
        candidates.push({
          ratio: normalized,
          name: `-${c.name}`,
          consonance: c.score * 0.9, // slightly prefer above
        });
      }
    }

    // Boost consonance for intervals that fit the tonal center
    // If center = C and singer = E, boost G (makes C major triad)
    for (const cand of candidates) {
      const voiceToCenter = normalizeRatio(cand.ratio * centerToSinger);
      // Check if this voice would be consonant with the tonal center
      for (const c of CONSONANCE_TABLE) {
        const nc = normalizeRatio(c.ratio);
        const cents = Math.abs(1200 * Math.log2(voiceToCenter / nc));
        if (cents < 20) {
          cand.consonance += c.score * 0.3; // bonus for fitting tonal center
          break;
        }
      }
    }

    return candidates;
  }

  /**
   * Consonant mode: pure consonances from the current note.
   * Used when tonal center can't be determined.
   * Safest intervals that always sound good.
   */
  private consonantCandidates(): AdaptiveVoice[] {
    const safe: AdaptiveVoice[] = [
      { ratio: 3 / 2, name: "+P5", consonance: 0.95 },
      { ratio: 4 / 3, name: "-P5", consonance: 0.9 },  // P4 above = P5 below
      { ratio: 5 / 4, name: "+M3", consonance: 0.85 },
      { ratio: 6 / 5, name: "+m3", consonance: 0.8 },
      { ratio: 5 / 3, name: "+M6", consonance: 0.75 },
      { ratio: 8 / 5, name: "-M3", consonance: 0.7 },
      { ratio: 2.0,   name: "+P8", consonance: 0.65 },
      { ratio: 0.5,   name: "-P8", consonance: 0.6 },
    ];
    return safe;
  }

  /**
   * Select voiceCount voices from candidates.
   * Criteria: consonance × voice_leading × spread.
   */
  private selectVoices(candidates: AdaptiveVoice[], voiceCount: number): AdaptiveVoice[] {
    // Sort by consonance
    const sorted = [...candidates].sort((a, b) => b.consonance - a.consonance);

    // Greedy selection: pick most consonant, ensure spread
    const selected: AdaptiveVoice[] = [];
    const usedRatios = new Set<number>();

    for (const cand of sorted) {
      if (selected.length >= voiceCount) break;

      // Check spread: don't pick intervals too close to already selected
      const roundedSemitones = Math.round(12 * Math.log2(cand.ratio));
      let tooClose = false;
      for (const used of usedRatios) {
        if (Math.abs(roundedSemitones - used) < 2) { // within 2 semitones
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Voice leading bonus: prefer intervals close to previous frame
      if (this.prevVoices.length > 0) {
        let bestDist = Infinity;
        for (const prev of this.prevVoices) {
          const dist = Math.abs(1200 * Math.log2(cand.ratio / prev.ratio));
          bestDist = Math.min(bestDist, dist);
        }
        // Small penalty for large jumps
        if (bestDist > 300) {
          cand.consonance *= 0.8;
        }
      }

      selected.push(cand);
      usedRatios.add(roundedSemitones);
    }

    return selected;
  }
}
