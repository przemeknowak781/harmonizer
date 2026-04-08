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
  "choir": {
    name: "choir",
    label: "Choir",
    voices: [
      { interval: "3rd", direction: "up", detuneCents: 5, pan: -0.5, volume: 0.7 },
      { interval: "3rd", direction: "down", detuneCents: -5, pan: 0.5, volume: 0.7 },
      { interval: "5th", direction: "up", detuneCents: 3, pan: -0.2, volume: 0.6 },
      { interval: "octave", direction: "up", detuneCents: -3, pan: 0.2, volume: 0.45 },
    ],
  },
  "barbershop": {
    name: "barbershop",
    label: "Barbershop",
    voices: [
      { interval: "3rd", direction: "up", detuneCents: 0, pan: -0.4, volume: 0.8 },
      { interval: "3rd", direction: "down", detuneCents: 0, pan: 0.4, volume: 0.8 },
      { interval: "5th", direction: "down", detuneCents: 0, pan: 0, volume: 0.75 },
    ],
  },
  "octaves": {
    name: "octaves",
    label: "Octaves",
    voices: [
      { interval: "octave", direction: "up", detuneCents: 0, pan: -0.3, volume: 0.7 },
      { interval: "octave", direction: "down", detuneCents: 0, pan: 0.3, volume: 0.8 },
    ],
  },
  "sixths": {
    name: "sixths",
    label: "Sixths",
    voices: [
      { interval: "6th", direction: "up", detuneCents: 0, pan: -0.3, volume: 0.8 },
      { interval: "6th", direction: "down", detuneCents: 0, pan: 0.3, volume: 0.75 },
    ],
  },
  "open-voicing": {
    name: "open-voicing",
    label: "Open",
    voices: [
      { interval: "5th", direction: "down", detuneCents: 0, pan: -0.4, volume: 0.8 },
      { interval: "3rd", direction: "up", detuneCents: 0, pan: 0, volume: 0.75 },
      { interval: "octave", direction: "up", detuneCents: 0, pan: 0.4, volume: 0.55 },
    ],
  },
  "cluster": {
    name: "cluster",
    label: "Cluster",
    voices: [
      { interval: "2nd", direction: "up", detuneCents: 8, pan: -0.3, volume: 0.7 },
      { interval: "2nd", direction: "down", detuneCents: -8, pan: 0.3, volume: 0.7 },
      { interval: "3rd", direction: "up", detuneCents: 5, pan: 0, volume: 0.6 },
    ],
  },
  "drop-2": {
    name: "drop-2",
    label: "Drop 2",
    voices: [
      { interval: "3rd", direction: "up", detuneCents: 0, pan: -0.3, volume: 0.75 },
      { interval: "7th", direction: "down", detuneCents: 0, pan: 0.3, volume: 0.8 },
      { interval: "5th", direction: "up", detuneCents: 0, pan: 0, volume: 0.7 },
    ],
  },
  "celtic": {
    name: "celtic",
    label: "Celtic",
    voices: [
      { interval: "4th", direction: "up", detuneCents: 0, pan: -0.4, volume: 0.85 },
      { interval: "5th", direction: "up", detuneCents: 0, pan: 0.4, volume: 0.8 },
    ],
  },
};
