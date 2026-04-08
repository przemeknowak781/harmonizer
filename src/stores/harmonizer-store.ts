import { create } from "zustand";
import type { KeySignature, HarmonyPresetName } from "../types/music";
import type { ChordProgression } from "../types/chords";
import type { LooperState } from "../audio/looper";

// Per-voice state tracked in store
export interface VoiceState {
  active: boolean;
  volume: number;
  pan: number;
  // Circle of Fifths params
  cofSteps: number;
  cofOctaveReduce: boolean;
}

function defaultVoiceStates(): VoiceState[] {
  return [
    { active: true, volume: 0.8, pan: -0.3, cofSteps: 1, cofOctaveReduce: false },
    { active: true, volume: 0.8, pan: 0.3, cofSteps: -1, cofOctaveReduce: false },
    { active: false, volume: 0.7, pan: 0, cofSteps: 2, cofOctaveReduce: true },
    { active: false, volume: 0.6, pan: 0, cofSteps: -2, cofOctaveReduce: true },
  ];
}

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
  voiceStates: VoiceState[];

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
  setVoiceVolume: (index: number, volume: number) => void;
  setVoicePan: (index: number, pan: number) => void;
  setVoiceActive: (index: number, active: boolean) => void;
  setVoiceCofSteps: (index: number, steps: number) => void;
  setVoiceCofOctaveReduce: (index: number, value: boolean) => void;
  addVoice: () => void;
  removeVoice: (index: number) => void;
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
  voiceStates: defaultVoiceStates(),

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
  setVoiceVolume: (index, volume) =>
    set((state) => ({
      voiceStates: state.voiceStates.map((v, i) =>
        i === index ? { ...v, volume: clamp(volume, 0, 1) } : v,
      ),
    })),
  setVoicePan: (index, pan) =>
    set((state) => ({
      voiceStates: state.voiceStates.map((v, i) =>
        i === index ? { ...v, pan: clamp(pan, -1, 1) } : v,
      ),
    })),
  setVoiceActive: (index, active) =>
    set((state) => ({
      voiceStates: state.voiceStates.map((v, i) =>
        i === index ? { ...v, active } : v,
      ),
    })),
  setVoiceCofSteps: (index, cofSteps) =>
    set((state) => ({
      voiceStates: state.voiceStates.map((v, i) =>
        i === index ? { ...v, cofSteps: clamp(cofSteps, -6, 6) } : v,
      ),
    })),
  setVoiceCofOctaveReduce: (index, cofOctaveReduce) =>
    set((state) => ({
      voiceStates: state.voiceStates.map((v, i) =>
        i === index ? { ...v, cofOctaveReduce } : v,
      ),
    })),
  addVoice: () =>
    set((state) => {
      const firstInactive = state.voiceStates.findIndex((v) => !v.active);
      if (firstInactive === -1) return state; // all 4 active
      return {
        voiceStates: state.voiceStates.map((v, i) =>
          i === firstInactive ? { ...v, active: true } : v,
        ),
      };
    }),
  removeVoice: (index) =>
    set((state) => ({
      voiceStates: state.voiceStates.map((v, i) =>
        i === index ? { ...v, active: false } : v,
      ),
    })),
}));
