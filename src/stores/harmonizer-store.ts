import { create } from "zustand";
import type { KeySignature, HarmonyPresetName } from "../types/music";

interface HarmonizerState {
  key: KeySignature;
  presetName: HarmonyPresetName;
  masterVolume: number;
  dryVolume: number;
  isListening: boolean;
  currentPitch: number | null;
  currentConfidence: number;

  setKey: (key: KeySignature) => void;
  setPreset: (name: HarmonyPresetName) => void;
  setMasterVolume: (v: number) => void;
  setDryVolume: (v: number) => void;
  setListening: (listening: boolean) => void;
  setPitch: (frequency: number | null, confidence: number) => void;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const useHarmonizerStore = create<HarmonizerState>()((set) => ({
  key: { root: "C", mode: "major" },
  presetName: "triad",
  masterVolume: 0.8,
  dryVolume: 1,
  isListening: false,
  currentPitch: null,
  currentConfidence: 0,

  setKey: (key) => set({ key }),
  setPreset: (presetName) => set({ presetName }),
  setMasterVolume: (v) => set({ masterVolume: clamp(v, 0, 1) }),
  setDryVolume: (v) => set({ dryVolume: clamp(v, 0, 1) }),
  setListening: (isListening) => set({ isListening }),
  setPitch: (frequency, confidence) =>
    set({ currentPitch: frequency, currentConfidence: confidence }),
}));
