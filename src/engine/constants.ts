import type { NoteName, ModeName, IntervalName } from "../types/music";

export const NOTE_NAMES: readonly NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export const SCALE_INTERVALS: Record<ModeName, readonly number[]> = {
  "major":         [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "harmonic-minor":[0, 2, 3, 5, 7, 8, 11],
  "dorian":        [0, 2, 3, 5, 7, 9, 10],
  "mixolydian":    [0, 2, 4, 5, 7, 9, 10],
  "pentatonic":    [0, 2, 4, 7, 9],
} as const;

export const INTERVAL_STEPS: Record<IntervalName, number> = {
  "unison": 0,
  "2nd": 1,
  "3rd": 2,
  "4th": 3,
  "5th": 4,
  "6th": 5,
  "7th": 6,
  "octave": 7,
} as const;

export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;
export const MIDI_MIN = 0;
export const MIDI_MAX = 127;
export const SEMITONES_PER_OCTAVE = 12;
