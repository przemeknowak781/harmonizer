import { create } from "zustand";
import type { KeySignature, HarmonyPresetName } from "../types/music";
import type { ChordProgression } from "../types/chords";
import type { LooperState } from "../audio/looper";

interface HarmonizerState {
  key: KeySignature;
  presetName: HarmonyPresetName;
  masterVolume: number;
  dryVolume: number;
  isListening: boolean;
  currentPitch: number | null;
  currentConfidence: number;
  harmonyMode: "interval" | "chord" | "fifths" | "geometric";
  cofPresetName: string;
  rhythmPattern: string;
  reverbMix: number;
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  looperState: LooperState;
  bpm: number;
  isTransportPlaying: boolean;
  currentBeat: number;
  activeProgression: ChordProgression | null;

  setKey: (key: KeySignature) => void;
  setPreset: (name: HarmonyPresetName) => void;
  setMasterVolume: (v: number) => void;
  setDryVolume: (v: number) => void;
  setListening: (listening: boolean) => void;
  setPitch: (frequency: number | null, confidence: number) => void;
  setHarmonyMode: (mode: "interval" | "chord" | "fifths" | "geometric") => void;
  setCofPreset: (name: string) => void;
  setRhythmPattern: (pattern: string) => void;
  setReverbMix: (v: number) => void;
  setDelayTime: (v: number) => void;
  setDelayFeedback: (v: number) => void;
  setDelayMix: (v: number) => void;
  setLooperState: (state: LooperState) => void;
  setBpm: (bpm: number) => void;
  setTransportPlaying: (playing: boolean) => void;
  setCurrentBeat: (beat: number) => void;
  setActiveProgression: (prog: ChordProgression | null) => void;
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
  harmonyMode: "chord",
  cofPresetName: "pure-fifths",
  rhythmPattern: "simultaneous",
  reverbMix: 0,
  delayTime: 300,
  delayFeedback: 0.3,
  delayMix: 0,
  looperState: "empty",
  bpm: 120,
  isTransportPlaying: false,
  currentBeat: 0,
  activeProgression: null,

  setKey: (key) => set({ key }),
  setPreset: (presetName) => set({ presetName }),
  setMasterVolume: (v) => set({ masterVolume: clamp(v, 0, 1) }),
  setDryVolume: (v) => set({ dryVolume: clamp(v, 0, 1) }),
  setListening: (isListening) => set({ isListening }),
  setPitch: (frequency, confidence) =>
    set({ currentPitch: frequency, currentConfidence: confidence }),
  setHarmonyMode: (harmonyMode) => set({ harmonyMode }),
  setCofPreset: (cofPresetName) => set({ cofPresetName }),
  setRhythmPattern: (rhythmPattern) => set({ rhythmPattern }),
  setReverbMix: (reverbMix) => set({ reverbMix: clamp(reverbMix, 0, 1) }),
  setDelayTime: (delayTime) => set({ delayTime: clamp(delayTime, 0, 2000) }),
  setDelayFeedback: (delayFeedback) =>
    set({ delayFeedback: clamp(delayFeedback, 0, 0.9) }),
  setDelayMix: (delayMix) => set({ delayMix: clamp(delayMix, 0, 1) }),
  setLooperState: (looperState) => set({ looperState }),
  setBpm: (bpm) => set({ bpm: clamp(bpm, 30, 300) }),
  setTransportPlaying: (isTransportPlaying) => set({ isTransportPlaying }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setActiveProgression: (activeProgression) => set({ activeProgression }),
}));
