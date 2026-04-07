import type { HarmonyPreset, HarmonyPresetName } from "../types/music";

export const PRESETS: Record<HarmonyPresetName, HarmonyPreset> = {
  "duet-up": {
    name: "duet-up",
    label: "Duet (3rd \u2191)",
    voices: [
      { interval: "3rd", direction: "up", detuneCents: 0, pan: 0.3, volume: 0.8 },
    ],
  },
  "duet-down": {
    name: "duet-down",
    label: "Duet (3rd \u2193)",
    voices: [
      { interval: "3rd", direction: "down", detuneCents: 0, pan: -0.3, volume: 0.8 },
    ],
  },
  "triad": {
    name: "triad",
    label: "Triad",
    voices: [
      { interval: "3rd", direction: "up", detuneCents: 0, pan: -0.4, volume: 0.75 },
      { interval: "5th", direction: "up", detuneCents: 0, pan: 0.4, volume: 0.7 },
    ],
  },
  "power": {
    name: "power",
    label: "Power",
    voices: [
      { interval: "5th", direction: "up", detuneCents: 0, pan: -0.3, volume: 0.85 },
      { interval: "octave", direction: "up", detuneCents: 0, pan: 0.3, volume: 0.6 },
    ],
  },
};
