import type { NoteName } from "./music";

export type ChordQuality =
  | "major" | "minor" | "dim" | "aug"
  | "dom7" | "maj7" | "min7" | "dim7"
  | "sus2" | "sus4";

export interface Chord {
  root: NoteName;
  quality: ChordQuality;
}

export interface ChordSlot {
  chord: Chord;
  beats: number;
}

export interface ChordProgression {
  name: string;
  key: NoteName;
  beatsPerMeasure: number;
  slots: ChordSlot[];
}

export type ChordFunction = "root" | "3rd" | "5th" | "7th" | "9th" | "11th";
