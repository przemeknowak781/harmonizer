export interface RhythmPattern {
  name: string;
  label: string;
  voiceOffsetBeats: number[];
}

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  { name: "simultaneous", label: "Simultaneous", voiceOffsetBeats: [0, 0, 0, 0] },
  { name: "stagger", label: "Stagger", voiceOffsetBeats: [0, 0.125, 0.25, 0.375] },
  { name: "arpeggio-up", label: "Arpeggio ↑", voiceOffsetBeats: [0, 0.25, 0.5, 0.75] },
  { name: "arpeggio-down", label: "Arpeggio ↓", voiceOffsetBeats: [0.75, 0.5, 0.25, 0] },
  { name: "call-response", label: "Call & Response", voiceOffsetBeats: [0, 1, 0, 1] },
  { name: "waltz", label: "Waltz", voiceOffsetBeats: [0, 0.333, 0.667, 1] },
];

export type ArpeggioDirection = "up" | "down" | "up-down" | "random";

export function getVoiceDelayMs(patternName: string, bpm: number): number[] {
  const pattern = RHYTHM_PATTERNS.find((p) => p.name === patternName);
  if (!pattern) return [0, 0, 0, 0];
  const beatMs = 60000 / bpm;
  return pattern.voiceOffsetBeats.map((offset) => Math.round(offset * beatMs));
}

export function getArpeggioSequence(direction: ArpeggioDirection, chordMidi: number[]): number[] {
  const sorted = [...chordMidi].sort((a, b) => a - b);
  switch (direction) {
    case "up": return sorted;
    case "down": return sorted.reverse();
    case "up-down": {
      if (sorted.length <= 1) return sorted;
      return [...sorted, ...sorted.slice(1, -1).reverse()];
    }
    case "random": return sorted.map((_, _i, arr) => arr[Math.floor(Math.random() * arr.length)]!);
  }
}
