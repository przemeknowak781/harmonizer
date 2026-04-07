import type { Chord, ChordQuality } from "../types/chords";
import type { NoteName, ModeName } from "../types/music";
import { NOTE_NAMES, SCALE_INTERVALS, SEMITONES_PER_OCTAVE } from "./constants";

const CHORD_INTERVALS: Record<ChordQuality, readonly number[]> = {
  "major":  [0, 4, 7],
  "minor":  [0, 3, 7],
  "dim":    [0, 3, 6],
  "aug":    [0, 4, 8],
  "dom7":   [0, 4, 7, 10],
  "maj7":   [0, 4, 7, 11],
  "min7":   [0, 3, 7, 10],
  "dim7":   [0, 3, 6, 9],
  "sus2":   [0, 2, 7],
  "sus4":   [0, 5, 7],
};

const DIATONIC_QUALITIES: Record<string, readonly ChordQuality[]> = {
  "major":         ["major", "minor", "minor", "major", "major", "minor", "dim"],
  "natural-minor": ["minor", "dim", "major", "minor", "minor", "major", "major"],
  "harmonic-minor":["minor", "dim", "aug", "minor", "major", "major", "dim"],
  "dorian":        ["minor", "minor", "major", "major", "minor", "dim", "major"],
  "mixolydian":    ["major", "minor", "dim", "major", "minor", "minor", "major"],
};

export function getChordTones(chord: Chord): number[] {
  const rootIndex = NOTE_NAMES.indexOf(chord.root);
  const intervals = CHORD_INTERVALS[chord.quality];
  return intervals.map((interval) => (rootIndex + interval) % SEMITONES_PER_OCTAVE);
}

export function getChordMidiNotes(chord: Chord, baseMidi: number): number[] {
  const tones = getChordTones(chord);
  const baseOctave = baseMidi - (baseMidi % 12);
  return tones.map((pc) => {
    let midi = baseOctave + pc;
    if (midi < baseMidi) midi += 12;
    return midi;
  });
}

export function findNearestChordTone(midi: number, chord: Chord): number {
  const tones = getChordTones(chord);
  const pitchClass = ((midi % 12) + 12) % 12;
  const octaveBase = midi - pitchClass;
  let bestDistance = Infinity;
  let bestMidi = midi;
  for (const tone of tones) {
    for (const offset of [-12, 0, 12]) {
      const candidate = octaveBase + tone + offset;
      const distance = Math.abs(candidate - midi);
      if (distance < bestDistance || (distance === bestDistance && candidate > bestMidi)) {
        bestDistance = distance;
        bestMidi = candidate;
      }
    }
  }
  return bestMidi;
}

export function buildDiatonicChord(key: NoteName, mode: ModeName, degree: number): Chord {
  const scaleIntervals = SCALE_INTERVALS[mode];
  const rootSemitone = scaleIntervals[degree % scaleIntervals.length]!;
  const rootIndex = (NOTE_NAMES.indexOf(key) + rootSemitone) % SEMITONES_PER_OCTAVE;
  const root = NOTE_NAMES[rootIndex]!;
  const qualities = DIATONIC_QUALITIES[mode];
  const quality = qualities ? qualities[degree % qualities.length]! : "major";
  return { root, quality };
}
