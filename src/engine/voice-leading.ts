import type { Chord } from "../types/chords";
import { getChordTones } from "./chords";

export class VoiceLeader {
  private voiceCount: number;
  private currentPositions: number[] | null = null;

  constructor(voiceCount: number) {
    this.voiceCount = voiceCount;
  }

  transition(singerMidi: number, chord: Chord): number[] {
    const candidates = this.buildCandidates(singerMidi, chord);

    if (!this.currentPositions) {
      this.currentPositions = this.initialAssignment(singerMidi, candidates);
      return [...this.currentPositions];
    }

    const newPositions = this.minimalMotionAssignment(candidates);
    this.currentPositions = newPositions;
    return [...this.currentPositions];
  }

  reset(): void {
    this.currentPositions = null;
  }

  private buildCandidates(singerMidi: number, chord: Chord): number[] {
    const chordPCs = getChordTones(chord);
    const candidates: number[] = [];
    const baseOctave = singerMidi - (singerMidi % 12);

    for (let octaveOff = -1; octaveOff <= 2; octaveOff++) {
      for (const pc of chordPCs) {
        const midi = baseOctave + pc + octaveOff * 12;
        if (midi >= singerMidi - 7 && midi <= singerMidi + 19) {
          if (midi !== singerMidi) {
            candidates.push(midi);
          }
        }
      }
    }
    return [...new Set(candidates)].sort((a, b) => a - b);
  }

  private initialAssignment(singerMidi: number, candidates: number[]): number[] {
    const above = candidates.filter((m) => m > singerMidi);
    above.sort((a, b) => a - b);
    return above.slice(0, this.voiceCount);
  }

  private minimalMotionAssignment(candidates: number[]): number[] {
    const positions = this.currentPositions!;
    const used = new Set<number>();
    const assignments = new Map<number, number>();

    // Sort voices by difficulty (farthest from any candidate first)
    const voiceOrder = positions
      .map((pos, i) => ({ pos, i }))
      .sort((a, b) => {
        const aDist = Math.min(...candidates.map((c) => Math.abs(c - a.pos)));
        const bDist = Math.min(...candidates.map((c) => Math.abs(c - b.pos)));
        return bDist - aDist;
      });

    for (const { pos, i } of voiceOrder) {
      let bestCandidate = candidates[0]!;
      let bestDist = Infinity;
      for (const c of candidates) {
        if (used.has(c)) continue;
        const dist = Math.abs(c - pos);
        if (dist < bestDist) {
          bestDist = dist;
          bestCandidate = c;
        }
      }
      used.add(bestCandidate);
      assignments.set(i, bestCandidate);
    }

    const result: number[] = [];
    for (let i = 0; i < this.voiceCount; i++) {
      result.push(assignments.get(i) ?? positions[i]!);
    }
    return result;
  }
}
