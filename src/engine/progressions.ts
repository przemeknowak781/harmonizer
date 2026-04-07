import type { Chord, ChordProgression, ChordSlot } from "../types/chords";
import type { NoteName, ModeName } from "../types/music";
import { buildDiatonicChord } from "./chords";

export interface ProgressionTemplate {
  name: string;
  degrees: number[];
}

export const COMMON_PROGRESSIONS: ProgressionTemplate[] = [
  { name: "I-IV-V-I",      degrees: [0, 3, 4, 0] },
  { name: "I-V-vi-IV",     degrees: [0, 4, 5, 3] },
  { name: "ii-V-I",        degrees: [1, 4, 0] },
  { name: "I-vi-IV-V",     degrees: [0, 5, 3, 4] },
  { name: "vi-IV-I-V",     degrees: [5, 3, 0, 4] },
  { name: "I-IV-vi-V",     degrees: [0, 3, 5, 4] },
  { name: "i-VI-III-VII",  degrees: [0, 5, 2, 6] },
  { name: "I-V-vi-iii-IV", degrees: [0, 4, 5, 2, 3] },
  { name: "12-bar blues",  degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] },
];

export function buildProgression(
  key: NoteName,
  mode: ModeName,
  degrees: number[],
  beatsPerChord: number,
): ChordProgression {
  const slots: ChordSlot[] = degrees.map((degree) => ({
    chord: buildDiatonicChord(key, mode, degree),
    beats: beatsPerChord,
  }));
  return { name: "Custom", key, beatsPerMeasure: 4, slots };
}

export function getChordAtBeat(progression: ChordProgression, beat: number): Chord {
  const totalBeats = progression.slots.reduce((sum, s) => sum + s.beats, 0);
  const wrappedBeat = ((beat % totalBeats) + totalBeats) % totalBeats;
  let accumulated = 0;
  for (const slot of progression.slots) {
    accumulated += slot.beats;
    if (wrappedBeat < accumulated) return slot.chord;
  }
  return progression.slots[0]!.chord;
}
