export type NoteName = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";

export type ModeName =
  | "major"
  | "natural-minor"
  | "harmonic-minor"
  | "dorian"
  | "mixolydian"
  | "pentatonic";

export type IntervalDirection = "up" | "down";

export type IntervalName =
  | "unison"
  | "2nd"
  | "3rd"
  | "4th"
  | "5th"
  | "6th"
  | "7th"
  | "octave";

export type HarmonyPresetName =
  | "duet-up"
  | "duet-down"
  | "triad"
  | "power";

export interface VoiceConfig {
  interval: IntervalName;
  direction: IntervalDirection;
  detuneCents: number;
  pan: number;
  volume: number;
}

export interface HarmonyPreset {
  name: HarmonyPresetName;
  label: string;
  voices: VoiceConfig[];
}

export interface KeySignature {
  root: NoteName;
  mode: ModeName;
}

export interface PitchDetectionResult {
  frequency: number;
  confidence: number;
  midiNote: number;
  noteName: NoteName;
  octave: number;
  centsOffset: number;
}

export interface HarmonyResult {
  sourceFrequency: number;
  voices: {
    targetFrequency: number;
    ratio: number;
    interval: IntervalName;
    direction: IntervalDirection;
  }[];
}
