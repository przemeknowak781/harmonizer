import { frequencyToMidi, midiToFrequency } from "./pitch";

export interface AutotuneVoice {
  targetMidi: number;
  targetFrequency: number;
  ratio: number;
}

export interface AutotuneResult {
  sourceFrequency: number;
  sourceMidi: number;
  /** Voice 0 = autotuned lead; voices 1+ = upper target tones. */
  voices: AutotuneVoice[];
  /** Pitch class chosen for the lead (0–11). */
  leadPc: number;
}

const DEFAULT_HISTORY = 5;
const DEFAULT_HYSTERESIS_CENTS = 35;
const DEFAULT_STRENGTH = 1;

/**
 * Autotune snapper with three layers of jitter defence:
 *   1. Median filter over the last N detected pitches (kills single-frame spikes).
 *   2. Hysteresis on the chosen pitch class — a new target must beat the old
 *      one by `hysteresisCents` cents before we switch (kills flip-flop between
 *      two equidistant scale tones, e.g. when the singer holds a note exactly
 *      between A and Bb).
 *   3. `strength` 0..1 blends between the raw and snapped MIDI in MIDI space,
 *      so partial autotune is achievable (1 = hard snap, 0 = bypass).
 *
 * Pipeline still applies portamento on the resulting ratio, so the audible
 * pitch glides toward the snapped target rather than stepping discontinuously.
 */
export class Autotuner {
  private pitchHistory: number[] = [];
  private readonly historySize: number;
  private readonly hysteresisCents: number;
  private strength: number;
  private lastLeadPc: number | null = null;

  constructor(
    historySize: number = DEFAULT_HISTORY,
    hysteresisCents: number = DEFAULT_HYSTERESIS_CENTS,
    strength: number = DEFAULT_STRENGTH,
  ) {
    this.historySize = Math.max(1, historySize);
    this.hysteresisCents = Math.max(0, hysteresisCents);
    this.strength = Math.max(0, Math.min(1, strength));
  }

  reset(): void {
    this.pitchHistory = [];
    this.lastLeadPc = null;
  }

  setStrength(strength: number): void {
    this.strength = Math.max(0, Math.min(1, strength));
  }

  /**
   * Compute autotune.
   * @param sourceFrequency Detected pitch in Hz.
   * @param targets Allowed pitch classes 0–11 (chord tones or scale tones).
   *                Empty array = chromatic (every semitone allowed).
   * @param voiceCount Total voices to fill (≥1). Voice 0 = autotuned lead.
   */
  compute(
    sourceFrequency: number,
    targets: readonly number[],
    voiceCount: number,
  ): AutotuneResult {
    const filteredFreq = this.medianFilter(sourceFrequency);
    const filteredMidi = frequencyToMidi(filteredFreq);
    const sourceMidi = Math.round(frequencyToMidi(sourceFrequency));

    const targetPcs = targets.length > 0 ? targets : ALL_PCS;
    const leadPc = this.pickLeadPc(filteredMidi, targetPcs);

    const snappedMidi = alignToOctave(filteredMidi, leadPc);
    const blendedMidi =
      filteredMidi + (snappedMidi - filteredMidi) * this.strength;
    const leadFreq = midiToFrequency(blendedMidi);

    const voices: AutotuneVoice[] = [
      {
        targetMidi: Math.round(blendedMidi),
        targetFrequency: leadFreq,
        ratio: leadFreq / sourceFrequency,
      },
    ];

    if (voiceCount > 1) {
      const harmonyCount = voiceCount - 1;
      const harmonies = pickHarmonies(snappedMidi, targetPcs, harmonyCount);
      for (const m of harmonies) {
        const f = midiToFrequency(m);
        voices.push({
          targetMidi: m,
          targetFrequency: f,
          ratio: f / sourceFrequency,
        });
      }
    }

    this.lastLeadPc = leadPc;

    return { sourceFrequency, sourceMidi, voices, leadPc };
  }

  private medianFilter(freq: number): number {
    this.pitchHistory.push(freq);
    if (this.pitchHistory.length > this.historySize) {
      this.pitchHistory.shift();
    }
    const sorted = [...this.pitchHistory].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? freq;
  }

  private pickLeadPc(midi: number, targets: readonly number[]): number {
    let bestPc = targets[0]!;
    let bestDist = Infinity;
    for (const pc of targets) {
      const d = pcCentsDistance(midi, pc);
      if (d < bestDist) {
        bestDist = d;
        bestPc = pc;
      }
    }

    if (
      this.lastLeadPc !== null &&
      this.lastLeadPc !== bestPc &&
      targets.includes(this.lastLeadPc)
    ) {
      const lastDist = pcCentsDistance(midi, this.lastLeadPc);
      if (lastDist - bestDist < this.hysteresisCents) {
        return this.lastLeadPc;
      }
    }

    return bestPc;
  }
}

const ALL_PCS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function pcCentsDistance(midi: number, pc: number): number {
  const refRound = Math.round(midi);
  const octBase = refRound - ((refRound % 12) + 12) % 12;
  let best = Infinity;
  for (const off of [-12, 0, 12]) {
    const cand = octBase + pc + off;
    const d = Math.abs(cand - midi) * 100;
    if (d < best) best = d;
  }
  return best;
}

function alignToOctave(referenceMidi: number, pc: number): number {
  const refRound = Math.round(referenceMidi);
  const octBase = refRound - ((refRound % 12) + 12) % 12;
  let cand = octBase + pc;
  if (cand - referenceMidi > 6) cand -= 12;
  if (referenceMidi - cand > 6) cand += 12;
  return cand;
}

function pickHarmonies(
  leadMidi: number,
  targets: readonly number[],
  count: number,
): number[] {
  if (count <= 0 || targets.length === 0) return [];

  const candidates: number[] = [];
  const seen = new Set<number>();
  const leadPc = ((Math.round(leadMidi) % 12) + 12) % 12;

  for (let octOff = 0; octOff <= 2; octOff++) {
    for (const pc of targets) {
      if (pc === leadPc && octOff === 0) continue;
      const m = alignToOctave(leadMidi, pc) + octOff * 12;
      if (m > leadMidi && !seen.has(m)) {
        seen.add(m);
        candidates.push(m);
      }
    }
  }

  candidates.sort((a, b) => a - b);
  return candidates.slice(0, count);
}
